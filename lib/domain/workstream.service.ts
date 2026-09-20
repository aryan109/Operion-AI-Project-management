import { db } from "../db/client";
import { workstreams, projects } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and } from "drizzle-orm";

export async function createWorkstream(
  ctx: Context,
  input: { projectId: string; name: string }
): Promise<Result<any>> {
  if (!can(ctx, "manage_workstreams")) {
    return err("FORBIDDEN", "Not authorized to manage workstreams");
  }

  try {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, ctx.organizationId)));

    if (!project) return err("NOT_FOUND", "Project not found");

    const [ws] = await db
      .insert(workstreams)
      .values({
        projectId: input.projectId,
        name: input.name,
      })
      .returning();

    await activity.record(ctx, {
      entityType: "workstream",
      entityId: ws.id,
      action: "created",
      after: { name: ws.name, projectId: ws.projectId },
    });

    return ok(ws);
  } catch (error) {
    return err("WORKSTREAM_CREATE_FAILED", "Failed to create workstream", error);
  }
}

export async function listWorkstreams(
  ctx: Context,
  projectId: string
): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select()
      .from(workstreams)
      .where(eq(workstreams.projectId, projectId));

    return ok(rows);
  } catch (error) {
    return err("WORKSTREAM_LIST_FAILED", "Failed to list workstreams", error);
  }
}

export async function updateWorkstream(
  ctx: Context,
  id: string,
  input: { name: string }
): Promise<Result<any>> {
  if (!can(ctx, "manage_workstreams")) {
    return err("FORBIDDEN", "Not authorized to update workstream");
  }

  try {
    const [updated] = await db
      .update(workstreams)
      .set({ name: input.name })
      .where(eq(workstreams.id, id))
      .returning();

    if (!updated) return err("NOT_FOUND", "Workstream not found");

    await activity.record(ctx, {
      entityType: "workstream",
      entityId: id,
      action: "updated",
      after: { name: updated.name },
    });

    return ok(updated);
  } catch (error) {
    return err("WORKSTREAM_UPDATE_FAILED", "Failed to update workstream", error);
  }
}

export async function deleteWorkstream(
  ctx: Context,
  id: string
): Promise<Result<{ id: string }>> {
  if (!can(ctx, "manage_workstreams")) {
    return err("FORBIDDEN", "Not authorized to delete workstream");
  }

  try {
    const [deleted] = await db
      .delete(workstreams)
      .where(eq(workstreams.id, id))
      .returning({ id: workstreams.id });

    if (!deleted) return err("NOT_FOUND", "Workstream not found");

    await activity.record(ctx, {
      entityType: "workstream",
      entityId: id,
      action: "deleted",
    });

    return ok({ id: deleted.id });
  } catch (error) {
    return err("WORKSTREAM_DELETE_FAILED", "Failed to delete workstream", error);
  }
}
