import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as taskService from "@/lib/domain/task.service";
import { updateTaskSchema } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const res = await taskService.getTask(auth.data, id);
  return handleResult(res);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid task update", details: parsed.error.format() },
    });
  }

  const res = await taskService.updateTask(auth.data, id, parsed.data);
  return handleResult(res);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const res = await taskService.deleteTask(auth.data, id);
  return handleResult(res);
}
