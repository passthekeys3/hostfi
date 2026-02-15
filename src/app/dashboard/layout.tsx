"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Session-only mode: sign out when all browser tabs close
  useEffect(() => {
    const sessionOnly = localStorage.getItem('hostfi_session_only');
    if (!sessionOnly) return;

    const tabAlive = sessionStorage.getItem('hostfi_tab_alive');
    if (!tabAlive) {
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
      <Sidebar />
      <main id="main-content" className="flex-1 min-w-0 lg:ml-0">
        <div className="p-4 sm:p-6 lg:p-10 pt-16 lg:pt-10 pb-6 lg:pb-10 max-w-7xl mx-auto overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
