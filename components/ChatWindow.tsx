// components/ChatWindow.tsx
// Displays messages from the Zustand store with special styling for ritual messages.

"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import RitualButtons from "@/components/RitualButtons";

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

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-1 h-full min-h-0 overflow-y-auto pr-2 pb-24 md:pb-0 bg-black text-green-400 font-mono leading-6"
      aria-live="polite"
    >
      {messages.map((m) => {
        const isUser = m.role === "user";
        const isRitual = m.role === "ritual";
        return (
          <div key={m.id} className={"flex " + (isUser ? "justify-end" : "")}>
            <div className={"max-w-[90%] w-fit px-0 py-0 text-sm md:text-[13px] " + (isUser ? "text-right" : "text-left") }>
              <div className="flex items-baseline gap-2">
                {/* Prefix to hint role like a terminal */}
                <span className="text-green-500">{isUser ? ">" : isRitual ? "[*]" : "<"}</span>
                <span className="opacity-80 text-xs text-green-500" suppressHydrationWarning>
                  [{new Date(m.timestamp).toLocaleTimeString()}]
                </span>
              </div>
              <div className="whitespace-pre-wrap mt-0.5">{m.text}</div>
              {isRitual && m.buttons && m.buttons.length > 0 && (
                <div className="mt-1">
                  <RitualButtons ritualId={m.ritualId} buttons={m.buttons} />
                </div>
              )}
              <div className="mt-1 text-right">
                <button
                  className="text-xs text-green-500 hover:text-green-300 underline"
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

