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
    try {
      if (fallbackWebhook) {
        const res = await fetch(fallbackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content, lastMessages: messages.slice(-10), tone }),
        });
        const data = await res.json();
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
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const data = await res.json();
        addMessage({ id: uid("m"), role: "assistant", text: data.text, timestamp: Date.now() });
      }
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
    <div className="flex gap-2 font-mono text-green-400">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        className="flex-1 border rounded px-3 py-1.5 text-sm bg-black text-green-400 border-green-700 placeholder-green-700 focus:outline-none focus:ring-0"
        placeholder="Type a message or /start <ritualId>"
        aria-label="Chat input"
      />
      <button
        onClick={send}
        className="px-3 py-1.5 rounded border border-green-700 bg-black text-green-400 hover:bg-green-900/20 text-sm"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
