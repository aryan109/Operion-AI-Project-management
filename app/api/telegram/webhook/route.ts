import { NextRequest, NextResponse } from "next/server";
import { Bot, webhookCallback } from "grammy";
import { Context } from "@/lib/domain/context";
import * as taskService from "@/lib/domain/task.service";
import * as projectService from "@/lib/domain/project.service";
import { aiClient } from "@/lib/ai/client";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const token = process.env.TELEGRAM_BOT_TOKEN || "mock_token";
const bot = new Bot(token);

// Helper to get default workspace context for Telegram bot
async function getTelegramContext(): Promise<Context> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(1);

  return {
    organizationId: org?.id || "00000000-0000-0000-0000-000000000001",
    actor: {
      type: "agent",
      id: "telegram-bot",
      role: "admin",
    },
  };
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Welcome to Operion AI Project Management!\n\nCommands:\n/today - Today's priorities & overdue items\n/mywork - Your assigned deliverables\n/blocked - Currently blocked tasks\n/projects - Active projects overview\n\nOr send any message to plan projects, ask questions, or extract tasks."
  );
});

bot.command("today", async (ctx) => {
  const opCtx = await getTelegramContext();
  const res = await taskService.getTodayView(opCtx);
  if (!res.ok) {
    return ctx.reply("Error fetching Today view: " + res.error.message);
  }
  const data = res.data;
  const msg = [
    `📅 *Today's Cockpit*`,
    `Due Today: ${data.dueToday.length}`,
    `Overdue: ${data.overdue.length}`,
    `Blocked: ${data.blocked.length}`,
    `High Priority: ${data.highPriority.length}`,
  ].join("\n");
  await ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.command("blocked", async (ctx) => {
  const opCtx = await getTelegramContext();
  const res = await taskService.getTodayView(opCtx);
  if (!res.ok) return ctx.reply("Error: " + res.error.message);

  const blocked = res.data.blocked;
  if (blocked.length === 0) {
    return ctx.reply("🎉 No blocked tasks across the workspace!");
  }

  const lines = blocked.map((t: any) => `• [${t.projectName}] *${t.title}*`);
  await ctx.reply(`🚫 *Blocked Tasks (${blocked.length})*:\n\n` + lines.join("\n"), { parse_mode: "Markdown" });
});

bot.command("projects", async (ctx) => {
  const opCtx = await getTelegramContext();
  const res = await projectService.getPortfolioAggregate(opCtx);
  if (!res.ok) return ctx.reply("Error: " + res.error.message);

  const projects = res.data;
  if (projects.length === 0) return ctx.reply("No projects found.");

  const lines = projects.map((p: any) => `• *${p.name}* (${p.health}) - ${p.progressPercent}% complete`);
  await ctx.reply(`📁 *Active Projects*:\n\n` + lines.join("\n"), { parse_mode: "Markdown" });
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const opCtx = await getTelegramContext();
  const portfolioRes = await projectService.getPortfolioAggregate(opCtx);
  const contextData = portfolioRes.ok ? portfolioRes.data : [];

  const reply = await aiClient.complete(
    `User asked: "${text}"\n\nCurrent Project Management Context:\n${JSON.stringify(contextData)}\n\nProvide a concise, helpful response or recommendation as Operion AI.`
  );

  await ctx.reply(reply);
});

export async function POST(req: NextRequest) {
  try {
    const handler = webhookCallback(bot, "std/http");
    return await handler(req);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
