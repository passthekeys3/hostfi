"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

function useAuthTarget() {
  const [target, setTarget] = useState("/login");
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setTarget("/dashboard");
      } catch (error) {
        console.error("Failed to check auth session:", error);
      }
    })();
  }, []);
  return target;
}

export function NavBar() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const authTarget = useAuthTarget();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-100" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">HostFi</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-600">
          <button onClick={() => scrollTo("features")} className="hover:text-gray-900 transition-colors cursor-pointer">Features</button>
          <button onClick={() => scrollTo("how-it-works")} className="hover:text-gray-900 transition-colors cursor-pointer">How It Works</button>
          <button onClick={() => scrollTo("integrations")} className="hover:text-gray-900 transition-colors cursor-pointer">Integrations</button>
          <button onClick={() => scrollTo("pricing")} className="hover:text-gray-900 transition-colors cursor-pointer">Pricing</button>
          <button onClick={() => scrollTo("faq")} className="hover:text-gray-900 transition-colors cursor-pointer">FAQ</button>
          <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href={authTarget} prefetch={false} className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">Log in</Link>
          <Link href={authTarget} prefetch={false} className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">Get Started</Link>
        </div>
        <button 
          onClick={() => setMobileMenu(!mobileMenu)} 
          className="md:hidden p-2 cursor-pointer"
          aria-label={mobileMenu ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenu}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
      {mobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1">
          {["features", "how-it-works", "integrations", "pricing", "faq"].map(id => (
            <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left py-2.5 text-sm text-gray-600 capitalize cursor-pointer">{id.replace("-", " ")}</button>
          ))}
          <Link href="/blog" onClick={() => setMobileMenu(false)} className="block w-full text-left py-2.5 text-sm text-gray-600">Blog</Link>
          <div className="pt-3 flex gap-2">
            <Link href={authTarget} prefetch={false} className="flex-1 text-center py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Log in</Link>
            <Link href={authTarget} prefetch={false} onClick={() => setMobileMenu(false)} className="flex-1 text-center py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg cursor-pointer">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
