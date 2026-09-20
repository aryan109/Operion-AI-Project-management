import { NextRequest, NextResponse } from "next/server";
import { Context, Result } from "../domain/context";
import * as apiKeyService from "../domain/api-key.service";
import { db } from "../db/client";
import { organizations } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export async function authenticateRequest(
  req: NextRequest
): Promise<Result<Context>> {
  const authHeader = req.headers.get("authorization");
  const orgHeader = req.headers.get("x-organization-id");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const key = authHeader.replace("Bearer ", "").trim();
    const keyRes = await apiKeyService.validateApiKey(key);
    if (!keyRes.ok) {
      return {
        ok: false,
        error: { code: "UNAUTHORIZED", message: "Invalid or revoked API key" },
      };
    }
    return {
      ok: true,
      data: {
        organizationId: keyRes.data.organizationId,
        actor: {
          type: "agent",
          id: `api-key-${keyRes.data.organizationId.slice(0, 8)}`,
          role: "admin",
          permissions: keyRes.data.scopes,
        },
      },
    };
  }

  // Fallback: If organization header is provided or default org exists in development
  if (orgHeader) {
    return {
      ok: true,
      data: {
        organizationId: orgHeader,
        actor: {
          type: "user",
          id: "a0000000-0000-0000-0000-000000000001",
          role: "owner",
        },
      },
    };
  }

  const defaultCtx = await getDefaultContext();
  return { ok: true, data: defaultCtx };
}

let cachedDefaultContext: { context: Context; expiresAt: number } | null = null;
const CONTEXT_CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

export async function getDefaultContext(): Promise<Context> {
  const now = Date.now();
  if (cachedDefaultContext && now < cachedDefaultContext.expiresAt) {
    return cachedDefaultContext.context;
  }

  // First, check for the flagship Operion organization
  const [operionOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "operion"))
    .limit(1);

  if (operionOrg) {
    const ctx: Context = {
      organizationId: operionOrg.id,
      actor: {
        type: "user",
        id: "a0000000-0000-0000-0000-000000000001",
        role: "owner",
      },
    };
    cachedDefaultContext = { context: ctx, expiresAt: now + CONTEXT_CACHE_TTL_MS };
    return ctx;
  }

  const [defaultOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(1);

  const fallbackCtx: Context = {
    organizationId: defaultOrg?.id || "00000000-0000-0000-0000-000000000001",
    actor: {
      type: "user",
      id: "a0000000-0000-0000-0000-000000000001",
      role: "owner",
    },
  };
  cachedDefaultContext = { context: fallbackCtx, expiresAt: now + CONTEXT_CACHE_TTL_MS };
  return fallbackCtx;
}

export function handleResult<T>(result: Result<T>, statusOnSuccess: number = 200) {
  if (result.ok) {
    return NextResponse.json(result.data, { status: statusOnSuccess });
  }

  const { code, message, details } = result.error;
  let status = 400;

  switch (code) {
    case "UNAUTHORIZED":
      status = 401;
      break;
    case "FORBIDDEN":
      status = 403;
      break;
    case "NOT_FOUND":
      status = 404;
      break;
    case "CIRCULAR_DEPENDENCY":
    case "ALREADY_EXISTS":
    case "SLUG_TAKEN":
      status = 409;
      break;
    case "RATE_LIMITED":
      status = 429;
      break;
    default:
      status = 400;
  }

  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}
