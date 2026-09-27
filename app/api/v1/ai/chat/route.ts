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
    const incomingMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
      Array.isArray(body.messages) ? body.messages : [];
    const shouldStream = Boolean(body.stream);

    if (!prompt && incomingMessages.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Prompt or messages array is required" },
        { status: 400 }
      );
    }

    const latestPrompt =
      prompt ||
      incomingMessages[incomingMessages.length - 1]?.content ||
      "";

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

- Overdue Tasks (${overdue.length}):
${overdue.slice(0, 5).map((o: any) => `  * [OVERDUE] ${o.title} (Due: ${o.dueDate})`).join("\n") || "  * Zero overdue tasks."}
`.trim();

    const systemMessage = {
      role: "system" as const,
      content: `You are Operion AI, an expert autonomous project management operator.
You have real-time access to the user's workspace.
Here is the current ground-truth workspace state:
${workspaceSummary}

Instructions:
- Provide concise, actionable, and insightful answers.
- If recommending actions or analyzing progress, reference specific projects or tasks from the workspace when relevant.
- Keep formatting clean using markdown.`,
    };

    // Build multi-turn context
    const conversationMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      systemMessage,
    ];

    if (incomingMessages.length > 0) {
      // Filter out any client system messages to prevent system prompt injection
      const sanitizedHistory = incomingMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10); // Maintain last 10 turns for context budget
      conversationMessages.push(...sanitizedHistory);
    } else {
      conversationMessages.push({ role: "user", content: latestPrompt });
    }

    const providerInfo = aiClient.getProviderInfo();

    // 2. Stream response if requested
    if (shouldStream) {
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const token of aiClient.stream(latestPrompt, {
              messages: conversationMessages,
              temperature: 0.3,
            })) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token, provider: providerInfo.provider })}\n\n`)
              );
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err: any) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    // 3. Standard JSON response
    const answer = await aiClient.complete(latestPrompt, {
      messages: conversationMessages,
      temperature: 0.3,
    });

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
