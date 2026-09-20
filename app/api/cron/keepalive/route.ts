import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const result = await db.execute(sql`SELECT 1 as keepalive, now();`);
    return NextResponse.json({
      status: "alive",
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
