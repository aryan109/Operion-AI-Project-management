import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as projectService from "@/lib/domain/project.service";
import { createProjectSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { searchParams } = new URL(req.url);
  const isPortfolio = searchParams.get("portfolio") === "true";

  if (isPortfolio) {
    const aggRes = await projectService.getPortfolioAggregate(auth.data);
    return handleResult(aggRes);
  }

  const status = searchParams.get("status") || undefined;
  const health = searchParams.get("health") || undefined;

  const res = await projectService.listProjects(auth.data, { status, health });
  return handleResult(res);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return handleResult({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid project input", details: parsed.error.format() },
    });
  }

  const res = await projectService.createProject(auth.data, parsed.data);
  return handleResult(res, 201);
}
