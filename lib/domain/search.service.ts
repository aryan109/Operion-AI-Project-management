import { db } from "../db/client";
import { projects, tasks, milestones } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { sql, and, eq } from "drizzle-orm";

export async function search(
  ctx: Context,
  query: string
): Promise<Result<{ projects: any[]; tasks: any[]; milestones: any[] }>> {
  if (!query || query.trim().length === 0) {
    return ok({ projects: [], tasks: [], milestones: [] });
  }

  const cleanQuery = query.trim();

  try {
    // 1. Search projects via tsvector
    const matchingProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        health: projects.health,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, ctx.organizationId),
          sql`tsv @@ plainto_tsquery('english', ${cleanQuery})`
        )
      )
      .limit(10);

    // 2. Search tasks via tsvector
    const matchingTasks = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, ctx.organizationId),
          sql`tsv @@ plainto_tsquery('english', ${cleanQuery})`
        )
      )
      .limit(20);

    // 3. Search milestones via tsvector
    const matchingMilestones = await db
      .select({
        id: milestones.id,
        projectId: milestones.projectId,
        name: milestones.name,
        status: milestones.status,
        targetDate: milestones.targetDate,
      })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(
        and(
          eq(projects.organizationId, ctx.organizationId),
          sql`milestones.tsv @@ plainto_tsquery('english', ${cleanQuery})`
        )
      )
      .limit(10);

    return ok({
      projects: matchingProjects,
      tasks: matchingTasks,
      milestones: matchingMilestones,
    });
  } catch (error) {
    return err("SEARCH_FAILED", "Full-text search failed", error);
  }
}
