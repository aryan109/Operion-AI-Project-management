import { db } from "../db/client";
import { activityEvents } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { desc, eq } from "drizzle-orm";

export interface RecordActivityInput {
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

export async function record(
  ctx: Context,
  input: RecordActivityInput
): Promise<Result<{ id: string }>> {
  try {
    const [event] = await db
      .insert(activityEvents)
      .values({
        organizationId: ctx.organizationId,
        actorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
        actorAgentId: ctx.actor.type === "agent" ? ctx.actor.id : null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        before: input.before ?? null,
        after: input.after ?? null,
      })
      .returning({ id: activityEvents.id });

    return ok({ id: event.id });
  } catch (error) {
    console.error("Failed to record activity event:", error);
    return err("ACTIVITY_LOG_FAILED", "Failed to log activity event", error);
  }
}

export async function listActivity(
  ctx: Context,
  options?: { entityType?: string; entityId?: string; limit?: number }
) {
  try {
    let query = db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.organizationId, ctx.organizationId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(options?.limit || 50);

    const rows = await query;
    let filtered = rows;
    if (options?.entityType) {
      filtered = filtered.filter((r) => r.entityType === options.entityType);
    }
    if (options?.entityId) {
      filtered = filtered.filter((r) => r.entityId === options.entityId);
    }
    return ok(filtered);
  } catch (error) {
    return err("ACTIVITY_FETCH_FAILED", "Failed to retrieve activity log", error);
  }
}
