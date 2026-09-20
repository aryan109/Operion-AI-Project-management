import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  date,
  primaryKey,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. Organizations (Workspaces)
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Profiles (Extends Supabase auth.users)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users(id) in Postgres
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  timezone: text("timezone").default("UTC"),
  notificationPrefs: jsonb("notification_prefs").default({}),
});

// 3. Agent Identities (Service accounts)
export const agentIdentities = pgTable("agent_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Memberships (Users and Agents in Workspaces)
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agentIdentities.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'owner' | 'admin' | 'member' | 'viewer' | 'agent'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_memberships_org").on(table.organizationId),
  ]
);

// 5. Projects
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    objective: text("objective"),
    ownerId: uuid("owner_id").references(() => profiles.id),
    status: text("status").default("planning").notNull(), // 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
    health: text("health").default("on_track"), // 'on_track' | 'at_risk' | 'blocked'
    healthReason: text("health_reason"),
    priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
    startDate: date("start_date"),
    targetDate: date("target_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_projects_org_status").on(table.organizationId, table.status),
  ]
);

// 6. Project Members
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
  ]
);

// 7. Workstreams
export const workstreams = pgTable("workstreams", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Milestones
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => profiles.id),
    targetDate: date("target_date"),
    status: text("status").default("upcoming"), // 'upcoming' | 'active' | 'completed' | 'at_risk'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_milestones_project").on(table.projectId),
  ]
);

// 9. Tasks (Doubles as Subtasks via parentTaskId)
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workstreamId: uuid("workstream_id").references(() => workstreams.id, { onDelete: "set null" }),
    parentTaskId: uuid("parent_task_id").references((): any => tasks.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    taskType: text("task_type").default("task"), // 'task' | 'feature' | 'bug' | 'research' | 'idea' | 'decision' | 'request'
    status: text("status").default("backlog").notNull(), // 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'
    priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
    creatorId: uuid("creator_id").references(() => profiles.id),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    customProperties: jsonb("custom_properties").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_tasks_project_status").on(table.projectId, table.status),
    index("idx_tasks_due_date").on(table.dueDate),
    index("idx_tasks_parent").on(table.parentTaskId),
    index("idx_tasks_milestone").on(table.milestoneId),
  ]
);

// 10. Task Assignees
export const taskAssignees = pgTable(
  "task_assignees",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.userId] }),
    index("idx_task_assignees_user").on(table.userId),
  ]
);

// 11. Task Dependencies (Acyclic Graph)
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockingTaskId: uuid("blocking_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    blockedTaskId: uuid("blocked_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("unique_dependency").on(table.blockingTaskId, table.blockedTaskId),
    index("idx_deps_blocking").on(table.blockingTaskId),
    index("idx_deps_blocked").on(table.blockedTaskId),
  ]
);

// 12. Tags
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [
    unique("unique_org_tag").on(table.organizationId, table.name),
  ]
);

// 13. Task Tags
export const taskTags = pgTable(
  "task_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.tagId] }),
  ]
);

// 14. Project Tags
export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.tagId] }),
  ]
);

// 15. Comments
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // 'project' | 'task' | 'milestone'
    entityId: uuid("entity_id").notNull(),
    authorUserId: uuid("author_user_id").references(() => profiles.id),
    authorAgentId: uuid("author_agent_id").references(() => agentIdentities.id),
    content: text("content").notNull(),
    mentions: uuid("mentions").array().default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_entity").on(table.entityType, table.entityId),
  ]
);

// 16. Activity Events (Audit trail for all mutations)
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => profiles.id),
    actorAgentId: uuid("actor_agent_id").references(() => agentIdentities.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_activity_org_created").on(table.organizationId, table.createdAt),
    index("idx_activity_entity").on(table.entityType, table.entityId),
  ]
);

// 17. Reports
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(), // 'daily' | 'weekly' | 'project' | 'portfolio'
    scopeId: uuid("scope_id"),
    content: jsonb("content").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reports_org_type_date").on(table.organizationId, table.reportType, table.generatedAt),
  ]
);

// 18. Automations
export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: jsonb("trigger").notNull(),
  condition: jsonb("condition"),
  action: jsonb("action").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 19. API Keys
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  hashedKey: text("hashed_key").notNull(),
  scopes: text("scopes").array().default(sql`'{}'`),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 20. Webhook Subscriptions
export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: text("events").array().notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Inferred TypeScript Types
export type Organization = typeof organizations.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type AgentIdentity = typeof agentIdentities.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Workstream = typeof workstreams.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Automation = typeof automations.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
