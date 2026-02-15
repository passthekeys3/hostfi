"use client";

import { useState, useEffect } from "react";
import { Link2, Zap } from "lucide-react";
import { UpgradeGate } from "@/components/upgrade-gate";
import {
  QuickBooksModal,
  XeroModal,
  SlackModal,
  DropboxModal,
  MakeModal,
  GoogleSheetsModal,
  TeamsModal,
  GoogleDriveModal,
  ZapierModal,
  EmailAlertsModal,
  SMSAlertsModal,
  PlaidModal,
  IntegrationCard,
  type Integration,
  type ConnectionStatus,
} from "@/components/integrations";

const INTEGRATIONS: Integration[] = [
  { id: "quickbooks", name: "QuickBooks Online", description: "Sync expenses and revenue to your ledger", category: "Accounting", status: "disconnected", logo: "QB", logoColor: "bg-[#2CA01C]", tier: "business" },
  { id: "xero", name: "Xero", description: "Two-way sync with expenses and revenue", category: "Accounting", status: "disconnected", logo: "XO", logoColor: "bg-[#13B5EA]", tier: "business" },
  { id: "plaid", name: "Bank Accounts (Plaid)", description: "Auto-import and categorize transactions", category: "Banking", status: "disconnected", logo: "PL", logoColor: "bg-[#111111]", tier: "pro" },
  { id: "melio", name: "Melio", description: "Pay bills directly — ACH free on paid plans", category: "Payments", status: "disconnected", logo: "ML", logoColor: "bg-[#00C2FF]", tier: "free" },
  { id: "hostaway", name: "Hostaway", description: "Import reservations and revenue", category: "Property Management", status: "coming_soon", logo: "HA", logoColor: "bg-[#FF6B35]", tier: "pro" },
  { id: "guesty", name: "Guesty", description: "Sync bookings, payouts, and property data", category: "Property Management", status: "coming_soon", logo: "GY", logoColor: "bg-[#00BFA5]", tier: "business" },
  { id: "ownerrez", name: "OwnerRez", description: "Import reservations and financial data", category: "Property Management", status: "coming_soon", logo: "OR", logoColor: "bg-[#1A73E8]", tier: "pro" },
  { id: "google_sheets", name: "Google Sheets", description: "Live sync expenses and P&L to Sheets", category: "Productivity", status: "disconnected", logo: "GS", logoColor: "bg-[#0F9D58]", tier: "pro" },
  { id: "google_drive", name: "Google Drive", description: "Auto-backup receipts and reports", category: "Productivity", status: "disconnected", logo: "GD", logoColor: "bg-[#4285F4]", tier: "pro" },
  { id: "dropbox", name: "Dropbox", description: "Sync receipts and reports by property", category: "Productivity", status: "disconnected", logo: "DB", logoColor: "bg-[#0061FF]", tier: "pro" },
  { id: "slack", name: "Slack", description: "Upload receipts, get alerts and summaries", category: "Team", status: "disconnected", logo: "SL", logoColor: "bg-[#4A154B]", tier: "business" },
  { id: "teams", name: "Microsoft Teams", description: "Upload receipts, get alerts and summaries", category: "Team", status: "disconnected", logo: "MT", logoColor: "bg-[#6264A7]", tier: "business" },
  { id: "zapier", name: "Zapier", description: "Connect to 5,000+ apps", category: "Automation", status: "disconnected", logo: "ZP", logoColor: "bg-[#FF4A00]", tier: "business" },
  { id: "make", name: "Make", description: "Visual workflow automation", category: "Automation", status: "disconnected", logo: "MK", logoColor: "bg-[#6D00CC]", tier: "business" },
  { id: "email_smtp", name: "Email Alerts", description: "Send alerts to your CPA or team", category: "Notifications", status: "disconnected", logo: "EM", logoColor: "bg-[#EA4335]", tier: "pro" },
  { id: "sms_alerts", name: "SMS Alerts", description: "Text alerts for due bills and anomalies", category: "Notifications", status: "disconnected", logo: "SM", logoColor: "bg-[#F22F46]", tier: "pro" },
];

// Group by category, preserving order
const grouped = INTEGRATIONS.reduce<{ category: string; items: Integration[] }[]>((acc, item) => {
  const existing = acc.find(g => g.category === item.category);
  if (existing) existing.items.push(item);
  else acc.push({ category: item.category, items: [item] });
  return acc;
}, []);

export default function IntegrationsPage() {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Load existing connections from Supabase on mount
  useEffect(() => {
    async function loadConnections() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("integration_connections")
          .select("provider")
          .eq("user_id", user.id)
          .eq("active", true);
        if (data && data.length > 0) {
          setConnectedIds(new Set(data.map((c: { provider: string }) => c.provider)));
        }
      } catch {}
    }
    loadConnections();
  }, []);

  // Modal states
  const [openModal, setOpenModal] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    const hasModal = ["quickbooks", "xero", "slack", "google_sheets", "zapier", "teams", "google_drive", "dropbox", "make", "sms_alerts", "email_smtp", "plaid"].includes(id);
    if (hasModal) { setOpenModal(id); return; }
    // Toggle for Melio
    setConnectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleModalClose = (id: string, didConnect?: boolean) => () => {
    setOpenModal(null);
    if (didConnect) {
      setConnectedIds(prev => new Set(prev).add(id));
    }
  };

  const handleDisconnect = (id: string) => {
    setConnectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const getStatus = (integration: Integration): ConnectionStatus => {
    if (connectedIds.has(integration.id)) return "connected";
    return integration.status;
  };

  return (
    <UpgradeGate feature="integrations">
    <div className="space-y-8 pb-24 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-gray-500 mt-1.5 text-sm">Connect Your Tools to Automate Your Workflow</p>
      </div>

      {/* Grouped integrations */}
      {grouped.map(group => (
        <section key={group.category}>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">{group.category}</h2>
          <div className="space-y-2">
            {group.items.map(integration => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                status={getStatus(integration)}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Request */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 text-center">
        <Zap className="w-5 h-5 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900 mb-1">Need Something Else?</p>
        <p className="text-xs text-gray-400 mb-4">Let us know what tools you use.</p>
        <button className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Request Integration
        </button>
      </div>

      {/* Modals */}
      {openModal === "quickbooks" && <QuickBooksModal onClose={handleModalClose("quickbooks")} />}
      {openModal === "xero" && <XeroModal onClose={handleModalClose("xero")} />}
      {openModal === "slack" && <SlackModal onClose={handleModalClose("slack")} />}
      {openModal === "google_sheets" && <GoogleSheetsModal onClose={handleModalClose("google_sheets")} />}
      {openModal === "zapier" && <ZapierModal onClose={handleModalClose("zapier")} />}
      {openModal === "teams" && <TeamsModal onClose={handleModalClose("teams")} />}
      {openModal === "google_drive" && <GoogleDriveModal onClose={handleModalClose("google_drive")} />}
      {openModal === "dropbox" && <DropboxModal onClose={handleModalClose("dropbox")} />}
      {openModal === "make" && <MakeModal onClose={handleModalClose("make")} />}
      {openModal === "sms_alerts" && <SMSAlertsModal onClose={handleModalClose("sms_alerts")} />}
      {openModal === "email_smtp" && <EmailAlertsModal onClose={handleModalClose("email_smtp")} />}
      {openModal === "plaid" && <PlaidModal onClose={handleModalClose("plaid")} onConnected={() => setConnectedIds(prev => new Set(prev).add("plaid"))} />}
      {/* Note: modals call onClose() without didConnect=true, so closing a modal
          does NOT mark the integration as connected. In production, the OAuth
          callback or API verification will call onClose with didConnect=true. */}
    </div>
    </UpgradeGate>
  );
}
