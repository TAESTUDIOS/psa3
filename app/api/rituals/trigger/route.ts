// app/api/rituals/trigger/route.ts
// Server-side proxy to invoke a ritual's n8n webhook to avoid browser CORS issues.
// POST { ritualId, action?, context?, tone? }

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureRitualsTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    webhook TEXT NOT NULL DEFAULT '',
    trigger_cfg JSONB NOT NULL,
    buttons JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ritualId = String(body?.ritualId || "").trim();
    const action = body?.action as string | undefined;
    const context = body?.context as unknown;
    const tone = body?.tone as string | undefined;

    if (!ritualId) {
      return NextResponse.json({ ok: false, error: "ritualId required" }, { status: 400 });
    }

    // Special-case: hardcoded Morning ritual handled internally
    if (ritualId === "morning") {
      // Forward to local /api/morning with same payload
      const res = await fetch(new URL("/api/morning", process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualId, action, context, tone, ts: Date.now() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ ok: false, status: res.status, error: data?.error || "internal morning error" }, { status: 502 });
      }
      return NextResponse.json({ ok: true, ...data });
    }

    // Resolve webhook/buttons from DB if possible; else fall back to request body
    let webhook: string | undefined = undefined;
    let buttons: string[] | undefined = undefined;
    try {
      await ensureRitualsTable();
      const sql = getDb();
      const rows = await sql`SELECT id, name, webhook, buttons FROM rituals WHERE id = ${ritualId} LIMIT 1`;
      const rit = rows[0];
      if (rit) {
        webhook = rit.webhook || undefined;
        buttons = Array.isArray(rit.buttons) ? rit.buttons : undefined;
      }
    } catch {
      // DB not configured; proceed with client-provided fields
    }

    // Allow client to provide webhook/buttons when DB is not available or ritual not found
    if (!webhook && typeof body?.webhook === "string") webhook = body.webhook;
    if (!buttons && Array.isArray(body?.buttons)) buttons = body.buttons as string[];

    if (!webhook) {
      // No webhook configured -> return a local mock so UX still works
      const text = action
        ? `Action '${action}' received for ritual '${ritualId}' (mock).`
        : `Started ritual '${ritualId}' (mock).`;
      return NextResponse.json({ ok: true, text, buttons: buttons ?? [] });
    }

    // Invoke webhook from the server to avoid browser CORS
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ritualId, action, context, tone, ts: Date.now() }),
    });

    // Forward status and JSON content
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, error: data?.error || "webhook error" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
