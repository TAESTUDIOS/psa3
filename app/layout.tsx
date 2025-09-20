// app/layout.tsx
// Root layout for the Personal Stability Assistant (PSA)
// Purpose: App shell with left sidebar navigation and main content area.

import "@/styles/globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ThemeClient from "@/components/ThemeClient";

export const metadata: Metadata = {
  title: "Personal Stability Assistant",
  description: "Rituals + chat for a single user",
};

// Ensure proper mobile scaling
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden antialiased bg-black text-green-400 font-mono">
        <ThemeClient />
        <div className="h-screen flex flex-col md:flex-row">
          {/* Sidebar (collapsible at small widths, expanded on md+) */}
          <aside className="hidden md:block w-64 border-r border-green-800">
            <Sidebar />
          </aside>

          {/* Top nav on mobile */}
          <header className="md:hidden w-full border-b border-green-800 sticky top-0 z-20 bg-black">
            <div className="px-4 py-3">
              <Sidebar variant="top" />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 min-w-0 flex overflow-hidden">
            <div className="mx-auto px-3 md:px-4 py-4 md:py-6 max-w-5xl flex-1 min-h-0 w-full flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

