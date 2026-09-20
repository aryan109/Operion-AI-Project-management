import { db } from "../db/client";
import { tasks, taskAssignees, projects, profiles, taskDependencies } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and, desc, sql, inArray, isNull, isNotNull, lte, gte } from "drizzle-orm";

export interface CreateTaskInput {
  projectId: string;
  workstreamId?: string;
  parentTaskId?: string;
  milestoneId?: string;
  title: string;
  description?: string;
  taskType?: "task" | "feature" | "bug" | "research" | "idea" | "decision" | "request";
  status?: "backlog" | "todo" | "in_progress" | "blocked" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeIds?: string[];
  startDate?: string;
  dueDate?: string;
  customProperties?: Record<string, unknown>;
}

export async function createTask(
  ctx: Context,
  input: CreateTaskInput
): Promise<Result<any>> {
  if (!can(ctx, "create_task")) {
    return err("FORBIDDEN", "Not authorized to create tasks");
  }

  // Cap custom properties to max 20 keys per entity (spec §24)
  if (input.customProperties && Object.keys(input.customProperties).length > 20) {
    return err("VALIDATION_ERROR", "Custom properties cannot exceed 20 keys");
  }

  try {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, ctx.organizationId)));

    if (!project) return err("NOT_FOUND", "Project not found");

    const [task] = await db
      .insert(tasks)
      .values({
        organizationId: ctx.organizationId,
        projectId: input.projectId,
        workstreamId: input.workstreamId,
        parentTaskId: input.parentTaskId,
        milestoneId: input.milestoneId,
        title: input.title,
        description: input.description,
        taskType: input.taskType || "task",
        status: input.status || "backlog",
        priority: input.priority || "medium",
        creatorId: ctx.actor.type === "user" ? ctx.actor.id : null,
        startDate: input.startDate,
        dueDate: input.dueDate,
        customProperties: input.customProperties || {},
        completedAt: input.status === "done" ? new Date() : null,
      })
      .returning();

    // Insert assignees if provided
    if (input.assigneeIds && input.assigneeIds.length > 0) {
      await db.insert(taskAssignees).values(
        input.assigneeIds.map((userId) => ({
          taskId: task.id,
          userId,
        }))
      );
    }

    await activity.record(ctx, {
      entityType: "task",
      entityId: task.id,
      action: "created",
      after: { title: task.title, status: task.status, priority: task.priority },
    });

    return ok(task);
  } catch (error) {
    return err("TASK_CREATE_FAILED", "Failed to create task", error);
  }
}

export async function getTask(ctx: Context, taskId: string): Promise<Result<any>> {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, ctx.organizationId)));

    if (!task) return err("NOT_FOUND", "Task not found");

    // Fetch assignees
    const assignees = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(taskAssignees)
      .innerJoin(profiles, eq(taskAssignees.userId, profiles.id))
      .where(eq(taskAssignees.taskId, taskId));

    // Fetch subtasks
    const subtasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, taskId));

    // Fetch dependencies (blockers)
    const blockers = await db
      .select({
        id: taskDependencies.id,
        blockingTaskId: taskDependencies.blockingTaskId,
        title: tasks.title,
        status: tasks.status,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockingTaskId, tasks.id))
      .where(eq(taskDependencies.blockedTaskId, taskId));

    return ok({
      ...task,
      assignees,
      subtasks,
      blockers,
    });
  } catch (error) {
    return err("TASK_FETCH_FAILED", "Failed to get task", error);
  }
}

export async function listTasks(
  ctx: Context,
  options?: {
    projectId?: string;
    status?: string;
    priority?: string;
    workstreamId?: string;
    milestoneId?: string;
    parentTaskId?: string | null;
    assigneeId?: string;
  }
): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, ctx.organizationId))
      .orderBy(tasks.dueDate, desc(tasks.createdAt));

    let filtered = rows;
    if (options?.projectId) {
      filtered = filtered.filter((t) => t.projectId === options.projectId);
    }
    if (options?.status) {
      filtered = filtered.filter((t) => t.status === options.status);
    }
    if (options?.priority) {
      filtered = filtered.filter((t) => t.priority === options.priority);
    }
    if (options?.workstreamId) {
      filtered = filtered.filter((t) => t.workstreamId === options.workstreamId);
    }
    if (options?.milestoneId) {
      filtered = filtered.filter((t) => t.milestoneId === options.milestoneId);
    }
    if (options?.parentTaskId !== undefined) {
      filtered = filtered.filter((t) =>
        options.parentTaskId === null ? !t.parentTaskId : t.parentTaskId === options.parentTaskId
      );
    }

    return ok(filtered);
  } catch (error) {
    return err("TASK_LIST_FAILED", "Failed to list tasks", error);
  }
}

export async function updateTask(
  ctx: Context,
  taskId: string,
  input: Partial<CreateTaskInput>
): Promise<Result<any>> {
  if (!can(ctx, "edit_task")) {
    return err("FORBIDDEN", "Not authorized to edit tasks");
  }

  try {
    const [before] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, ctx.organizationId)));

    if (!before) return err("NOT_FOUND", "Task not found");

    const isCompleting = input.status === "done" && before.status !== "done";
    const isReopening = input.status && input.status !== "done" && before.status === "done";

    const [updated] = await db
      .update(tasks)
      .set({
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.taskType ? { taskType: input.taskType } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.workstreamId !== undefined ? { workstreamId: input.workstreamId } : {}),
        ...(input.milestoneId !== undefined ? { milestoneId: input.milestoneId } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.customProperties ? { customProperties: input.customProperties } : {}),
        ...(isCompleting ? { completedAt: new Date() } : {}),
        ...(isReopening ? { completedAt: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    // Update assignees if specified
    if (input.assigneeIds !== undefined) {
      await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
      if (input.assigneeIds.length > 0) {
        await db.insert(taskAssignees).values(
          input.assigneeIds.map((userId) => ({
            taskId,
            userId,
          }))
        );
      }
    }

    await activity.record(ctx, {
      entityType: "task",
      entityId: taskId,
      action: "updated",
      before: { status: before.status, priority: before.priority, title: before.title },
      after: { status: updated.status, priority: updated.priority, title: updated.title },
    });

    return ok(updated);
  } catch (error) {
    return err("TASK_UPDATE_FAILED", "Failed to update task", error);
  }
}

export async function changeTaskStatus(
  ctx: Context,
  taskId: string,
  status: "backlog" | "todo" | "in_progress" | "blocked" | "done"
): Promise<Result<any>> {
  return updateTask(ctx, taskId, { status });
}

export async function changeTaskPriority(
  ctx: Context,
  taskId: string,
  priority: "low" | "medium" | "high" | "urgent"
): Promise<Result<any>> {
  return updateTask(ctx, taskId, { priority });
}

export async function completeTask(ctx: Context, taskId: string): Promise<Result<any>> {
  return updateTask(ctx, taskId, { status: "done" });
}

export async function assignTask(
  ctx: Context,
  taskId: string,
  userId: string
): Promise<Result<any>> {
  if (!can(ctx, "edit_task")) {
    return err("FORBIDDEN", "Not authorized to assign tasks");
  }

  try {
    await db
      .insert(taskAssignees)
      .values({ taskId, userId })
      .onConflictDoNothing();

    await activity.record(ctx, {
      entityType: "task",
      entityId: taskId,
      action: "assigned",
      after: { assignedTo: userId },
    });

    return ok({ assigned: true, userId });
  } catch (error) {
    return err("TASK_ASSIGN_FAILED", "Failed to assign task", error);
  }
}

export async function deleteTask(ctx: Context, taskId: string): Promise<Result<{ id: string }>> {
  if (!can(ctx, "delete_task")) {
    return err("FORBIDDEN", "Not authorized to delete tasks");
  }

  try {
    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, ctx.organizationId)))
      .returning({ id: tasks.id, title: tasks.title });

    if (!deleted) return err("NOT_FOUND", "Task not found");

    await activity.record(ctx, {
      entityType: "task",
      entityId: taskId,
      action: "deleted",
      before: { title: deleted.title },
    });

    return ok({ id: deleted.id });
  } catch (error) {
    return err("TASK_DELETE_FAILED", "Failed to delete task", error);
  }
}

export async function bulkDeleteTasks(
  ctx: Context,
  taskIds: string[]
): Promise<Result<{ count: number }>> {
  if (!can(ctx, "delete_task")) {
    return err("FORBIDDEN", "Not authorized to delete tasks");
  }

  try {
    const deleted = await db
      .delete(tasks)
      .where(and(inArray(tasks.id, taskIds), eq(tasks.organizationId, ctx.organizationId)))
      .returning({ id: tasks.id });

    await activity.record(ctx, {
      entityType: "task",
      entityId: ctx.organizationId,
      action: "bulk_deleted",
      after: { count: deleted.length, taskIds },
    });

    return ok({ count: deleted.length });
  } catch (error) {
    return err("BULK_DELETE_FAILED", "Failed to bulk delete tasks", error);
  }
}

export async function duplicateTask(ctx: Context, taskId: string): Promise<Result<any>> {
  const tRes = await getTask(ctx, taskId);
  if (!tRes.ok) return tRes;
  const original = tRes.data;

  return createTask(ctx, {
    projectId: original.projectId,
    workstreamId: original.workstreamId,
    parentTaskId: original.parentTaskId,
    milestoneId: original.milestoneId,
    title: `${original.title} (Copy)`,
    description: original.description,
    taskType: original.taskType,
    status: "backlog",
    priority: original.priority,
  });
}

/**
 * My Work (spec §63):
 * Assigned tasks grouped into: Today, Upcoming, Overdue, Blocked, Recently Completed
 */
export async function getMyWork(ctx: Context, userId?: string): Promise<Result<any>> {
  const targetUserId = userId || (ctx.actor.type === "user" ? ctx.actor.id : null);
  if (!targetUserId) {
    return err("BAD_REQUEST", "User ID required for My Work");
  }

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const userTasks = await db
      .select({
        task: tasks,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(taskAssignees.userId, targetUserId), eq(tasks.organizationId, ctx.organizationId)));

    const todayList: any[] = [];
    const upcomingList: any[] = [];
    const overdueList: any[] = [];
    const blockedList: any[] = [];
    const completedList: any[] = [];

    for (const item of userTasks) {
      const t = { ...item.task, projectName: item.project.name };
      if (t.status === "done") {
        completedList.push(t);
      } else if (t.status === "blocked") {
        blockedList.push(t);
      } else if (t.dueDate && t.dueDate < todayStr) {
        overdueList.push(t);
      } else if (t.dueDate === todayStr) {
        todayList.push(t);
      } else {
        upcomingList.push(t);
      }
    }

    return ok({
      today: todayList,
      upcoming: upcomingList,
      overdue: overdueList,
      blocked: blockedList,
      recentlyCompleted: completedList.slice(0, 10),
    });
  } catch (error) {
    return err("MY_WORK_FAILED", "Failed to retrieve user work items", error);
  }
}

/**
 * Today View (spec §63):
 * Due today, overdue, high priority, and blocked tasks across entire workspace
 */
export async function getTodayView(ctx: Context): Promise<Result<any>> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const allTasks = await db
      .select({
        task: tasks,
        project: {
          id: projects.id,
          name: projects.name,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.organizationId, ctx.organizationId), sql`${tasks.status} != 'done'`));

    const dueToday: any[] = [];
    const overdue: any[] = [];
    const highPriority: any[] = [];
    const blocked: any[] = [];

    for (const item of allTasks) {
      const t = { ...item.task, projectName: item.project.name };
      if (t.status === "blocked") {
        blocked.push(t);
      }
      if (t.dueDate && t.dueDate < todayStr) {
        overdue.push(t);
      } else if (t.dueDate === todayStr) {
        dueToday.push(t);
      }
      if (t.priority === "urgent" || t.priority === "high") {
        highPriority.push(t);
      }
    }

    return ok({
      dueToday,
      overdue,
      highPriority,
      blocked,
      totalPending: allTasks.length,
    });
  } catch (error) {
    return err("TODAY_VIEW_FAILED", "Failed to get Today view", error);
  }
}
