import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as apiKeyService from "@/lib/domain/api-key.service";
import { createApiKeySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const res = await apiKeyService.listApiKeys(auth.data);
  return handleResult(res);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid API key name", details: parsed.error.format() },
    });
  }

  const res = await apiKeyService.createApiKey(auth.data, parsed.data);
  return handleResult(res, 201);
}
