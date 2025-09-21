// components/ChatInput.tsx
// Input box + send button. Sends to /api/messages by default; recognizes /start <ritualId>.

"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { addMessage, messages, tone, rituals, fallbackWebhook } = useAppStore();

  async function send() {
    const content = text.trim();
    if (!content) return;
    const userMsg = { id: uid("m"), role: "user" as const, text: content, timestamp: Date.now() };
    addMessage(userMsg);
    setText("");

    // Persist user message (no echo yet; flow decides next steps)
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userMsg.id, role: "user", text: content, timestamp: userMsg.timestamp, echo: false }),
      });
    } catch {}

    // Quick inline commands handled locally
    const norm = content.trim().toLowerCase();
    if (norm === "/urgent" || norm.startsWith("/urgent ")) {
      const ts = Date.now();
      const textRes = "Here are your urgent items:\n<grid-urgent>";
      addMessage({ id: uid("m"), role: "assistant", text: textRes, timestamp: ts });
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", text: textRes, timestamp: ts, echo: false }),
        });
      } catch {}
      return;
    }

    // Detect ritual trigger: match by exact chat keyword OR '/start <ritualId>'
    const keywordMatch = rituals.find(
      (r) => r.trigger?.type === "chat" && typeof r.trigger.chatKeyword === "string" && content === r.trigger.chatKeyword
    );
    if (keywordMatch || content.startsWith("/start ")) {
      const ritualId = keywordMatch ? keywordMatch.id : content.split(" ")[1];
      const ritual = keywordMatch || rituals.find((r) => r.id === ritualId);
      const last10 = messages.slice(-10);
      try {
        // Always call server proxy to avoid CORS and ensure secure webhook usage
        const res = await fetch("/api/rituals/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ritualId, context: last10, tone, webhook: ritual?.webhook, buttons: ritual?.buttons }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Failed to start ritual ${ritualId}`);
        }
        const ts = Date.now();
        const textRes = data.text ?? "(no text)";
        const buttonsRes: string[] = data.buttons ?? (ritual?.buttons ?? []);
        addMessage({ id: uid("m"), role: "ritual", text: textRes, buttons: buttonsRes, ritualId, timestamp: ts });
        // Persist ritual message (no echo)
        try {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "ritual", text: textRes, ritualId, buttons: buttonsRes, timestamp: ts, echo: false }),
          });
        } catch {}
      } catch (e) {
        const ts = Date.now();
        const errorText = `Failed to start ritual ${ritualId}.`;
        addMessage({ id: uid("m"), role: "assistant", text: errorText, timestamp: ts });
        // Persist assistant error
        try {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "assistant", text: errorText, timestamp: ts, echo: false }),
          });
        } catch {}
      }
      return;
    }

    // Fallback behavior (Step 11): call fallback webhook else local mock
    // If user typed an unrecognized slash command, handle locally to avoid server errors during dev
    if (content.startsWith("/") && !keywordMatch) {
      const ts = Date.now();
      const textRes = "Unknown command. Try /urgent or /start <ritualId>.";
      addMessage({ id: uid("m"), role: "assistant", text: textRes, timestamp: ts });
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", text: textRes, timestamp: ts, echo: false }),
        });
      } catch {}
      return;
    }
    try {
      // Always use server proxy to avoid browser CORS
      const res = await fetch("/api/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, lastMessages: messages.slice(-10), tone, url: fallbackWebhook || undefined }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "fallback failed");
      }
      const ts = Date.now();
      const textRes = data.text ?? "(no text)";
      addMessage({ id: uid("m"), role: "assistant", text: textRes, timestamp: ts });
      // Persist assistant reply (no echo)
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", text: textRes, timestamp: ts, echo: false }),
        });
      } catch {}
    } catch (e) {
      const ts = Date.now();
      const errorText = "Request failed. Please try again.";
      addMessage({ id: uid("m"), role: "assistant", text: errorText, timestamp: ts });
      // Persist assistant error
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", text: errorText, timestamp: ts, echo: false }),
        });
      } catch {}
    }
  }

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        className="flex-1 border border-[var(--border)] rounded-lg px-4 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-subtle"
        placeholder="Type a message or /start <ritualId>"
        aria-label="Chat input"
      />
      <button
        onClick={send}
        className="px-4 py-2 rounded-lg border text-sm bg-gray-700 text-white hover:bg-gray-600 border-gray-600 shadow-subtle"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
