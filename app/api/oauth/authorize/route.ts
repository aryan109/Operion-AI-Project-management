import { NextRequest, NextResponse } from "next/server";
import { getDefaultContext } from "@/lib/api/helper";
import * as workspaceService from "@/lib/domain/workspace.service";
import { authCodesStore } from "@/lib/oauth/store";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const clientId = searchParams.get("client_id") || "claude";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";

  const ctx = await getDefaultContext();
  const orgRes = await workspaceService.getOrganization(ctx);
  const orgName = orgRes.ok ? orgRes.data.name : "Operion HQ";

  // Render high-polish glassmorphic consent page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Operion Access</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body {
      background: radial-gradient(circle at 50% 20%, #16182a, #090a10 80%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: rgba(18, 22, 36, 0.85);
      border: 1px solid rgba(99, 102, 241, 0.25);
      backdrop-filter: blur(16px);
      border-radius: 1.5rem;
      padding: 2.25rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.75rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    h1 { font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
    p { font-size: 0.825rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
    .scope-box {
      background: rgba(10, 14, 26, 0.8);
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 1rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .scope-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 0.5rem; }
    .scope-item:last-child { margin-bottom: 0; }
    .check { color: #34d399; font-weight: bold; }
    .btn {
      width: 100%;
      padding: 0.85rem 1.25rem;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: none;
      color: white;
      font-weight: 700;
      font-size: 0.875rem;
      border-radius: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn:hover { background: linear-gradient(135deg, #4f46e5, #4338ca); transform: translateY(-1px); }
    .cancel {
      display: block;
      text-align: center;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: #64748b;
      text-decoration: none;
    }
    .cancel:hover { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span>●</span> OAuth 2.0 Authorization
    </div>
    <h1>Connect to ${orgName}</h1>
    <p><strong>${clientId.toUpperCase()}</strong> is requesting permission to autonomously read and manage projects in your Operion workspace.</p>

    <div class="scope-box">
      <div class="scope-item"><span class="check">✓</span> <span>Read and query projects & milestones</span></div>
      <div class="scope-item"><span class="check">✓</span> <span>Create and assign tasks & subtasks</span></div>
      <div class="scope-item"><span class="check">✓</span> <span>Query dependency graphs & blockers</span></div>
      <div class="scope-item"><span class="check">✓</span> <span>Execute Model Context Protocol (MCP) tools</span></div>
    </div>

    <form method="POST" action="/api/oauth/authorize">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">
      <input type="hidden" name="code_challenge" value="${codeChallenge}">
      <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
      <button type="submit" class="btn">Authorize & Connect</button>
    </form>
    <a href="${redirectUri ? `${redirectUri}?error=access_denied&state=${state}` : '#'}" class="cancel">Cancel</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientId = formData.get("client_id")?.toString() || "claude";
    const redirectUri = formData.get("redirect_uri")?.toString() || "";
    const state = formData.get("state")?.toString() || "";
    const codeChallenge = formData.get("code_challenge")?.toString() || "";
    const codeChallengeMethod = formData.get("code_challenge_method")?.toString() || "S256";

    const ctx = await getDefaultContext();
    const code = `opc_${crypto.randomBytes(24).toString("base64url")}`;

    authCodesStore.set(code, {
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      orgId: ctx.organizationId,
      createdAt: Date.now(),
    });

    if (!redirectUri) {
      return NextResponse.json({
        ok: true,
        code,
        state,
        message: "Authorization granted. Redirect URI was not specified.",
      });
    }

    const redirectTarget = new URL(redirectUri);
    redirectTarget.searchParams.set("code", code);
    if (state) redirectTarget.searchParams.set("state", state);

    return NextResponse.redirect(redirectTarget.toString(), 302);
  } catch (err: any) {
    return NextResponse.json(
      { error: "authorization_failed", message: err.message },
      { status: 500 }
    );
  }
}
