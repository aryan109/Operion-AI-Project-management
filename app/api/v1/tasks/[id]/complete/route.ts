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
  const res = await taskService.completeTask(auth.data, id);
  return handleResult(res);
}
