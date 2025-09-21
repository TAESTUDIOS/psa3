// components/ChatWindow.tsx
// Displays messages from the Zustand store with special styling for ritual messages.

"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import RitualButtons from "@/components/RitualButtons";
import UrgentGridInline from "@/components/UrgentGridInline";
import type { Message } from "@/lib/types";

export default function ChatWindow() {
  const { messages, saveMessage } = useAppStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    // Prefer smooth scroll if user is near bottom; otherwise jump
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160; // px threshold
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: nearBottom ? "smooth" : "auto" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Render message text with optional inline widgets
  function renderMessageText(text: string) {
    // Support token: <grid-urgent> → renders inline urgent todos grid
    if (text.includes("<grid-urgent>")) {
      const parts = text.split("<grid-urgent>");
      const nodes: any[] = [];
      parts.forEach((p, idx) => {
        // Preserve plain text parts
        if (p) nodes.push(<div key={`txt-${idx}`} className="whitespace-pre-wrap">{p}</div>);
        // Insert grid after each split except after the last
        if (idx < parts.length - 1) {
          nodes.push(
            <div key={`grid-${idx}`} className="mt-2">
              <UrgentGridInline />
            </div>
          );
        }
      });
      return <div className="flex flex-col gap-2">{nodes}</div>;
    }
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 h-full min-h-0 overflow-y-auto pr-2 pb-24 md:pb-0 bg-transparent text-[var(--fg)] leading-6"
      aria-live="polite"
    >
      {messages.map((m: Message) => {
        const isUser = m.role === "user";
        const isRitual = m.role === "ritual";
        const bubbleBase = "px-4 py-2.5 rounded-lg text-[0.95rem] max-w-[80%] break-words shadow-subtle";
        const bubbleRole = isUser
          ? "bg-gray-700 text-white"
          : isRitual
          ? "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]"
          : "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]";
        const bubbleCls = `${bubbleBase} ${bubbleRole}`;
        return (
          <div key={m.id} className={"flex " + (isUser ? "justify-end" : "justify-start")}>
            <div className={"flex flex-col items-" + (isUser ? "end" : "start") + " gap-1.5"}>
              <div className={bubbleCls}>
                {renderMessageText(m.text)}
                {isRitual && m.buttons && m.buttons.length > 0 && (
                  <div className="mt-2">
                    <RitualButtons ritualId={m.ritualId} buttons={m.buttons} />
                  </div>
                )}
              </div>
              <div className="text-[11px] leading-4 opacity-70 select-none" suppressHydrationWarning>
                {new Date(m.timestamp).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam", hour12: false })}
                <button
                  className="ml-2 underline hover:no-underline text-gray-400 hover:text-gray-300"
                  onClick={() => saveMessage(m.id)}
                  aria-label={`Save message ${m.id}`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}


