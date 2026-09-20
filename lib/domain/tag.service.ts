import { db } from "../db/client";
import { tags, taskTags, projectTags } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { eq, and } from "drizzle-orm";

export async function createTag(ctx: Context, name: string): Promise<Result<any>> {
  try {
    const [tag] = await db
      .insert(tags)
      .values({
        organizationId: ctx.organizationId,
        name: name.trim().toLowerCase(),
      })
      .onConflictDoNothing()
      .returning();

    if (!tag) {
      const [existing] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.organizationId, ctx.organizationId), eq(tags.name, name.trim().toLowerCase())));
      return ok(existing);
    }

    return ok(tag);
  } catch (error) {
    return err("TAG_CREATE_FAILED", "Failed to create tag", error);
  }
}

export async function listTags(ctx: Context): Promise<Result<any[]>> {
  try {
    const rows = await db
      .select()
      .from(tags)
      .where(eq(tags.organizationId, ctx.organizationId));
    return ok(rows);
  } catch (error) {
    return err("TAG_LIST_FAILED", "Failed to list tags", error);
  }
}

export async function attachTagToTask(taskId: string, tagId: string): Promise<Result<boolean>> {
  try {
    await db.insert(taskTags).values({ taskId, tagId }).onConflictDoNothing();
    return ok(true);
  } catch (error) {
    return err("ATTACH_TAG_FAILED", "Failed to attach tag to task", error);
  }
}

export async function detachTagFromTask(taskId: string, tagId: string): Promise<Result<boolean>> {
  try {
    await db.delete(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));
    return ok(true);
  } catch (error) {
    return err("DETACH_TAG_FAILED", "Failed to detach tag from task", error);
  }
}
