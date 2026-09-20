import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as workstreamService from "@/lib/domain/workstream.service";
import { updateWorkstreamSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const body = await req.json();
  const parsed = updateWorkstreamSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.format() },
    });
  }

  const res = await workstreamService.updateWorkstream(auth.data, id, parsed.data);
  return handleResult(res);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const res = await workstreamService.deleteWorkstream(auth.data, id);
  return handleResult(res);
}
