import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as workspaceService from "@/lib/domain/workspace.service";
import { updateOrganizationSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);
  const res = await workspaceService.getOrganization(auth.data);
  return handleResult(res);
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload", details: parsed.error.format() } });
  }

  const res = await workspaceService.updateOrganization(auth.data, parsed.data);
  return handleResult(res);
}
