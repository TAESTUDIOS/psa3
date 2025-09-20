"use client";
// app/chat/page.tsx
// Chat page renders ChatWindow + ChatInput

import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export default function ChatPage() {
  const { setMessages } = useAppStore();

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.messages)) setMessages(data.messages);
      })
      .catch(() => {});
  }, [setMessages]);
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full md:gap-2 pb-20 md:pb-0 bg-black text-green-400 font-mono">
      {/* Messages area uses normal page scroll on mobile (no overflow here) */}
      <div className="flex-1 min-h-0">
        <ChatWindow />
      </div>
      {/* Fixed input on mobile; static on md+ */}
      <div className="md:static fixed inset-x-0 bottom-0 bg-black border-t border-green-800 md:border-0 pt-2 md:pt-0 z-30 safe-bottom">
        <ChatInput />
      </div>
    </div>
  );
}

