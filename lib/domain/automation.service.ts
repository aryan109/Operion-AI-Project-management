import { db } from "../db/client";
import { automations } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and } from "drizzle-orm";

export interface AutomationTriggerEvent {
  event: "task.created" | "task.completed" | "task.blocked" | "project.completed" | "milestone.completed";
  data: Record<string, unknown>;
}

export async function createAutomation(
  ctx: Context,
  input: { name: string; trigger: Record<string, unknown>; condition?: Record<string, unknown>; action: Record<string, unknown> }
): Promise<Result<any>> {
  if (!can(ctx, "manage_automations")) {
    return err("FORBIDDEN", "Not authorized to manage automations");
  }

  try {
    const [auto] = await db
      .insert(automations)
      .values({
        organizationId: ctx.organizationId,
        name: input.name,
        trigger: input.trigger,
        condition: input.condition ?? null,
        action: input.action,
        isActive: true,
      })
      .returning();

    await activity.record(ctx, {
      entityType: "automation",
      entityId: auto.id,
      action: "created",
      after: { name: auto.name },
    });

    return ok(auto);
  } catch (error) {
    return err("AUTO_CREATE_FAILED", "Failed to create automation", error);
  }
}

export async function listAutomations(ctx: Context): Promise<Result<any[]>> {
  try {
    const list = await db
      .select()
      .from(automations)
      .where(eq(automations.organizationId, ctx.organizationId));
    return ok(list);
  } catch (error) {
    return err("AUTO_LIST_FAILED", "Failed to list automations", error);
  }
}

/**
 * Inline Automation Dispatcher (spec §52, §58)
 * Runs synchronously on mutations without heavy message queues
 */
export async function triggerAutomations(
  ctx: Context,
  event: AutomationTriggerEvent
): Promise<void> {
  try {
    const active = await db
      .select()
      .from(automations)
      .where(and(eq(automations.organizationId, ctx.organizationId), eq(automations.isActive, true)));

    for (const auto of active) {
      const trg = auto.trigger as any;
      if (trg?.event === event.event) {
        console.log(`[Automation Engine] Executing '${auto.name}' for event '${event.event}'`);
        // Actions can notify or log
        await activity.record(ctx, {
          entityType: "automation",
          entityId: auto.id,
          action: "triggered",
          after: { event: event.event, action: auto.action },
        });
      }
    }
  } catch (e) {
    console.error("Automation execution error:", e);
  }
}
