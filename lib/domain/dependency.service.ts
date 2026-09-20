import { db } from "../db/client";
import { taskDependencies, tasks } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and } from "drizzle-orm";

/**
 * Checks if a path exists from startTaskId to targetTaskId using Depth-First Search (DFS).
 * If a path exists, then adding targetTaskId -> startTaskId would create a cycle!
 */
async function hasPath(startTaskId: string, targetTaskId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [startTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetTaskId) return true;

    if (!visited.has(current)) {
      visited.add(current);

      // Fetch all tasks directly blocked by `current`
      const outgoing = await db
        .select({ blockedId: taskDependencies.blockedTaskId })
        .from(taskDependencies)
        .where(eq(taskDependencies.blockingTaskId, current));

      for (const row of outgoing) {
        if (!visited.has(row.blockedId)) {
          queue.push(row.blockedId);
        }
      }
    }
  }

  return false;
}

export async function createDependency(
  ctx: Context,
  input: { blockingTaskId: string; blockedTaskId: string }
): Promise<Result<any>> {
  if (!can(ctx, "manage_dependencies")) {
    return err("FORBIDDEN", "Not authorized to manage dependencies");
  }

  if (input.blockingTaskId === input.blockedTaskId) {
    return err("CIRCULAR_DEPENDENCY", "A task cannot depend on itself");
  }

  try {
    // Check cycle: if blockedTaskId can already reach blockingTaskId, adding blockingTaskId -> blockedTaskId creates a loop!
    const cycleDetected = await hasPath(input.blockedTaskId, input.blockingTaskId);
    if (cycleDetected) {
      return err(
        "CIRCULAR_DEPENDENCY",
        "Circular dependency detected: Adding this dependency would create a cycle in the task graph."
      );
    }

    const [dep] = await db
      .insert(taskDependencies)
      .values({
        blockingTaskId: input.blockingTaskId,
        blockedTaskId: input.blockedTaskId,
      })
      .returning();

    await activity.record(ctx, {
      entityType: "task_dependency",
      entityId: dep.id,
      action: "created",
      after: { blockingTaskId: input.blockingTaskId, blockedTaskId: input.blockedTaskId },
    });

    return ok(dep);
  } catch (error: any) {
    if (error?.code === "23505") {
      return err("ALREADY_EXISTS", "Dependency already exists");
    }
    return err("DEPENDENCY_CREATE_FAILED", "Failed to create dependency", error);
  }
}

export async function removeDependency(
  ctx: Context,
  dependencyId: string
): Promise<Result<{ id: string }>> {
  if (!can(ctx, "manage_dependencies")) {
    return err("FORBIDDEN", "Not authorized to manage dependencies");
  }

  try {
    const [deleted] = await db
      .delete(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId))
      .returning({ id: taskDependencies.id });

    if (!deleted) return err("NOT_FOUND", "Dependency not found");

    await activity.record(ctx, {
      entityType: "task_dependency",
      entityId: dependencyId,
      action: "deleted",
    });

    return ok({ id: deleted.id });
  } catch (error) {
    return err("DEPENDENCY_DELETE_FAILED", "Failed to remove dependency", error);
  }
}

export async function getBlockers(ctx: Context, taskId: string): Promise<Result<any[]>> {
  try {
    const blockers = await db
      .select({
        dependencyId: taskDependencies.id,
        taskId: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockingTaskId, tasks.id))
      .where(eq(taskDependencies.blockedTaskId, taskId));

    return ok(blockers);
  } catch (error) {
    return err("BLOCKERS_FETCH_FAILED", "Failed to fetch task blockers", error);
  }
}

export async function getBlockedTasks(ctx: Context, taskId: string): Promise<Result<any[]>> {
  try {
    const blocked = await db
      .select({
        dependencyId: taskDependencies.id,
        taskId: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockedTaskId, tasks.id))
      .where(eq(taskDependencies.blockingTaskId, taskId));

    return ok(blocked);
  } catch (error) {
    return err("BLOCKED_FETCH_FAILED", "Failed to fetch blocked tasks", error);
  }
}

export async function listDependencies(ctx: Context, projectId: string): Promise<Result<any[]>> {
  try {
    const deps = await db
      .select({
        id: taskDependencies.id,
        blockingTaskId: taskDependencies.blockingTaskId,
        blockedTaskId: taskDependencies.blockedTaskId,
        createdAt: taskDependencies.createdAt,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockingTaskId, tasks.id))
      .where(eq(tasks.projectId, projectId));

    return ok(deps);
  } catch (error) {
    return err("DEPENDENCY_LIST_FAILED", "Failed to list dependencies", error);
  }
}
