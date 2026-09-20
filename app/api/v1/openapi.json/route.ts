import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
    "https://operion-ai-project-management.vercel.app";

  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Operion AI-Native Project Management API",
      description:
        "Autonomous project management operating system API exposing projects, milestones, tasks, blocker detection, and AI operations for external agents (ChatGPT Custom GPTs, Claude, Gemini).",
      version: "1.0.0",
      contact: {
        name: "Operion Support",
        url: host,
      },
    },
    servers: [
      {
        url: host,
        description: "Operion Production Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Enter your Operion API Key generated from Settings -> API Keys for External Agents",
        },
        WorkspaceHeader: {
          type: "apiKey",
          in: "header",
          name: "x-organization-id",
          description: "Optional organization / workspace ID header",
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      "/api/v1/projects": {
        get: {
          summary: "List all projects in workspace",
          operationId: "listProjects",
          description: "Returns an array of all active and archived projects with aggregate health metrics.",
          responses: {
            "200": {
              description: "List of projects",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        objective: { type: "string" },
                        status: { type: "string", enum: ["active", "paused", "completed", "archived"] },
                        health: { type: "string", enum: ["on_track", "at_risk", "blocked"] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create a new project",
          operationId: "createProject",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    objective: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    status: { type: "string", enum: ["active", "paused"] },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Project created successfully" },
          },
        },
      },
      "/api/v1/tasks": {
        get: {
          summary: "List tasks",
          operationId: "listTasks",
          parameters: [
            {
              name: "projectId",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter tasks by Project UUID",
            },
            {
              name: "status",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["backlog", "todo", "in_progress", "blocked", "done"] },
            },
          ],
          responses: {
            "200": { description: "List of tasks" },
          },
        },
        post: {
          summary: "Create a task",
          operationId: "createTask",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["projectId", "title"],
                  properties: {
                    projectId: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    status: { type: "string", enum: ["backlog", "todo", "in_progress", "blocked", "done"] },
                    dueDate: { type: "string", format: "date" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Task created successfully" },
          },
        },
      },
      "/api/v1/tasks/{id}": {
        patch: {
          summary: "Update task or status",
          operationId: "updateTask",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    status: { type: "string", enum: ["backlog", "todo", "in_progress", "blocked", "done"] },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Task updated" },
          },
        },
      },
      "/api/v1/search": {
        get: {
          summary: "Full-text search across projects and tasks",
          operationId: "searchWorkspace",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Search keywords or title",
            },
          ],
          responses: {
            "200": { description: "Matched search results" },
          },
        },
      },
      "/api/v1/reports/daily": {
        get: {
          summary: "Generate daily workspace progress report",
          operationId: "getDailyReport",
          responses: {
            "200": { description: "Daily executive summary and metrics" },
          },
        },
      },
      "/api/mcp": {
        post: {
          summary: "Model Context Protocol (MCP) JSON-RPC Endpoint",
          operationId: "callMcpMethod",
          description:
            "Executes MCP 2024-11-05 protocol methods (tools/list, tools/call, resources/list, resources/read).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jsonrpc", "method"],
                  properties: {
                    jsonrpc: { type: "string", example: "2.0" },
                    id: { type: "integer", example: 1 },
                    method: { type: "string", example: "tools/call" },
                    params: {
                      type: "object",
                      properties: {
                        name: { type: "string", example: "planProject" },
                        arguments: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "MCP JSON-RPC response" },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
