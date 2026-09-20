import { db } from "../db/client";
import { apiKeys } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(
  ctx: Context,
  input: { name: string; scopes?: string[] }
): Promise<Result<{ apiKey: string; id: string; name: string; scopes: string[] }>> {
  if (!can(ctx, "manage_api_keys")) {
    return err("FORBIDDEN", "Not authorized to create API keys");
  }

  try {
    const rawKey = `opr_${crypto.randomBytes(24).toString("base64url")}`;
    const hashed = hashKey(rawKey);

    const [record] = await db
      .insert(apiKeys)
      .values({
        organizationId: ctx.organizationId,
        name: input.name,
        hashedKey: hashed,
        scopes: input.scopes || ["*"],
      })
      .returning();

    return ok({
      apiKey: rawKey,
      id: record.id,
      name: record.name,
      scopes: record.scopes || [],
    });
  } catch (error) {
    return err("API_KEY_CREATE_FAILED", "Failed to generate API key", error);
  }
}

export async function validateApiKey(
  key: string
): Promise<Result<{ organizationId: string; scopes: string[] }>> {
  try {
    const hashed = hashKey(key);
    const [record] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.hashedKey, hashed), isNull(apiKeys.revokedAt)));

    if (!record) {
      return err("UNAUTHORIZED", "Invalid or revoked API key");
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, record.id));

    return ok({
      organizationId: record.organizationId,
      scopes: record.scopes || [],
    });
  } catch (error) {
    return err("AUTH_FAILED", "Failed to validate API key", error);
  }
}

export async function listApiKeys(ctx: Context): Promise<Result<any[]>> {
  if (!can(ctx, "manage_api_keys")) {
    return err("FORBIDDEN", "Not authorized to list API keys");
  }

  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, ctx.organizationId));

    return ok(keys);
  } catch (error) {
    return err("API_KEY_LIST_FAILED", "Failed to list API keys", error);
  }
}

export async function revokeApiKey(ctx: Context, id: string): Promise<Result<boolean>> {
  if (!can(ctx, "manage_api_keys")) {
    return err("FORBIDDEN", "Not authorized to revoke API keys");
  }

  try {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, ctx.organizationId)));

    return ok(true);
  } catch (error) {
    return err("API_KEY_REVOKE_FAILED", "Failed to revoke API key", error);
  }
}
