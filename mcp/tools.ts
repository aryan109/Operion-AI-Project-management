import { Context } from "@/lib/domain/context";
import * as workspaceService from "@/lib/domain/workspace.service";
import * as projectService from "@/lib/domain/project.service";
import * as workstreamService from "@/lib/domain/workstream.service";
import * as milestoneService from "@/lib/domain/milestone.service";
import * as taskService from "@/lib/domain/task.service";
import * as dependencyService from "@/lib/domain/dependency.service";
import * as commentService from "@/lib/domain/comment.service";
import * as activityService from "@/lib/domain/activity.service";
import * as reportService from "@/lib/domain/report.service";
import * as aiDomainService from "@/lib/domain/ai.service";
import * as searchService from "@/lib/domain/search.service";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (ctx: Context, args: any) => Promise<any>;
}

export const MCP_TOOLS: ToolDefinition[] = [
  // --- WORKSPACE ---
  {
    name: "getWorkspace",
    description: "Get details and settings of the current workspace/organization.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await workspaceService.getOrganization(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "listUsers",
    description: "List all members and agent identities in the workspace.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await workspaceService.listMembers(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- PROJECTS ---
  {
    name: "createProject",
    description: "Create a new project in the workspace.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Project title" },
        description: { type: "string" },
        objective: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        status: { type: "string", enum: ["planning", "active", "on_hold", "completed", "archived"] },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        targetDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
    handler: async (ctx, args) => {
      const res = await projectService.createProject(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "getProject",
    description: "Get project details by ID.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await projectService.getProject(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "updateProject",
    description: "Update project metadata, status, or health.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["planning", "active", "on_hold", "completed", "archived"] },
        health: { type: "string", enum: ["on_track", "at_risk", "blocked"] },
        healthReason: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      },
    },
    handler: async (ctx, args) => {
      const { projectId, ...input } = args;
      const res = await projectService.updateProject(ctx, projectId, input);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "archiveProject",
    description: "Archive a project.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await projectService.archiveProject(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "duplicateProject",
    description: "Duplicate an existing project.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" }, newName: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await projectService.duplicateProject(ctx, args.projectId, args.newName);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "deleteProject",
    description: "Permanently delete a project. HIGH RISK: Requires confirmed: true.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: {
        projectId: { type: "string" },
        confirmed: { type: "boolean", description: "Set to true to confirm permanent deletion" },
      },
    },
    handler: async (ctx, args) => {
      if (!args.confirmed) {
        return {
          confirmationRequired: true,
          message: "Warning: Permanently deleting this project will remove all related workstreams, milestones, tasks, and dependencies. Re-invoke with confirmed: true to execute.",
        };
      }
      const res = await projectService.deleteProject(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- WORKSTREAMS ---
  {
    name: "createWorkstream",
    description: "Create a workstream track under a project.",
    inputSchema: {
      type: "object",
      required: ["projectId", "name"],
      properties: { projectId: { type: "string" }, name: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await workstreamService.createWorkstream(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "listWorkstreams",
    description: "List all workstreams for a given project.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await workstreamService.listWorkstreams(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- MILESTONES ---
  {
    name: "createMilestone",
    description: "Create a target delivery milestone for a project.",
    inputSchema: {
      type: "object",
      required: ["projectId", "name"],
      properties: {
        projectId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        targetDate: { type: "string", description: "YYYY-MM-DD" },
        status: { type: "string", enum: ["upcoming", "active", "completed", "at_risk"] },
      },
    },
    handler: async (ctx, args) => {
      const res = await milestoneService.createMilestone(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "listMilestones",
    description: "List all milestones for a project.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await milestoneService.listMilestones(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "completeMilestone",
    description: "Mark a milestone as completed.",
    inputSchema: {
      type: "object",
      required: ["milestoneId"],
      properties: { milestoneId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await milestoneService.completeMilestone(ctx, args.milestoneId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- TASKS ---
  {
    name: "createTask",
    description: "Create a new task or subtask.",
    inputSchema: {
      type: "object",
      required: ["projectId", "title"],
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        workstreamId: { type: "string" },
        parentTaskId: { type: "string", description: "Set to create as subtask" },
        milestoneId: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        status: { type: "string", enum: ["backlog", "todo", "in_progress", "blocked", "done"] },
        dueDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
    handler: async (ctx, args) => {
      const res = await taskService.createTask(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "getTask",
    description: "Get task details including assignees, subtasks, and dependencies.",
    inputSchema: {
      type: "object",
      required: ["taskId"],
      properties: { taskId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await taskService.getTask(ctx, args.taskId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "changeTaskStatus",
    description: "Change status of a task (backlog, todo, in_progress, blocked, done).",
    inputSchema: {
      type: "object",
      required: ["taskId", "status"],
      properties: {
        taskId: { type: "string" },
        status: { type: "string", enum: ["backlog", "todo", "in_progress", "blocked", "done"] },
      },
    },
    handler: async (ctx, args) => {
      const res = await taskService.changeTaskStatus(ctx, args.taskId, args.status);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "completeTask",
    description: "Mark a task as done.",
    inputSchema: {
      type: "object",
      required: ["taskId"],
      properties: { taskId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await taskService.completeTask(ctx, args.taskId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "assignTask",
    description: "Assign a task to a user.",
    inputSchema: {
      type: "object",
      required: ["taskId", "userId"],
      properties: { taskId: { type: "string" }, userId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await taskService.assignTask(ctx, args.taskId, args.userId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "deleteTask",
    description: "Delete a task.",
    inputSchema: {
      type: "object",
      required: ["taskId"],
      properties: { taskId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await taskService.deleteTask(ctx, args.taskId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "bulkDeleteTasks",
    description: "Delete multiple tasks at once. HIGH RISK: Requires confirmed: true.",
    inputSchema: {
      type: "object",
      required: ["taskIds"],
      properties: {
        taskIds: { type: "array", items: { type: "string" } },
        confirmed: { type: "boolean" },
      },
    },
    handler: async (ctx, args) => {
      if (!args.confirmed) {
        return {
          confirmationRequired: true,
          message: `Warning: You are about to delete ${args.taskIds.length} tasks. Re-invoke with confirmed: true to proceed.`,
        };
      }
      const res = await taskService.bulkDeleteTasks(ctx, args.taskIds);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- DEPENDENCIES ---
  {
    name: "createDependency",
    description: "Create a blocking dependency between tasks with cycle detection.",
    inputSchema: {
      type: "object",
      required: ["blockingTaskId", "blockedTaskId"],
      properties: {
        blockingTaskId: { type: "string" },
        blockedTaskId: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const res = await dependencyService.createDependency(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "removeDependency",
    description: "Remove a task dependency by ID.",
    inputSchema: {
      type: "object",
      required: ["dependencyId"],
      properties: { dependencyId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await dependencyService.removeDependency(ctx, args.dependencyId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "analyzeBlockers",
    description: "Get all tasks that are blocking a specified task.",
    inputSchema: {
      type: "object",
      required: ["taskId"],
      properties: { taskId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await dependencyService.getBlockers(ctx, args.taskId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- COMMENTS ---
  {
    name: "addComment",
    description: "Add a comment to a project, task, or milestone.",
    inputSchema: {
      type: "object",
      required: ["entityType", "entityId", "content"],
      properties: {
        entityType: { type: "string", enum: ["project", "task", "milestone"] },
        entityId: { type: "string" },
        content: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const res = await commentService.addComment(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "readComments",
    description: "Read comments for an entity.",
    inputSchema: {
      type: "object",
      required: ["entityType", "entityId"],
      properties: {
        entityType: { type: "string", enum: ["project", "task", "milestone"] },
        entityId: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const res = await commentService.listComments(ctx, args.entityType, args.entityId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- REPORTS ---
  {
    name: "generateDailyReport",
    description: "Generate daily workspace status report.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await reportService.generateDailyReport(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "generatePortfolioReport",
    description: "Generate cross-project portfolio health report.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await reportService.generatePortfolioReport(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },

  // --- AI OPS ---
  {
    name: "planProject",
    description: "Autonomously plan and instantiate a project with workstreams, milestones, and tasks.",
    inputSchema: {
      type: "object",
      required: ["objective"],
      properties: {
        objective: { type: "string" },
        constraints: { type: "string" },
        projectName: { type: "string" },
      },
    },
    handler: async (ctx, args) => {
      const res = await aiDomainService.planProject(ctx, args);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "analyzeHealth",
    description: "Analyze project health, clearly distinguishing facts from interpretations.",
    inputSchema: {
      type: "object",
      required: ["projectId"],
      properties: { projectId: { type: "string" } },
    },
    handler: async (ctx, args) => {
      const res = await aiDomainService.analyzeHealth(ctx, args.projectId);
      if (!res.ok) throw new Error(res.error.message);
      return res.data;
    },
  },
  {
    name: "findBlockers",
    description: "Find all tasks currently marked as blocked across the workspace.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await taskService.getTodayView(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data.blocked || [];
    },
  },
  {
    name: "findOverdueWork",
    description: "Find all overdue tasks past their due dates.",
    inputSchema: { type: "object", properties: {} },
    handler: async (ctx) => {
      const res = await taskService.getTodayView(ctx);
      if (!res.ok) throw new Error(res.error.message);
      return res.data.overdue || [];
    },
  },
];
