import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api/helper";
import { MCP_TOOLS } from "@/mcp/tools";
import { MCP_RESOURCES } from "@/mcp/resources";
import * as activity from "@/lib/domain/activity.service";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: "operion-mcp-server",
    version: "1.0.0",
    description: "Operion AI-Native Project Management MCP Server",
    status: "online",
    toolsCount: MCP_TOOLS.length,
    resourcesCount: MCP_RESOURCES.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: auth.error.message } },
      { status: 401 }
    );
  }
  const ctx = auth.data;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const { id, method, params } = body;

  try {
    // 1. Initialize
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: "operion-mcp-server",
            version: "1.0.0",
          },
        },
      });
    }

    // 2. Ping
    if (method === "ping") {
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} });
    }

    // 3. Tools List
    if (method === "tools/list") {
      const tools = MCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
      return NextResponse.json({ jsonrpc: "2.0", id, result: { tools } });
    }

    // 4. Tools Call
    if (method === "tools/call") {
      const toolName = params?.name;
      const args = params?.arguments || {};

      const tool = MCP_TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        });
      }

      // Execute tool
      const data = await tool.handler(ctx, args);

      // Audit log the tool execution (spec §72)
      await activity.record(ctx, {
        entityType: "mcp_tool",
        entityId: toolName,
        action: "executed",
        after: { arguments: args },
      });

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
          ],
        },
      });
    }

    // 5. Resources List
    if (method === "resources/list") {
      const resources = MCP_RESOURCES.map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
        description: r.description,
      }));
      return NextResponse.json({ jsonrpc: "2.0", id, result: { resources } });
    }

    // 6. Resources Read
    if (method === "resources/read") {
      const uri = params?.uri;
      const resource = MCP_RESOURCES.find((r) => r.uri === uri);
      if (!resource) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: `Resource not found: ${uri}` },
        });
      }

      const content = await resource.handler(ctx);
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: JSON.stringify(content, null, 2),
            },
          ],
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (error: any) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error.message || "Internal tool execution error",
      },
    });
  }
}
