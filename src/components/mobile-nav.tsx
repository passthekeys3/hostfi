"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, Mail, Building2, Menu } from "lucide-react";
import { DEMO_INBOX_ITEMS } from "@/lib/demo-inbox";

const inboxCount = DEMO_INBOX_ITEMS.filter(i => i.status === "pending_review").length;

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { href: "/dashboard/inbox", label: "Inbox", icon: Mail, badge: inboxCount },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
];

export function MobileNav({ onMorePress }: { onMorePress: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(240, 238, 235, 0.8)',
        boxShadow: '0 -1px 20px rgba(0, 0, 0, 0.03)',
      }}
    >
      <ul className="flex items-center justify-around px-3 h-[68px]" role="list">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-label={tab.badge && tab.badge > 0 ? `${tab.label}, ${tab.badge} notifications` : tab.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[48px] rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40",
                  isActive ? "text-teal-600" : "text-muted-foreground"
                )}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" aria-hidden="true" />
                )}
                
                <div className={cn(
                  "relative p-1.5 rounded-lg transition-all duration-200",
                  isActive && "bg-teal-50"
                )}>
                  <tab.icon className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    isActive && "stroke-[2.5]"
                  )} aria-hidden="true" />
                  
                  {/* Badge */}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold rounded-full leading-none"
                      style={{
                        background: 'linear-gradient(135deg, #14B8A6 0%, #0d9488 100%)',
                        color: 'white',
                        boxShadow: '0 1px 3px rgba(20, 184, 166, 0.3)',
                      }}
                      aria-hidden="true"
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                
                <span className={cn(
                  "text-[10px] font-medium leading-none transition-colors duration-200",
                  isActive ? "text-teal-700" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
        
        <li>
          <button
            onClick={onMorePress}
            aria-label="Open more options menu"
            className="flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[48px] rounded-xl text-muted-foreground transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            <div className="p-1.5 rounded-lg">
              <Menu className="w-[22px] h-[22px]" aria-hidden="true" />
            </div>
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
