import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { webhookSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { organizationId, event, data } = await req.json();

    const subs = await db
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.organizationId, organizationId),
          eq(webhookSubscriptions.isActive, true)
        )
      );

    const matching = subs.filter((s) => s.events.includes(event) || s.events.includes("*"));

    const dispatched: string[] = [];
    for (const sub of matching) {
      fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operion-Event": event,
          "X-Operion-Signature": sub.secret,
        },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
      }).catch((e) => console.error(`Failed to dispatch webhook to ${sub.url}:`, e));
      dispatched.push(sub.url);
    }

    return NextResponse.json({ dispatchedCount: dispatched.length, urls: dispatched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
