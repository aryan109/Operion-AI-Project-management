import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as dependencyService from "@/lib/domain/dependency.service";
import { createDependencySchema } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id: taskId } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode"); // 'blocked' or 'blockers'

  if (mode === "blocked") {
    const res = await dependencyService.getBlockedTasks(auth.data, taskId);
    return handleResult(res);
  }

  const res = await dependencyService.getBlockers(auth.data, taskId);
  return handleResult(res);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id: blockedTaskId } = await params;
  const body = await req.json();
  const parsed = createDependencySchema.safeParse({
    blockingTaskId: body.blockingTaskId,
    blockedTaskId,
  });

  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid dependency input", details: parsed.error.format() },
    });
  }

  const res = await dependencyService.createDependency(auth.data, parsed.data);
  return handleResult(res, 201);
}
