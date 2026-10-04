import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
    "https://operion-ai-project-management.vercel.app";

  return NextResponse.json(
    {
      resource: host,
      authorization_servers: [host],
      scopes_supported: [
        "openid",
        "profile",
        "email",
        "projects:read",
        "projects:write",
        "tasks:read",
        "tasks:write",
        "reports:read",
        "mcp",
      ],
      resource_documentation: `${host}/connectors`,
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
      "Access-Control-Allow-Headers": "Authorization, Content-Type, x-organization-id",
    },
  });
}
