import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as projectService from "@/lib/domain/project.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { id } = await params;
  let newName: string | undefined;
  try {
    const body = await req.json();
    newName = body.name;
  } catch {
    // Body is optional
  }

  const res = await projectService.duplicateProject(auth.data, id, newName);
  return handleResult(res, 201);
}
