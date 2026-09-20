import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as commentService from "@/lib/domain/comment.service";
import { createCommentSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as "project" | "task" | "milestone";
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "entityType and entityId are required" },
    });
  }

  const res = await commentService.listComments(auth.data, entityType, entityId);
  return handleResult(res);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid comment input", details: parsed.error.format() },
    });
  }

  const res = await commentService.addComment(auth.data, parsed.data);
  return handleResult(res, 201);
}
