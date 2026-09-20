import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as apiKeyService from "@/lib/domain/api-key.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  const res = await apiKeyService.revokeApiKey(auth.data, id);
  return handleResult(res);
}
