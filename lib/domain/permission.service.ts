import { Context, Role } from "./context";

export type PermissionAction =
  | "read"
  | "create_task"
  | "edit_task"
  | "delete_task"
  | "create_project"
  | "edit_project"
  | "delete_project"
  | "archive_project"
  | "manage_members"
  | "manage_workstreams"
  | "manage_milestones"
  | "manage_dependencies"
  | "add_comment"
  | "generate_reports"
  | "manage_automations"
  | "manage_api_keys";

const rolePermissions: Record<Role, Set<PermissionAction>> = {
  owner: new Set([
    "read",
    "create_task",
    "edit_task",
    "delete_task",
    "create_project",
    "edit_project",
    "delete_project",
    "archive_project",
    "manage_members",
    "manage_workstreams",
    "manage_milestones",
    "manage_dependencies",
    "add_comment",
    "generate_reports",
    "manage_automations",
    "manage_api_keys",
  ]),
  admin: new Set([
    "read",
    "create_task",
    "edit_task",
    "delete_task",
    "create_project",
    "edit_project",
    "delete_project",
    "archive_project",
    "manage_members",
    "manage_workstreams",
    "manage_milestones",
    "manage_dependencies",
    "add_comment",
    "generate_reports",
    "manage_automations",
    "manage_api_keys",
  ]),
  member: new Set([
    "read",
    "create_task",
    "edit_task",
    "delete_task",
    "create_project",
    "edit_project",
    "manage_workstreams",
    "manage_milestones",
    "manage_dependencies",
    "add_comment",
    "generate_reports",
  ]),
  viewer: new Set([
    "read",
    "generate_reports",
  ]),
  agent: new Set([
    "read",
    "create_task",
    "edit_task",
    "manage_workstreams",
    "manage_milestones",
    "manage_dependencies",
    "add_comment",
    "generate_reports",
  ]),
};

export function can(ctx: Context, action: PermissionAction): boolean {
  // If agent has custom permissions specified
  if (ctx.actor.type === "agent" && ctx.actor.permissions && ctx.actor.permissions.length > 0) {
    if (ctx.actor.permissions.includes("*") || ctx.actor.permissions.includes(action)) {
      return true;
    }
  }

  const allowed = rolePermissions[ctx.actor.role];
  if (!allowed) return false;
  return allowed.has(action);
}

export function assertPermission(ctx: Context, action: PermissionAction): void {
  if (!can(ctx, action)) {
    throw new Error(`Forbidden: Actor with role '${ctx.actor.role}' lacks permission for '${action}'`);
  }
}
