import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as taskService from "@/lib/domain/task.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const body = await req.json();
  if (!body.userId) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "userId is required to assign task" },
    });
  }

  const res = await taskService.assignTask(auth.data, id, body.userId);
  return handleResult(res);
}
