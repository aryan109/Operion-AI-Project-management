import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api/helper";
import { MCP_TOOLS } from "@/mcp/tools";
import { MCP_RESOURCES, OPERION_SKILL_CONTENT } from "@/mcp/resources";
import * as activity from "@/lib/domain/activity.service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-organization-id, mcp-session-id",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      name: "operion-mcp-server",
      version: "1.0.0",
      description: "Operion AI-Native Project Management MCP Server",
      status: "online",
      transport: "streamable-http",
      protocolVersion: "2024-11-05",
      toolsCount: MCP_TOOLS.length,
      resourcesCount: MCP_RESOURCES.length,
      skills: [
        {
          name: "operion-project-os",
          uri: "skill://operion/operion-project-os/SKILL.md",
        },
      ],
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
    "https://operion-ai-project-management.vercel.app";

  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: auth.error.message } },
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "WWW-Authenticate": `Bearer resource_metadata="${host}/.well-known/oauth-protected-resource"`,
        },
      }
    );
  }
  const ctx = auth.data;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: corsHeaders }
    );
  }

  const { id, method, params } = body;

  try {
    // 1. Initialize
    if (method === "initialize") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: {},
              extensions: {
                "io.modelcontextprotocol/skills": {},
              },
            },
            serverInfo: {
              name: "operion-mcp-server",
              version: "1.0.0",
            },
            instructions:
              "Operion is an enterprise-grade AI-native project operating system. Use these tools to inspect workspaces, projects, milestones, tasks, dependencies, blockers, and generate reports. When orchestrating project planning, blocker analysis, or multi-step operations, adhere to the guidelines declared in skill://operion/operion-project-os/SKILL.md.",
          },
        },
        { headers: corsHeaders }
      );
    }

    // 2. Ping
    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} }, { headers: corsHeaders });
    }

    // 3. Skills Extension: List
    if (method === "skills/list") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            skills: [
              {
                name: "operion-project-os",
                title: "Operion Project OS",
                description:
                  "Autonomous project management workflows for software teams. Milestone decomposition, dependency resolution, blocker triage, and sprint execution.",
                uri: "skill://operion/operion-project-os/SKILL.md",
                mimeType: "text/markdown",
              },
            ],
          },
        },
        { headers: corsHeaders }
      );
    }

    // 4. Skills Extension: Get
    if (method === "skills/get") {
      const skillName = params?.name;
      const skillUri = params?.uri;

      if (
        (skillName && skillName !== "operion-project-os") ||
        (skillUri && skillUri !== "skill://operion/operion-project-os/SKILL.md")
      ) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: `Skill not found: ${skillName || skillUri}` },
          },
          { headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            skill: {
              name: "operion-project-os",
              title: "Operion Project OS",
              description:
                "Autonomous project management workflows for software teams. Milestone decomposition, dependency resolution, blocker triage, and sprint execution.",
              uri: "skill://operion/operion-project-os/SKILL.md",
              mimeType: "text/markdown",
              content: OPERION_SKILL_CONTENT,
            },
          },
        },
        { headers: corsHeaders }
      );
    }

    // 5. Tools List
    if (method === "tools/list") {
      const tools = MCP_TOOLS.map((t) => ({
        name: t.name,
        title: t.title || t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(t.annotations ? { annotations: t.annotations } : {}),
        ...(t._meta ? { _meta: t._meta } : {}),
      }));
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools } }, { headers: corsHeaders });
    }

    // 6. Tools Call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      const tool = MCP_TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: `Tool not found: ${toolName}` },
          },
          { headers: corsHeaders }
        );
      }

      // Execute tool
      const data = await tool.handler(ctx, args);

      // Audit log the tool execution (spec §72)
      await activity.record(ctx, {
        entityType: "mcp_tool",
        entityId: toolName,
        action: "executed",
        after: {
          arguments: args,
          resultSummary:
            typeof data === "object" && data !== null
              ? { id: (data as any).id, name: (data as any).name || (data as any).title }
              : undefined,
        },
      });

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
              },
            ],
            structuredContent: typeof data === "object" && data !== null ? data : { result: data },
          },
        },
        { headers: corsHeaders }
      );
    }

    // 7. Resources List
    if (method === "resources/list") {
      const resources = MCP_RESOURCES.map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      }));
      return NextResponse.json({ jsonrpc: "2.0", id, result: { resources } }, { headers: corsHeaders });
    }

    // 8. Resources Read
    if (method === "resources/read") {
      const uri = params?.uri;
      const resource = MCP_RESOURCES.find((r) => r.uri === uri);
      if (!resource) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: `Resource not found: ${uri}` },
          },
          { headers: corsHeaders }
        );
      }

      const content = await resource.handler(ctx);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: typeof content === "string" ? content : JSON.stringify(content, null, 2),
              },
            ],
          },
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: error.message || "Internal tool execution error",
        },
      },
      { headers: corsHeaders }
    );
  }
}

