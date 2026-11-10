"use client";

import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
  { href: "/login", label: "Log in" },
];

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-h-11">
            <Image src="/logo.svg" alt="" width={32} height={32} />
            <span className="text-lg font-semibold tracking-tight">HostFi</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-700 min-h-11 inline-flex items-center">
            Back home
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-5 py-16 w-full">{children}</main>
      <footer className="border-t border-gray-100 bg-white">
        <nav aria-label="Footer" className="max-w-3xl mx-auto px-5 py-4 flex flex-wrap gap-x-2">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="min-h-11 inline-flex items-center px-2 text-sm text-gray-600 hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
