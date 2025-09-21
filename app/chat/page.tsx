"use client";
// app/chat/page.tsx
// Chat page renders ChatWindow + ChatInput

import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";

export default function ChatPage() {
  const { setMessages, messages } = useAppStore();
  // Refs to avoid stale closures and unnecessary re-renders
  const lastCountRef = useRef<number>(messages.length);
  const lastTsRef = useRef<number | undefined>(messages[messages.length - 1]?.timestamp);

  useEffect(() => {
    let timer: number | undefined;
    let aborted = false;

    async function loadOnce() {
      try {
        const r = await fetch("/api/messages", { cache: "no-store" });
        const data = await r.json();
        if (!aborted && Array.isArray(data?.messages)) {
          const incoming = data.messages as typeof messages;
          const incomingLastTs = incoming[incoming.length - 1]?.timestamp as number | undefined;
          const countChanged = incoming.length !== lastCountRef.current;
          const lastChanged = incomingLastTs !== lastTsRef.current;
          if (countChanged || lastChanged) {
            lastCountRef.current = incoming.length;
            lastTsRef.current = incomingLastTs;
            setMessages(incoming);
          }
        }
      } catch {}
    }

    // initial load + poll every 3s
    loadOnce();
    timer = (setInterval(loadOnce, 3000) as unknown) as number;

    return () => {
      aborted = true;
      if (timer) clearInterval(timer as unknown as number);
    };
  }, [setMessages]);
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full md:gap-2 pb-20 md:pb-0 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Messages area uses normal page scroll on mobile (no overflow here) */}
      <div className="flex-1 min-h-0">
        <ChatWindow />
      </div>
      {/* Fixed input on mobile; static on md+ */}
      <div className="md:static fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:border-0 pt-2 md:pt-0 z-30 safe-bottom">
        <ChatInput />
      </div>
    </div>
  );
}

