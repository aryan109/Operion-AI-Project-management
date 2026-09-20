import { NextRequest, NextResponse } from "next/server";
import { authCodesStore } from "@/lib/oauth/store";
import { getDefaultContext } from "@/lib/api/helper";
import * as apiKeyService from "@/lib/domain/api-key.service";
import crypto from "crypto";

function base64UrlSha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("base64url");
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    }

    const code = body.code || "";
    const codeVerifier = body.code_verifier || "";
    const clientId = body.client_id || "claude";

    if (!code) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing authorization code" },
        { status: 400 }
      );
    }

    const storedAuth = authCodesStore.get(code);
    if (!storedAuth) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Authorization code invalid or expired" },
        { status: 400 }
      );
    }

    // Check TTL (10 minutes)
    if (Date.now() - storedAuth.createdAt > 10 * 60 * 1000) {
      authCodesStore.delete(code);
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Authorization code has expired" },
        { status: 400 }
      );
    }

    // Verify PKCE code_challenge if provided
    if (storedAuth.codeChallenge && codeVerifier) {
      const computedChallenge = base64UrlSha256(codeVerifier);
      if (computedChallenge !== storedAuth.codeChallenge) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "PKCE verification failed" },
          { status: 400 }
        );
      }
    }

    // Consume code (one-time use)
    authCodesStore.delete(code);

    // Create an authenticated workspace API key
    const ctx = await getDefaultContext();
    const keyRes = await apiKeyService.createApiKey(ctx, {
      name: `${clientId.toUpperCase()} Connector (OAuth)`,
      scopes: ["*"],
    });

    if (!keyRes.ok) {
      return NextResponse.json(
        { error: "server_error", error_description: keyRes.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: keyRes.data.apiKey,
      token_type: "Bearer",
      expires_in: 31536000,
      scope: "projects tasks reports mcp",
      organization_id: ctx.organizationId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", error_description: err.message },
      { status: 500 }
    );
  }
}
