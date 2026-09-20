import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as milestoneService from "@/lib/domain/milestone.service";
import { createMilestoneSchema } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id: projectId } = await params;
  const res = await milestoneService.listMilestones(auth.data, projectId);
  return handleResult(res);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id: projectId } = await params;
  const body = await req.json();
  const parsed = createMilestoneSchema.safeParse({ ...body, projectId });
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid milestone input", details: parsed.error.format() },
    });
  }

  const res = await milestoneService.createMilestone(auth.data, parsed.data);
  return handleResult(res, 201);
}
