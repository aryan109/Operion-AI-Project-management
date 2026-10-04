import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api/helper";
import * as workspaceService from "@/lib/domain/workspace.service";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: auth.error.message || "Invalid or missing access token",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer error="invalid_token"',
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const ctx = auth.data;
  const orgRes = await workspaceService.getOrganization(ctx);
  const org = orgRes.ok ? orgRes.data : { name: "Operion HQ", slug: "operion" };

  return NextResponse.json(
    {
      sub: ctx.actor.id,
      name: `${org.name} Agent`,
      preferred_username: "operion_agent",
      email: `agent@${org.slug || "operion"}.app`,
      email_verified: true,
      roles: [ctx.actor.role],
      organization: {
        id: ctx.organizationId,
        name: org.name,
        slug: org.slug,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
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
