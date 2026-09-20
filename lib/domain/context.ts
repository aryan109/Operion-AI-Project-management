export type ActorType = "user" | "agent";

export type Role = "owner" | "admin" | "member" | "viewer" | "agent";

export interface Actor {
  type: ActorType;
  id: string; // userId or agentId
  role: Role;
  permissions?: string[];
}

export interface Context {
  organizationId: string;
  actor: Actor;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(code: string, message: string, details?: unknown): Result<T> {
  return { ok: false, error: { code, message, details } };
}
