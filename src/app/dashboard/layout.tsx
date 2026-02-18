"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Session-only mode: sign out when all browser tabs close
  // Only triggers if user explicitly unchecked "Keep me logged in"
  useEffect(() => {
    const sessionOnly = localStorage.getItem('hostfi_session_only');
    if (!sessionOnly) return;

    // sessionStorage persists within a tab session but clears when ALL tabs close.
    // On first load of a new browser session, tabAlive won't exist → sign out.
    // On same-session navigations/refreshes, tabAlive persists → stay logged in.
    const tabAlive = sessionStorage.getItem('hostfi_tab_alive');
    if (tabAlive) return; // Still in same browser session, keep going
    // Note: tabAlive is only set during login flow, so if we reach here
    // it means the browser was fully closed and reopened

    // New browser session + session-only flag = sign out
    localStorage.removeItem('hostfi_session_only');
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (supabase) await supabase.auth.signOut();
      } catch (error) {
        console.error("Failed to sign out:", error);
      }
      window.location.href = '/login';
    })();
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
