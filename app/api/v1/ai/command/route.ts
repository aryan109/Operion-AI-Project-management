import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api/helper";
import * as aiDomainService from "@/lib/domain/ai.service";

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
    const command = body.command?.trim();

    if (!command) {
      return NextResponse.json(
        { ok: false, error: "Command string is required" },
        { status: 400 }
      );
    }

    const res = await aiDomainService.dispatchCommand(ctx, {
      command,
      projectId: body.projectId,
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      ...res.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to dispatch AI command" },
      { status: 500 }
    );
  }
}
