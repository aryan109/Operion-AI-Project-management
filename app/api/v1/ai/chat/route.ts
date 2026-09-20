import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api/helper";
import { aiClient } from "@/lib/ai/client";
import * as projectService from "@/lib/domain/project.service";
import * as taskService from "@/lib/domain/task.service";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error.message },
      { status: 401 }
    );
  }
  const ctx = auth.data;

  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 1. Gather live workspace context
    const projectsRes = await projectService.listProjects(ctx);
    const projects = projectsRes.ok ? projectsRes.data : [];

    const todayRes = await taskService.getTodayView(ctx);
    const blockers = todayRes.ok ? todayRes.data.blocked || [] : [];
    const overdue = todayRes.ok ? todayRes.data.overdue || [] : [];

    // Summarize workspace context for grounded AI response
    const workspaceSummary = `
Workspace Context:
- Active Projects (${projects.length}):
${projects.slice(0, 10).map((p) => `  * ${p.name} [Health: ${p.health}, Status: ${p.status}]`).join("\n") || "  * No projects yet."}

- Currently Blocked Tasks (${blockers.length}):
${blockers.slice(0, 8).map((b: any) => `  * [BLOCKED] ${b.title} (Project: ${b.projectName || "General"})`).join("\n") || "  * Zero blocked tasks."}
`.trim();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: `You are Operion AI, an expert autonomous project management operator.
You have real-time access to the user's workspace.
Here is the current ground-truth workspace state:
${workspaceSummary}

Instructions:
- Provide concise, actionable, and insightful answers.
- If recommending actions or analyzing progress, reference specific projects or tasks from the workspace when relevant.
- Keep formatting clean using markdown.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const answer = await aiClient.complete(prompt, { messages, temperature: 0.3 });
    const providerInfo = aiClient.getProviderInfo();

    return NextResponse.json({
      ok: true,
      answer,
      provider: providerInfo.provider,
      model: providerInfo.model,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to process AI query" },
      { status: 500 }
    );
  }
}
