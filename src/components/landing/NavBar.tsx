"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const MENU_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "integrations", label: "Integrations" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

function useSessionHrefs() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        setSignedIn(Boolean(session));
      } catch (error) {
        console.error("Failed to check auth session:", error);
      }
    })();
  }, []);
  return {
    startHref: signedIn ? "/dashboard" : "/signup",
    loginHref: signedIn ? "/dashboard" : "/login",
  };
}

export function NavBar() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { startHref, loginHref } = useSessionHrefs();
  const menuRef = useFocusTrap<HTMLDivElement>(mobileMenu, { onEscape: () => setMobileMenu(false) });

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenu]);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">HostFi</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-600">
          {MENU_LINKS.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)} className="hover:text-gray-900 transition-colors cursor-pointer">{link.label}</button>
          ))}
          <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href={loginHref} prefetch={false} className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Log in</Link>
          <Link href={startHref} prefetch={false} className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">Get Started</Link>
        </div>
        <button
          onClick={() => setMobileMenu(!mobileMenu)}
          className="md:hidden min-h-11 min-w-11 inline-flex items-center justify-center cursor-pointer"
          aria-label={mobileMenu ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenu}
          aria-controls="mobile-nav"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
      {mobileMenu && (
        <div
          id="mobile-nav"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="md:hidden fixed inset-0 top-16 z-50 bg-white overflow-y-auto px-5 py-4"
        >
          {MENU_LINKS.map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)} className="block w-full text-left min-h-11 text-base text-gray-800 cursor-pointer">{link.label}</button>
          ))}
          <Link href="/blog" onClick={() => setMobileMenu(false)} className="flex items-center min-h-11 text-base text-gray-800">Blog</Link>
          <div className="pt-3 flex gap-2">
            <Link href={loginHref} prefetch={false} className="flex-1 text-center min-h-11 inline-flex items-center justify-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Log in</Link>
            <Link href={startHref} prefetch={false} onClick={() => setMobileMenu(false)} className="flex-1 text-center min-h-11 inline-flex items-center justify-center text-sm font-medium text-white bg-gray-900 rounded-lg">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
