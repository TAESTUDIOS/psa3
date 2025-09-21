// components/UrgentGridInline.tsx
// Inline read-only grid of urgent todos for rendering inside chat bubbles.
// Renders two columns: Name and Priority. Keeps styles compact for chat.

"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";

export default function UrgentGridInline() {
  const { urgentTodos } = useAppStore();

  // Sort: not done first, then high > medium > low, then earliest due
  const items = useMemo(() => {
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...urgentTodos].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const r = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      if (r !== 0) return r;
      const da = a.dueAt ?? Infinity;
      const db = b.dueAt ?? Infinity;
      return (da as number) - (db as number);
    });
  }, [urgentTodos]);

  if (items.length === 0) {
    return <div className="text-xs text-gray-600 dark:text-gray-300">No urgent todos.</div>;
  }

  const chip = (p: string) => {
    const base = "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] leading-4 font-medium";
    const map: Record<string, string> = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
      low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    };
    return <span className={`${base} ${map[p] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}`}>{p}</span>;
  };

  return (
    <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="grid grid-cols-2 bg-gray-50 dark:bg-gray-800/60 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <div className="px-2 py-1.5">Name</div>
        <div className="px-2 py-1.5">Priority</div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {items.map((t) => (
          <div key={t.id} className="grid grid-cols-2 items-center text-sm">
            <div className="px-2 py-1.5 truncate">
              <span className={t.done ? "line-through opacity-70" : ""}>{t.title}</span>
            </div>
            <div className="px-2 py-1.5">
              {chip(t.priority)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
