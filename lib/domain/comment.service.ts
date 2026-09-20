import { db } from "../db/client";
import { comments, profiles, agentIdentities } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import * as activity from "./activity.service";
import { eq, and, desc } from "drizzle-orm";

export interface AddCommentInput {
  entityType: "project" | "task" | "milestone";
  entityId: string;
  content: string;
  mentions?: string[];
}

export async function addComment(
  ctx: Context,
  input: AddCommentInput
): Promise<Result<any>> {
  if (!can(ctx, "add_comment")) {
    return err("FORBIDDEN", "Not authorized to post comments");
  }

  try {
    const [comment] = await db
      .insert(comments)
      .values({
        organizationId: ctx.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        authorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
        authorAgentId: ctx.actor.type === "agent" ? ctx.actor.id : null,
        content: input.content,
        mentions: input.mentions || [],
      })
      .returning();

    await activity.record(ctx, {
      entityType: input.entityType,
      entityId: input.entityId,
      action: "comment_added",
      after: { commentId: comment.id },
    });

    return ok(comment);
  } catch (error) {
    return err("COMMENT_CREATE_FAILED", "Failed to add comment", error);
  }
}

export async function listComments(
  ctx: Context,
  entityType: "project" | "task" | "milestone",
  entityId: string
): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        mentions: comments.mentions,
        authorUser: {
          id: profiles.id,
          fullName: profiles.fullName,
          avatarUrl: profiles.avatarUrl,
        },
        authorAgent: {
          id: agentIdentities.id,
          name: agentIdentities.name,
        },
      })
      .from(comments)
      .leftJoin(profiles, eq(comments.authorUserId, profiles.id))
      .leftJoin(agentIdentities, eq(comments.authorAgentId, agentIdentities.id))
      .where(
        and(
          eq(comments.organizationId, ctx.organizationId),
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      )
      .orderBy(comments.createdAt);

    return ok(rows);
  } catch (error) {
    return err("COMMENTS_FETCH_FAILED", "Failed to list comments", error);
  }
}
