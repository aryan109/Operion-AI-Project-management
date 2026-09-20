import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as milestoneService from "@/lib/domain/milestone.service";
import { updateMilestoneSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const body = await req.json();
  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.format() },
    });
  }

  const res = await milestoneService.updateMilestone(auth.data, id, parsed.data);
  return handleResult(res);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const res = await milestoneService.deleteMilestone(auth.data, id);
  return handleResult(res);
}
