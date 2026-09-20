import { db } from "../db/client";
import { organizations, memberships, profiles, agentIdentities } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and } from "drizzle-orm";

export async function createOrganization(
  userId: string,
  input: { name: string; slug: string }
): Promise<Result<{ id: string; name: string; slug: string }>> {
  try {
    const [org] = await db
      .insert(organizations)
      .values({
        name: input.name,
        slug: input.slug,
      })
      .returning();

    // Make creator the owner in memberships
    await db.insert(memberships).values({
      organizationId: org.id,
      userId,
      role: "owner",
    });

    const ctx: Context = {
      organizationId: org.id,
      actor: { type: "user", id: userId, role: "owner" },
    };

    await activity.record(ctx, {
      entityType: "organization",
      entityId: org.id,
      action: "created",
      after: { name: org.name, slug: org.slug },
    });

    return ok(org);
  } catch (error: any) {
    if (error?.code === "23505") {
      return err("SLUG_TAKEN", "Organization slug is already in use");
    }
    return err("ORG_CREATE_FAILED", "Failed to create organization", error);
  }
}

export async function getOrganization(ctx: Context): Promise<Result<any>> {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId));

    if (!org) return err("NOT_FOUND", "Organization not found");
    return ok(org);
  } catch (error) {
    return err("ORG_FETCH_FAILED", "Failed to get organization", error);
  }
}

export async function updateOrganization(
  ctx: Context,
  input: { name?: string }
): Promise<Result<any>> {
  if (!can(ctx, "manage_members")) {
    return err("FORBIDDEN", "Only admins or owners can update workspace settings");
  }

  try {
    const [before] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId));

    if (!before) return err("NOT_FOUND", "Organization not found");

    const [updated] = await db
      .update(organizations)
      .set({
        ...(input.name ? { name: input.name } : {}),
      })
      .where(eq(organizations.id, ctx.organizationId))
      .returning();

    await activity.record(ctx, {
      entityType: "organization",
      entityId: updated.id,
      action: "updated",
      before: { name: before.name },
      after: { name: updated.name },
    });

    return ok(updated);
  } catch (error) {
    return err("ORG_UPDATE_FAILED", "Failed to update organization", error);
  }
}

export async function listMembers(ctx: Context): Promise<Result<any[]>> {
  try {
    const members = await db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        createdAt: memberships.createdAt,
        userId: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        agentId: agentIdentities.id,
        agentName: agentIdentities.name,
      })
      .from(memberships)
      .leftJoin(profiles, eq(memberships.userId, profiles.id))
      .leftJoin(agentIdentities, eq(memberships.agentId, agentIdentities.id))
      .where(eq(memberships.organizationId, ctx.organizationId));

    return ok(members);
  } catch (error) {
    return err("MEMBERS_FETCH_FAILED", "Failed to list organization members", error);
  }
}

export async function inviteMember(
  ctx: Context,
  input: { userId: string; role: "admin" | "member" | "viewer" }
): Promise<Result<any>> {
  if (!can(ctx, "manage_members")) {
    return err("FORBIDDEN", "Only admins or owners can invite members");
  }

  try {
    const [membership] = await db
      .insert(memberships)
      .values({
        organizationId: ctx.organizationId,
        userId: input.userId,
        role: input.role,
      })
      .returning();

    await activity.record(ctx, {
      entityType: "membership",
      entityId: membership.id,
      action: "member_added",
      after: { userId: input.userId, role: input.role },
    });

    return ok(membership);
  } catch (error) {
    return err("MEMBER_INVITE_FAILED", "Failed to invite member", error);
  }
}

export async function createAgentIdentity(
  ctx: Context,
  input: { name: string; description?: string; permissions?: Record<string, unknown> }
): Promise<Result<any>> {
  if (!can(ctx, "manage_members")) {
    return err("FORBIDDEN", "Only admins or owners can create agent identities");
  }

  try {
    const [agent] = await db
      .insert(agentIdentities)
      .values({
        organizationId: ctx.organizationId,
        name: input.name,
        description: input.description,
        permissions: input.permissions ?? {},
      })
      .returning();

    await db.insert(memberships).values({
      organizationId: ctx.organizationId,
      agentId: agent.id,
      role: "agent",
    });

    await activity.record(ctx, {
      entityType: "agent_identity",
      entityId: agent.id,
      action: "created",
      after: { name: agent.name },
    });

    return ok(agent);
  } catch (error) {
    return err("AGENT_CREATE_FAILED", "Failed to create agent identity", error);
  }
}
