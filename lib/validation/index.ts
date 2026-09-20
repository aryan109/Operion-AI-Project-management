import { z } from "zod";

// Workspace / Organization
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const inviteMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(["owner", "admin", "member", "viewer", "agent"]).default("member"),
});

// Projects
export const projectStatusSchema = z.enum(["planning", "active", "on_hold", "completed", "archived"]);
export const projectHealthSchema = z.enum(["on_track", "at_risk", "blocked"]);
export const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(150),
  description: z.string().optional(),
  objective: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  status: projectStatusSchema.default("planning"),
  health: projectHealthSchema.default("on_track"),
  healthReason: z.string().optional(),
  priority: prioritySchema.default("medium"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

// Workstreams
export const createWorkstreamSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export const updateWorkstreamSchema = z.object({
  name: z.string().min(1).max(100),
});

// Milestones
export const milestoneStatusSchema = z.enum(["upcoming", "active", "completed", "at_risk"]);

export const createMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").optional(),
  status: milestoneStatusSchema.default("upcoming"),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().omit({ projectId: true });

// Tasks
export const taskTypeSchema = z.enum(["task", "feature", "bug", "research", "idea", "decision", "request"]);
export const taskStatusSchema = z.enum(["backlog", "todo", "in_progress", "blocked", "done"]);

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  workstreamId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  taskType: taskTypeSchema.default("task"),
  status: taskStatusSchema.default("backlog"),
  priority: prioritySchema.default("medium"),
  assigneeIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").optional(),
  customProperties: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ projectId: true });

// Dependencies
export const createDependencySchema = z.object({
  blockingTaskId: z.string().uuid(),
  blockedTaskId: z.string().uuid(),
});

// Comments
export const createCommentSchema = z.object({
  entityType: z.enum(["project", "task", "milestone"]),
  entityId: z.string().uuid(),
  content: z.string().min(1, "Comment cannot be empty"),
  mentions: z.array(z.string().uuid()).optional(),
});

// Tags
export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
});

// Automations
export const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.record(z.unknown()),
  condition: z.record(z.unknown()).optional(),
  action: z.record(z.unknown()),
  isActive: z.boolean().default(true),
});

// API Keys
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).default(["*"]),
});

// Webhook Subscriptions
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(8),
});
