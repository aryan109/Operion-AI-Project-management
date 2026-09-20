import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { organizations } from "@/lib/db/schema";
import * as reportService from "@/lib/domain/report.service";

export async function GET(req: NextRequest) {
  try {
    const orgs = await db.select({ id: organizations.id }).from(organizations);
    const reportsGenerated: any[] = [];

    for (const org of orgs) {
      const ctx = {
        organizationId: org.id,
        actor: { type: "agent" as const, id: "cron-reporter", role: "admin" as const },
      };
      const res = await reportService.generateDailyReport(ctx);
      if (res.ok) {
        reportsGenerated.push(res.data.id);
      }
    }

    return NextResponse.json({
      status: "completed",
      reportsCount: reportsGenerated.length,
      reports: reportsGenerated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
