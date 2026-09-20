import { NextRequest } from "next/server";
import { authenticateRequest, handleResult } from "@/lib/api/helper";
import * as searchService from "@/lib/domain/search.service";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return handleResult(auth);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const res = await searchService.search(auth.data, q);
  return handleResult(res);
}
