import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as reportService from "@/lib/domain/report.service";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const res = await reportService.generateDailyReport(auth.data);
  return handleResult(res);
}
