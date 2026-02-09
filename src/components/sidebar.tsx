"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Building2, Receipt, Settings, Menu, X, Inbox, BarChart3, Bell, GitCompareArrows, FileText, Calculator, Upload, MessageSquare, DollarSign, Link2, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { DEMO_ALERTS } from "@/lib/data";
import { DEMO_INBOX_ITEMS } from "@/lib/demo-inbox";

const inboxCount = DEMO_INBOX_ITEMS.filter(i => i.status === "pending_review").length;
const unreadAlertCount = DEMO_ALERTS.filter(a => !a.read).length;

const mainNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, badge: 0 },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, badge: inboxCount },
  { href: "/dashboard/properties", label: "Properties", icon: Building2, badge: 0 },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, badge: 0 },
  { href: "/dashboard/revenue", label: "Revenue", icon: DollarSign, badge: 0 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, badge: 0 },
  { href: "/dashboard/tax", label: "Tax Prep", icon: Calculator, badge: 0 },
  { href: "/dashboard/ask", label: "Ask AI", icon: MessageSquare, badge: 0 },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, badge: unreadAlertCount, badgeColor: 'red' as const },
];

const bottomNav = [
  { href: "/dashboard/reports", label: "Reports", icon: FileText, badge: 0 },
  { href: "/dashboard/benchmarking", label: "Benchmarking", icon: GitCompareArrows, badge: 0 },
  { href: "/dashboard/integrations", label: "Integrations", icon: Link2, badge: 0 },
  { href: "/dashboard/import", label: "Import", icon: Upload, badge: 0 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, badge: 0 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, badge: 0 },
];

interface SidebarProps {
  externalOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ externalOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    if (!v && onClose) onClose();
  };

  useEffect(() => {
    if (externalOpen !== undefined) setInternalOpen(externalOpen);
  }, [externalOpen]);

  const NavLink = ({ item }: { item: typeof mainNav[0] }) => {
    const isActive = item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        aria-label={item.badge > 0 ? `${item.label}, ${item.badge} notifications` : item.label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative min-h-[36px] focus:outline-none focus:ring-2 focus:ring-teal-500/40",
          isActive
            ? "bg-teal-50 text-teal-700 font-semibold"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-teal-500 rounded-r-full" aria-hidden="true" />
        )}
        <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-teal-600" : "")} aria-hidden="true" />
        {item.label}
        {item.badge > 0 && (
          <span className={cn(
            "ml-auto min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-bold rounded-full leading-none",
            'badgeColor' in item && item.badgeColor === 'red'
              ? 'bg-rose-500 text-white'
              : 'bg-teal-500 text-white'
          )} aria-hidden="true">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-teal-500 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
        aria-expanded={open}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-lg shadow-md border border-gray-200/60 min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-teal-500/40"
      >
        {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
      </button>

      {/* Overlay */}
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-[260px] shrink-0 bg-white flex flex-col transition-transform lg:translate-x-0 border-r border-gray-200/60",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-gray-900">HostFi</span>
            </div>
          </Link>
        </div>

        {/* Nav — single scrollable area */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-3 overflow-y-auto scrollbar-hide">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400" aria-hidden="true">Menu</p>
          <ul className="space-y-0.5" role="list">
            {mainNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} />
              </li>
            ))}
          </ul>
          <div className="my-3 mx-3 border-t border-gray-100" />
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400" aria-hidden="true">More</p>
          <ul className="space-y-0.5" role="list">
            {bottomNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">K</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">Kevin</p>
              <p className="text-[10px] text-gray-400">Pro Plan</p>
            </div>
            <span className="text-[9px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">Demo</span>
          </div>
        </div>
      </aside>
    </>
  );
}
