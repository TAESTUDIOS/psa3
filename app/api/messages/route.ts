// app/api/messages/route.ts
// GET last 100 messages; POST append. Neon Postgres-backed with 100 cap.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    ritual_id TEXT,
    buttons JSONB,
    metadata JSONB,
    timestamp_ms BIGINT NOT NULL
  )`;
}

export async function DELETE() {
  try {
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM messages`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, role, text, ritual_id, buttons, metadata, timestamp_ms FROM messages ORDER BY timestamp_ms DESC LIMIT 100`;
    const messages = rows
      .map((r: any) => ({ id: r.id, role: r.role, text: r.text, ritualId: r.ritual_id || undefined, buttons: r.buttons || [], metadata: r.metadata || {}, timestamp: Number(r.timestamp_ms) }))
      .reverse();
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sql = getDb();
    await ensureTable();

    const incomingRole = body?.role as string | undefined; // e.g., 'user' | 'assistant' | 'ritual'
    const incomingText: string | undefined = body?.text;
    const incomingTs: number = Number(body?.timestamp) || Date.now();
    const incomingRitualId: string | undefined = body?.ritualId;
    const incomingButtons: unknown = Array.isArray(body?.buttons) ? body.buttons : undefined;
    const incomingMetadata: unknown = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;
    const buttonsJson: string | null = incomingButtons ? JSON.stringify(incomingButtons) : null;
    const metadataJson: string | null = incomingMetadata ? JSON.stringify(incomingMetadata as any) : null;
    const echo: boolean = body?.echo !== false; // default true

    // If a role+text provided, persist that message first
    if (incomingRole && incomingText) {
      const id = body?.id || uid("m");
      await sql`INSERT INTO messages (id, role, text, ritual_id, buttons, metadata, timestamp_ms)
                VALUES (${id}, ${incomingRole}, ${incomingText}, ${incomingRitualId || null}, ${buttonsJson}::jsonb, ${metadataJson}::jsonb, ${incomingTs})
                ON CONFLICT (id) DO NOTHING`;
    }

    if (echo) {
      // Create mocked assistant echo reply
      const text = incomingText ?? "(empty)";
      const reply = { id: uid("m"), role: "assistant" as const, text: `Echo: ${text}`, timestamp: Date.now() };
      await sql`INSERT INTO messages (id, role, text, timestamp_ms) VALUES (${reply.id}, ${reply.role}, ${reply.text}, ${reply.timestamp})`;
      await sql`DELETE FROM messages WHERE id IN (
        SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
      )`;
      return NextResponse.json({ ok: true, text: reply.text });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
