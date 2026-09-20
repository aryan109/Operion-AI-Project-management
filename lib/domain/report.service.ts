import { db } from "../db/client";
import { reports, projects, tasks, milestones, activityEvents } from "../db/schema";
import { Context, Result, ok, err } from "./context";
import { can } from "./permission.service";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import * as projectService from "./project.service";
import * as taskService from "./task.service";

export async function generateDailyReport(ctx: Context): Promise<Result<any>> {
  if (!can(ctx, "generate_reports")) {
    return err("FORBIDDEN", "Not authorized to generate reports");
  }

  try {
    const todayViewRes = await taskService.getTodayView(ctx);
    const todayData = todayViewRes.ok ? todayViewRes.data : {};

    // Get today's activity events
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentEvents = await db
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.organizationId, ctx.organizationId),
          gte(activityEvents.createdAt, todayStart)
        )
      )
      .orderBy(desc(activityEvents.createdAt))
      .limit(50);

    const reportContent = {
      title: `Daily Standup & Activity Summary - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      summary: `Currently ${todayData.totalPending || 0} active tasks across workspace. ${todayData.blocked?.length || 0} tasks blocked, ${todayData.overdue?.length || 0} overdue.`,
      blockedTasks: todayData.blocked || [],
      dueTodayTasks: todayData.dueToday || [],
      overdueTasks: todayData.overdue || [],
      todayActivityCount: recentEvents.length,
      activityHighlights: recentEvents.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };

    const [savedReport] = await db
      .insert(reports)
      .values({
        organizationId: ctx.organizationId,
        reportType: "daily",
        content: reportContent,
      })
      .returning();

    return ok(savedReport);
  } catch (error) {
    return err("REPORT_GEN_FAILED", "Failed to generate daily report", error);
  }
}

export async function generatePortfolioReport(ctx: Context): Promise<Result<any>> {
  if (!can(ctx, "generate_reports")) {
    return err("FORBIDDEN", "Not authorized to generate reports");
  }

  try {
    const portfolioRes = await projectService.getPortfolioAggregate(ctx);
    if (!portfolioRes.ok) return portfolioRes;

    const portfolio = portfolioRes.data;
    const atRisk = portfolio.filter((p: any) => p.health === "at_risk");
    const blocked = portfolio.filter((p: any) => p.health === "blocked");
    const onTrack = portfolio.filter((p: any) => p.health === "on_track");

    const reportContent = {
      title: "Workspace Portfolio Health & Execution Review",
      totalProjects: portfolio.length,
      onTrackCount: onTrack.length,
      atRiskCount: atRisk.length,
      blockedCount: blocked.length,
      projects: portfolio,
      generatedAt: new Date().toISOString(),
    };

    const [savedReport] = await db
      .insert(reports)
      .values({
        organizationId: ctx.organizationId,
        reportType: "portfolio",
        content: reportContent,
      })
      .returning();

    return ok(savedReport);
  } catch (error) {
    return err("REPORT_GEN_FAILED", "Failed to generate portfolio report", error);
  }
}

export async function generateProjectReport(
  ctx: Context,
  projectId: string
): Promise<Result<any>> {
  try {
    const projRes = await projectService.getProject(ctx, projectId);
    if (!projRes.ok) return projRes;
    const project = projRes.data;

    const tasksRes = await taskService.listTasks(ctx, { projectId });
    const allTasks = tasksRes.ok ? tasksRes.data : [];

    const doneCount = allTasks.filter((t) => t.status === "done").length;
    const blockedCount = allTasks.filter((t) => t.status === "blocked").length;

    const content = {
      title: `Project Status Report: ${project.name}`,
      project,
      totalTasks: allTasks.length,
      completedTasks: doneCount,
      blockedTasks: blockedCount,
      progressPercent: allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0,
      tasks: allTasks,
      generatedAt: new Date().toISOString(),
    };

    const [savedReport] = await db
      .insert(reports)
      .values({
        organizationId: ctx.organizationId,
        reportType: "project",
        scopeId: projectId,
        content,
      })
      .returning();

    return ok(savedReport);
  } catch (error) {
    return err("PROJECT_REPORT_FAILED", "Failed to generate project report", error);
  }
}
