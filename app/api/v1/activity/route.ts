import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as activityService from "@/lib/domain/activity.service";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

  const res = await activityService.listActivity(auth.data, { entityType, entityId, limit });
  return handleResult(res);
}
