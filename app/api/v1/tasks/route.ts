import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as taskService from "@/lib/domain/task.service";
import { createTaskSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { searchParams } = new URL(req.url);
  const isToday = searchParams.get("today") === "true";
  const isMyWork = searchParams.get("mywork") === "true";

  if (isToday) {
    const todayRes = await taskService.getTodayView(auth.data);
    return handleResult(todayRes);
  }

  if (isMyWork) {
    const userId = searchParams.get("userId") || undefined;
    const myWorkRes = await taskService.getMyWork(auth.data, userId);
    return handleResult(myWorkRes);
  }

  const projectId = searchParams.get("projectId") || undefined;
  const status = searchParams.get("status") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const workstreamId = searchParams.get("workstreamId") || undefined;
  const milestoneId = searchParams.get("milestoneId") || undefined;

  const res = await taskService.listTasks(auth.data, {
    projectId,
    status,
    priority,
    workstreamId,
    milestoneId,
  });
  return handleResult(res);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid task input", details: parsed.error.format() },
    });
  }

  const res = await taskService.createTask(auth.data, parsed.data);
  return handleResult(res, 201);
}
