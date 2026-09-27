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
    const action = body.action || "preview";

    if (action === "preview") {
      const { objective, projectName, constraints } = body;
      if (!objective?.trim()) {
        return NextResponse.json(
          { ok: false, error: "Objective is required for planning preview" },
          { status: 400 }
        );
      }

      const res = await aiDomainService.previewProjectPlan(ctx, {
        objective: objective.trim(),
        projectName: projectName?.trim(),
        constraints: constraints?.trim(),
      });

      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: res.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, plan: res.data });
    }

    if (action === "commit") {
      const { plan } = body;
      if (!plan || !plan.projectName || !Array.isArray(plan.tasks)) {
        return NextResponse.json(
          { ok: false, error: "Valid plan tree object is required for commit" },
          { status: 400 }
        );
      }

      const res = await aiDomainService.commitProjectPlan(ctx, plan);
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: res.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, ...res.data });
    }

    return NextResponse.json(
      { ok: false, error: `Invalid action "${action}". Use "preview" or "commit".` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to process plan request" },
      { status: 500 }
    );
  }
}
