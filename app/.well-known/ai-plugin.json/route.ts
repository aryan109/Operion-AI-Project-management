import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
    "https://operion-ai-project-management.vercel.app";

  return NextResponse.json(
    {
      schema_version: "v1",
      name_for_human: "Operion Project OS",
      name_for_model: "operion_project_os",
      description_for_human:
        "Autonomous AI-native project management operating system. Plan, inspect blockers, track deliverables, and run project actions.",
      description_for_model:
        "Operion provides full project management workspace access. Use to list projects, inspect dependency blockers, create milestones, manage tasks, and autonomously dispatch project operations.",
      auth: {
        type: "oauth",
        client_url: `${host}/api/oauth/authorize`,
        scope: "projects:read projects:write tasks:read tasks:write reports:read mcp",
        authorization_url: `${host}/api/oauth/token`,
        authorization_content_type: "application/x-www-form-urlencoded",
        verification_tokens: {},
      },
      api: {
        type: "openapi",
        url: `${host}/api/v1/openapi.json`,
      },
      logo_url: `${host}/logo.png`,
      contact_email: "support@operion.ai",
      legal_info_url: `${host}/terms`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
