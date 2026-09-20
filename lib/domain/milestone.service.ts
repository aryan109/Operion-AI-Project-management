import { db } from "../db/client";
import { milestones, projects } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and, desc } from "drizzle-orm";

export interface CreateMilestoneInput {
  projectId: string;
  name: string;
  description?: string;
  ownerId?: string;
  targetDate?: string;
  status?: "upcoming" | "active" | "completed" | "at_risk";
}

export async function createMilestone(
  ctx: Context,
  input: CreateMilestoneInput
): Promise<Result<any>> {
  if (!can(ctx, "manage_milestones")) {
    return err("FORBIDDEN", "Not authorized to manage milestones");
  }

  try {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, ctx.organizationId)));

    if (!project) return err("NOT_FOUND", "Project not found");

    const [ms] = await db
      .insert(milestones)
      .values({
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        ownerId: input.ownerId,
        targetDate: input.targetDate,
        status: input.status || "upcoming",
      })
      .returning();

    await activity.record(ctx, {
      entityType: "milestone",
      entityId: ms.id,
      action: "created",
      after: { name: ms.name, targetDate: ms.targetDate, status: ms.status },
    });

    return ok(ms);
  } catch (error) {
    return err("MILESTONE_CREATE_FAILED", "Failed to create milestone", error);
  }
}

export async function getMilestone(ctx: Context, id: string): Promise<Result<any>> {
  try {
    const [ms] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));

    if (!ms) return err("NOT_FOUND", "Milestone not found");
    return ok(ms);
  } catch (error) {
    return err("MILESTONE_FETCH_FAILED", "Failed to get milestone", error);
  }
}

export async function listMilestones(
  ctx: Context,
  projectId: string
): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(milestones.targetDate);

    return ok(rows);
  } catch (error) {
    return err("MILESTONE_LIST_FAILED", "Failed to list milestones", error);
  }
}

export async function updateMilestone(
  ctx: Context,
  id: string,
  input: Partial<CreateMilestoneInput>
): Promise<Result<any>> {
  if (!can(ctx, "manage_milestones")) {
    return err("FORBIDDEN", "Not authorized to update milestones");
  }

  try {
    const [before] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));

    if (!before) return err("NOT_FOUND", "Milestone not found");

    const [updated] = await db
      .update(milestones)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(milestones.id, id))
      .returning();

    await activity.record(ctx, {
      entityType: "milestone",
      entityId: id,
      action: "updated",
      before: { status: before.status, targetDate: before.targetDate },
      after: { status: updated.status, targetDate: updated.targetDate },
    });

    return ok(updated);
  } catch (error) {
    return err("MILESTONE_UPDATE_FAILED", "Failed to update milestone", error);
  }
}

export async function completeMilestone(ctx: Context, id: string): Promise<Result<any>> {
  return updateMilestone(ctx, id, { status: "completed" });
}

export async function deleteMilestone(ctx: Context, id: string): Promise<Result<{ id: string }>> {
  if (!can(ctx, "manage_milestones")) {
    return err("FORBIDDEN", "Not authorized to delete milestones");
  }

  try {
    const [deleted] = await db
      .delete(milestones)
      .where(eq(milestones.id, id))
      .returning({ id: milestones.id });

    if (!deleted) return err("NOT_FOUND", "Milestone not found");

    await activity.record(ctx, {
      entityType: "milestone",
      entityId: id,
      action: "deleted",
    });

    return ok({ id: deleted.id });
  } catch (error) {
    return err("MILESTONE_DELETE_FAILED", "Failed to delete milestone", error);
  }
}
