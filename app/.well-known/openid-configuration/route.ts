import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_HOSTED_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}` ||
    "https://operion-ai-project-management.vercel.app";

  return NextResponse.json(
    {
      issuer: host,
      authorization_endpoint: `${host}/api/oauth/authorize`,
      token_endpoint: `${host}/api/oauth/token`,
      userinfo_endpoint: `${host}/api/oauth/userinfo`,
      jwks_uri: `${host}/.well-known/jwks.json`,
      authorization_response_iss_parameter_supported: true,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
      code_challenge_methods_supported: ["S256"],
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256", "none"],
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
      claims_supported: ["sub", "iss", "name", "email", "email_verified", "org_id"],
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
