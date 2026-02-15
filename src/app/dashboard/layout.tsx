"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Session-only mode: sign out when all browser tabs close
  // sessionStorage is cleared when the browser closes, localStorage persists
  useEffect(() => {
    const sessionOnly = localStorage.getItem('hostfi_session_only');
    if (!sessionOnly) return;

    const tabAlive = sessionStorage.getItem('hostfi_tab_alive');
    if (!tabAlive) {
      // Browser was closed and reopened — clear the session
      localStorage.removeItem('hostfi_session_only');
      (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          if (supabase) await supabase.auth.signOut();
        } catch {}
        window.location.href = '/login';
      })();
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar externalOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main id="main-content" className="flex-1 min-w-0 lg:ml-0">
        <div className="p-4 sm:p-6 lg:p-10 pt-16 lg:pt-10 pb-24 lg:pb-10 max-w-7xl mx-auto overflow-hidden">
          {children}
        </div>
      </main>
      <MobileNav onMorePress={() => setSidebarOpen(true)} />
    </div>
  );
}
