import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as workspaceService from "@/lib/domain/workspace.service";
import { inviteMemberSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);
  const res = await workspaceService.listMembers(auth.data);
  return handleResult(res);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success || !parsed.data.userId) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "User ID is required to add member", details: parsed.error?.format() },
    });
  }

  const res = await workspaceService.inviteMember(auth.data, {
    userId: parsed.data.userId,
    role: parsed.data.role as "admin" | "member" | "viewer",
  });
  return handleResult(res, 201);
}
