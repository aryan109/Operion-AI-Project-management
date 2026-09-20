import { db } from "../db/client";
import { projects, tasks, milestones, workstreams } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and, sql, desc } from "drizzle-orm";

export interface CreateProjectInput {
  name: string;
  description?: string;
  objective?: string;
  ownerId?: string;
  status?: "planning" | "active" | "on_hold" | "completed" | "archived";
  health?: "on_track" | "at_risk" | "blocked";
  healthReason?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  startDate?: string;
  targetDate?: string;
}

export async function createProject(
  ctx: Context,
  input: CreateProjectInput
): Promise<Result<any>> {
  if (!can(ctx, "create_project")) {
    return err("FORBIDDEN", "Not authorized to create projects");
  }

  try {
    const [project] = await db
      .insert(projects)
      .values({
        organizationId: ctx.organizationId,
        name: input.name,
        description: input.description,
        objective: input.objective,
        ownerId: input.ownerId || (ctx.actor.type === "user" ? ctx.actor.id : null),
        status: input.status || "planning",
        health: input.health || "on_track",
        healthReason: input.healthReason,
        priority: input.priority || "medium",
        startDate: input.startDate,
        targetDate: input.targetDate,
      })
      .returning();

    await activity.record(ctx, {
      entityType: "project",
      entityId: project.id,
      action: "created",
      after: { name: project.name, status: project.status, health: project.health },
    });

    return ok(project);
  } catch (error) {
    return err("PROJECT_CREATE_FAILED", "Failed to create project", error);
  }
}

export async function getProject(ctx: Context, projectId: string): Promise<Result<any>> {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, ctx.organizationId)));

    if (!project) return err("NOT_FOUND", "Project not found");
    return ok(project);
  } catch (error) {
    return err("PROJECT_FETCH_FAILED", "Failed to get project", error);
  }
}

export async function listProjects(
  ctx: Context,
  options?: { status?: string; health?: string }
): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId))
      .orderBy(desc(projects.createdAt));

    let filtered = rows;
    if (options?.status) {
      filtered = filtered.filter((p) => p.status === options.status);
    }
    if (options?.health) {
      filtered = filtered.filter((p) => p.health === options.health);
    }

    return ok(filtered);
  } catch (error) {
    return err("PROJECT_LIST_FAILED", "Failed to list projects", error);
  }
}

export async function updateProject(
  ctx: Context,
  projectId: string,
  input: Partial<CreateProjectInput>
): Promise<Result<any>> {
  if (!can(ctx, "edit_project")) {
    return err("FORBIDDEN", "Not authorized to edit projects");
  }

  try {
    const [before] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, ctx.organizationId)));

    if (!before) return err("NOT_FOUND", "Project not found");

    const [updated] = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    await activity.record(ctx, {
      entityType: "project",
      entityId: projectId,
      action: "updated",
      before: { status: before.status, health: before.health, priority: before.priority },
      after: { status: updated.status, health: updated.health, priority: updated.priority },
    });

    return ok(updated);
  } catch (error) {
    return err("PROJECT_UPDATE_FAILED", "Failed to update project", error);
  }
}

export async function archiveProject(ctx: Context, projectId: string): Promise<Result<any>> {
  if (!can(ctx, "archive_project")) {
    return err("FORBIDDEN", "Not authorized to archive projects");
  }
  return updateProject(ctx, projectId, { status: "archived" });
}

export async function deleteProject(ctx: Context, projectId: string): Promise<Result<{ id: string }>> {
  if (!can(ctx, "delete_project")) {
    return err("FORBIDDEN", "Not authorized to delete projects");
  }

  try {
    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, ctx.organizationId)))
      .returning({ id: projects.id, name: projects.name });

    if (!deleted) return err("NOT_FOUND", "Project not found");

    await activity.record(ctx, {
      entityType: "project",
      entityId: projectId,
      action: "deleted",
      before: { name: deleted.name },
    });

    return ok({ id: deleted.id });
  } catch (error) {
    return err("PROJECT_DELETE_FAILED", "Failed to delete project", error);
  }
}

export async function duplicateProject(
  ctx: Context,
  projectId: string,
  newName?: string
): Promise<Result<any>> {
  const projRes = await getProject(ctx, projectId);
  if (!projRes.ok) return projRes;
  const original = projRes.data;

  const createRes = await createProject(ctx, {
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    objective: original.objective,
    priority: original.priority,
    status: "planning",
    health: "on_track",
  });

  return createRes;
}

/**
 * Portfolio Aggregate Query (spec §81, §56):
 * Returns { project, taskCounts: { backlog, todo, in_progress, blocked, done }, health, nextMilestone }
 * Executes in aggregate without loading individual tasks!
 */
export async function getPortfolioAggregate(ctx: Context): Promise<Result<any[]>> {
  try {
    // 1. Fetch all projects in organization
    const orgProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.organizationId, ctx.organizationId))
      .orderBy(desc(projects.createdAt));

    if (orgProjects.length === 0) {
      return ok([]);
    }

    // 2. Fetch task counts grouped by project and status
    const taskCountRows = await db
      .select({
        projectId: tasks.projectId,
        status: tasks.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(eq(tasks.organizationId, ctx.organizationId))
      .groupBy(tasks.projectId, tasks.status);

    // 3. Fetch upcoming milestones for each project
    const milestoneRows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.status, "upcoming"))
      .orderBy(milestones.targetDate);

    // Combine aggregates in memory (O(N) mapping, zero N+1 database queries)
    const taskCountMap: Record<string, Record<string, number>> = {};
    for (const row of taskCountRows) {
      if (!taskCountMap[row.projectId]) {
        taskCountMap[row.projectId] = { backlog: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 };
      }
      taskCountMap[row.projectId][row.status] = row.count;
    }

    const milestoneMap: Record<string, any> = {};
    for (const ms of milestoneRows) {
      if (!milestoneMap[ms.projectId]) {
        milestoneMap[ms.projectId] = ms; // earliest target date because ordered
      }
    }

    const result = orgProjects.map((p) => {
      const counts = taskCountMap[p.id] || { backlog: 0, todo: 0, in_progress: 0, blocked: 0, done: 0 };
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const progressPercent = total > 0 ? Math.round((counts.done / total) * 100) : 0;

      return {
        ...p,
        taskCounts: counts,
        totalTasks: total,
        progressPercent,
        nextMilestone: milestoneMap[p.id] || null,
      };
    });

    return ok(result);
  } catch (error) {
    return err("PORTFOLIO_AGGREGATE_FAILED", "Failed to compute portfolio aggregates", error);
  }
}
