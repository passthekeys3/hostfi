"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Zap, ExternalLink, RefreshCw, Check } from "lucide-react";
import { UpgradeGate } from "@/components/upgrade-gate";
import {
  IntegrationCard,
  type Integration,
  type ConnectionStatus,
} from "@/components/integrations";

// Lazy-load modals - only loaded when opened
const PMSModal = dynamic(() => import("@/components/integrations/PMSModal").then(m => ({ default: m.PMSModal })));
const XeroModal = dynamic(() => import("@/components/integrations/XeroModal").then(m => ({ default: m.XeroConnectModal })));
const SlackModal = dynamic(() => import("@/components/integrations/SlackModal").then(m => ({ default: m.SlackConnectModal })));
const DropboxModal = dynamic(() => import("@/components/integrations/DropboxModal").then(m => ({ default: m.DropboxModal })));
const MakeModal = dynamic(() => import("@/components/integrations/MakeModal").then(m => ({ default: m.MakeModal })));
const GoogleSheetsModal = dynamic(() => import("@/components/integrations/GoogleSheetsModal").then(m => ({ default: m.GoogleSheetsModal })));
const TeamsModal = dynamic(() => import("@/components/integrations/TeamsModal").then(m => ({ default: m.TeamsModal })));
const GoogleDriveModal = dynamic(() => import("@/components/integrations/GoogleDriveModal").then(m => ({ default: m.GoogleDriveModal })));
const ZapierModal = dynamic(() => import("@/components/integrations/ZapierModal").then(m => ({ default: m.ZapierModal })));
const EmailAlertsModal = dynamic(() => import("@/components/integrations/EmailAlertsModal").then(m => ({ default: m.EmailAlertsModal })));
const PlaidModal = dynamic(() => import("@/components/integrations/PlaidModal").then(m => ({ default: m.PlaidModal })));

const INTEGRATIONS: Integration[] = [
  { id: "quickbooks", name: "QuickBooks Online", description: "Sync expenses and revenue to your ledger", category: "Accounting", status: "coming_soon", logo: "QB", logoColor: "bg-[#2CA01C]", logoUrl: "/logos/quickbooks.svg", tier: "business" },

  { id: "plaid", name: "Bank Accounts (Plaid)", description: "Auto-import and categorize transactions", category: "Banking", status: "available", logo: "PL", logoColor: "bg-[#111111]", logoUrl: "/logos/plaid.svg", tier: "pro" },
  { id: "stripe", name: "Stripe", description: "Import direct booking revenue — coming soon", category: "Payments", status: "coming_soon", logo: "ST", logoColor: "bg-[#635BFF]", logoUrl: "/logos/stripe.svg", tier: "pro" },
  { id: "melio", name: "Melio", description: "Bill pay integration — coming soon", category: "Payments", status: "coming_soon", logo: "ML", logoColor: "bg-[#00C2FF]", logoUrl: "/logos/melio.svg", tier: "free" },
  { id: "xero", name: "Xero", description: "Export expenses in Xero-compatible CSV format", category: "Accounting", status: "available", logo: "XR", logoColor: "bg-[#13B5EA]", logoUrl: "/logos/xero.svg", tier: "pro" },
  { id: "hostaway", name: "Hostaway", description: "Import reservations and revenue", category: "Property Management", status: "available", logo: "H", logoColor: "bg-white border border-gray-200", logoUrl: "/logos/hostaway.png", tier: "pro" },
  { id: "guesty", name: "Guesty", description: "Sync bookings, payouts, and property data", category: "Property Management", status: "available", logo: "G", logoColor: "bg-[#00695C]", logoUrl: "/logos/guesty.png", tier: "pro" },
  { id: "ownerrez", name: "OwnerRez", description: "Import reservations and financial data", category: "Property Management", status: "available", logo: "OR", logoColor: "bg-[#4CAF50]", logoUrl: "/logos/ownerrez.png", tier: "pro" },
  { id: "hospitable", name: "Hospitable", description: "Sync properties and reservations", category: "Property Management", status: "available", logo: "H", logoColor: "bg-[#E84670]", logoUrl: "/logos/hospitable.svg", tier: "pro" },
  { id: "hospitable_connect", name: "Hospitable Connect", description: "Connect Airbnb & VRBO directly (no PMS needed)", category: "Property Management", status: "available", logo: "HC", logoColor: "bg-[#10B981]", logoUrl: "/logos/hospitable-connect.svg", tier: "pro" },
  { id: "lodgify", name: "Lodgify", description: "Import properties, bookings, and revenue", category: "Property Management", status: "available", logo: "L", logoColor: "bg-[#3B82F6]", logoUrl: "/logos/lodgify.svg", tier: "pro" },
  { id: "breezeway", name: "Breezeway", description: "Sync maintenance costs and work orders — coming soon", category: "Operations", status: "coming_soon", logo: "BW", logoColor: "bg-[#00B4D8]", logoUrl: "/logos/breezeway.svg", tier: "pro" },
  { id: "google_sheets", name: "Google Sheets", description: "Live sync expenses and P&L to Sheets", category: "Productivity", status: "disconnected", logo: "GS", logoColor: "bg-[#0F9D58]", logoUrl: "/logos/googlesheets.svg", tier: "pro" },
  { id: "google_drive", name: "Google Drive", description: "Auto-backup receipts and reports", category: "Productivity", status: "disconnected", logo: "GD", logoColor: "bg-[#4285F4]", logoUrl: "/logos/googledrive.svg", tier: "pro" },
  { id: "dropbox", name: "Dropbox", description: "Sync receipts and reports by property", category: "Productivity", status: "coming_soon", logo: "DB", logoColor: "bg-[#0061FF]", logoUrl: "/logos/dropbox.svg", tier: "pro" },
  { id: "slack", name: "Slack", description: "Upload receipts, get alerts and summaries", category: "Team", status: "disconnected", logo: "SL", logoColor: "bg-[#4A154B]", logoUrl: "/logos/slack.svg", tier: "business" },
  { id: "teams", name: "Microsoft Teams", description: "Upload receipts, get alerts and summaries", category: "Team", status: "coming_soon", logo: "MT", logoColor: "bg-[#6264A7]", logoUrl: "/logos/teams.svg", tier: "business" },
  { id: "zapier", name: "Zapier", description: "Connect to 5,000+ apps", category: "Automation", status: "disconnected", logo: "ZP", logoColor: "bg-[#FF4A00]", logoUrl: "/logos/zapier.svg", tier: "business" },
  { id: "make", name: "Make", description: "Visual workflow automation", category: "Automation", status: "disconnected", logo: "MK", logoColor: "bg-[#6D00CC]", logoUrl: "/logos/make.svg", tier: "business" },
  { id: "email_smtp", name: "Email Alerts", description: "Send alerts to your CPA or team", category: "Notifications", status: "disconnected", logo: "EM", logoColor: "bg-[#EA4335]", tier: "pro" },
];

// Group by category, preserving order
const grouped = INTEGRATIONS.reduce<{ category: string; items: Integration[] }[]>((acc, item) => {
  const existing = acc.find(g => g.category === item.category);
  if (existing) existing.items.push(item);
  else acc.push({ category: item.category, items: [item] });
  return acc;
}, []);

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsPageContent />
    </Suspense>
  );
}

function IntegrationsPageContent() {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string | null>(null);
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState<string | null>(null);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  const [sheetsSyncSuccess, setSheetsSyncSuccess] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Check URL params for OAuth redirect results
  const searchParams = useSearchParams();
  useEffect(() => {
    const connectedParams = searchParams.getAll("connected");
    if (connectedParams.length > 0) {
      setConnectedIds(prev => {
        const next = new Set(prev);
        connectedParams.forEach(id => next.add(id));
        return next;
      });
      // Auto-open modal for freshly connected integrations that need config
      const needsConfig = connectedParams.find(id => ["slack"].includes(id));
      if (needsConfig) {
        setOpenModal(needsConfig);
      }
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/integrations");
    }

    // Handle OwnerRez OAuth callback
    const ownerrezStatus = searchParams.get("ownerrez");
    if (ownerrezStatus === "connected") {
      setConnectedIds(prev => new Set(prev).add("ownerrez"));
      setOpenModal("ownerrez");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (ownerrezStatus === "denied") {
      setOauthError("OwnerRez authorization was denied. Please try again.");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (ownerrezStatus === "error") {
      const reason = searchParams.get("reason") || "unknown";
      const reasonMessages: Record<string, string> = {
        missing_params: "Missing authorization parameters. Please try connecting again.",
        invalid_state: "Invalid authorization state. Please try connecting again.",
        expired: "Authorization expired. Please try connecting again.",
        not_configured: "OwnerRez OAuth is not configured. Please contact support.",
        token_exchange: `Failed to exchange authorization code. ${searchParams.get("detail") || "Please try connecting again."}`,
        no_token: "OwnerRez did not return an access token. Please try again.",
        db_error: "Failed to save connection. Please try again.",
      };
      setOauthError(reasonMessages[reason] || `OwnerRez connection failed (${reason}). Please try again.`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    }

    // Handle Hospitable OAuth callback
    const hospitableStatus = searchParams.get("hospitable");
    if (hospitableStatus === "connected") {
      setConnectedIds(prev => new Set(prev).add("hospitable"));
      setOpenModal("hospitable");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (hospitableStatus === "denied") {
      setOauthError("Hospitable authorization was denied. Please try again.");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (hospitableStatus === "error") {
      const reason = searchParams.get("reason") || "unknown";
      const reasonMessages: Record<string, string> = {
        missing_params: "Missing authorization parameters. Please try connecting again.",
        invalid_state: "Invalid authorization state. Please try connecting again.",
        expired: "Authorization expired. Please try connecting again.",
        not_configured: "Hospitable OAuth is not configured. Please contact support.",
        token_exchange: `Failed to exchange authorization code. ${searchParams.get("detail") || "Please try connecting again."}`,
        no_token: "Hospitable did not return an access token. Please try again.",
        db_error: "Failed to save connection. Please try again.",
      };
      setOauthError(reasonMessages[reason] || `Hospitable connection failed (${reason}). Please try again.`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    }

    // Handle Hospitable Connect callback
    const hospitableConnectStatus = searchParams.get("hospitable_connect");
    if (hospitableConnectStatus === "connected") {
      setConnectedIds(prev => new Set(prev).add("hospitable_connect"));
      setOpenModal("hospitable_connect");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (hospitableConnectStatus === "error") {
      const reason = searchParams.get("reason") || "unknown";
      const reasonMessages: Record<string, string> = {
        not_configured: "Hospitable Connect is not configured. Please contact support.",
        db_error: "Failed to save connection. Please try again.",
      };
      setOauthError(reasonMessages[reason] || `Hospitable Connect failed (${reason}). Please try again.`);
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [searchParams]);

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
          .select("provider, metadata")
          .eq("user_id", user.id)
          .eq("active", true);
        if (data && data.length > 0) {
          setConnectedIds(new Set(data.map((c: { provider: string }) => c.provider)));
          // Extract Google Sheets URL
          const sheetsConn = data.find((c: { provider: string }) => c.provider === "google_sheets");
          if (sheetsConn?.metadata?.spreadsheet_id) {
            setGoogleSheetsUrl(`https://docs.google.com/spreadsheets/d/${sheetsConn.metadata.spreadsheet_id}`);
          }
          const driveConn = data.find((c: { provider: string }) => c.provider === "google_drive");
          if (driveConn?.metadata?.folder_url) {
            setGoogleDriveFolderUrl(driveConn.metadata.folder_url as string);
          } else if (driveConn?.metadata?.hostfi_folder_id) {
            setGoogleDriveFolderUrl(`https://drive.google.com/drive/folders/${driveConn.metadata.hostfi_folder_id}`);
          }
        }
      } catch (error) {
        console.error("Failed to load integration connections:", error);
      }
    }
    loadConnections();
  }, []);

  // Handle Google Sheets sync all
  const handleSheetsSyncAll = useCallback(async () => {
    setSheetsSyncing(true);
    setSheetsSyncSuccess(false);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch expenses with property names
      const { data: expenses } = await supabase
        .from("expenses")
        .select("date, amount, category, description, notes, properties(name)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500);

      if (!expenses || expenses.length === 0) {
        setSheetsSyncSuccess(true);
        setTimeout(() => setSheetsSyncSuccess(false), 3000);
        return;
      }

      const formatted = expenses.map((e: Record<string, unknown>) => ({
        date: e.date as string,
        property_name: (e.properties as { name: string } | null)?.name || "Unknown",
        category: e.category as string,
        amount: e.amount as number,
        description: e.description as string,
        notes: (e.notes as string) || "",
      }));

      const res = await fetch("/api/integrations/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: formatted }),
      });

      if (res.ok) {
        setSheetsSyncSuccess(true);
        setTimeout(() => setSheetsSyncSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to sync Google Sheets:", error);
    }
    setSheetsSyncing(false);
  }, []);

  // Modal states
  const [openModal, setOpenModal] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    const hasModal = ["xero", "slack", "google_sheets", "zapier", "teams", "google_drive", "dropbox", "make", "email_smtp", "plaid", "guesty", "hostaway", "ownerrez", "hospitable", "hospitable_connect", "lodgify"].includes(id);
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
        <p className="text-gray-600 mt-1.5 text-sm">Connect Your Tools to Automate Your Workflow</p>
      </div>

      {/* OAuth error banner */}
      {oauthError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-red-500 mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{oauthError}</p>
          </div>
          <button onClick={() => setOauthError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
        </div>
      )}

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
                actions={
                  integration.id === "google_sheets" && connectedIds.has("google_sheets") ? (
                    <>
                      {googleSheetsUrl && (
                        <a
                          href={googleSheetsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0F9D58] bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Open Spreadsheet
                        </a>
                      )}
                      <button
                        onClick={handleSheetsSyncAll}
                        disabled={sheetsSyncing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                      >
                        {sheetsSyncing ? (
                          <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing...</>
                        ) : sheetsSyncSuccess ? (
                          <><Check className="w-3 h-3 text-teal-500" /> Synced!</>
                        ) : (
                          <><RefreshCw className="w-3 h-3" /> Sync All</>
                        )}
                      </button>
                    </>
                  ) : integration.id === "google_drive" && connectedIds.has("google_drive") ? (
                    <>
                      <a
                        href={googleDriveFolderUrl || "https://drive.google.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#4285F4] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in Drive
                      </a>
                    </>
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>
      ))}

      {/* Request */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-6 text-center">
        <Zap className="w-5 h-5 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900 mb-1">Need Something Else?</p>
        <p className="text-xs text-gray-600 mb-4">Let us know what tools you use.</p>
        <button className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Request Integration
        </button>
      </div>

      {/* Modals */}
      {openModal === "xero" && <XeroModal onClose={handleModalClose("xero")} />}
      {openModal === "slack" && <SlackModal onClose={handleModalClose("slack")} isConnected={connectedIds.has("slack")} onDisconnect={() => handleDisconnect("slack")} />}
      {openModal === "google_sheets" && <GoogleSheetsModal onClose={handleModalClose("google_sheets")} isConnected={connectedIds.has("google_sheets")} onDisconnect={() => handleDisconnect("google_sheets")} />}
      {openModal === "zapier" && <ZapierModal onClose={handleModalClose("zapier")} />}
      {openModal === "teams" && <TeamsModal onClose={handleModalClose("teams")} />}
      {openModal === "google_drive" && <GoogleDriveModal onClose={handleModalClose("google_drive")} isConnected={connectedIds.has("google_drive")} onDisconnect={() => handleDisconnect("google_drive")} />}
      {openModal === "dropbox" && <DropboxModal onClose={handleModalClose("dropbox")} />}
      {openModal === "make" && <MakeModal onClose={handleModalClose("make")} />}
      {openModal === "email_smtp" && <EmailAlertsModal onClose={handleModalClose("email_smtp")} />}
      {openModal === "plaid" && <PlaidModal onClose={handleModalClose("plaid")} onConnected={() => setConnectedIds(prev => new Set(prev).add("plaid"))} />}
      {openModal === "guesty" && <PMSModal provider="guesty" open={true} onClose={() => setOpenModal(null)} />}
      {openModal === "hostaway" && <PMSModal provider="hostaway" open={true} onClose={() => setOpenModal(null)} />}
      {openModal === "ownerrez" && <PMSModal provider="ownerrez" open={true} onClose={() => setOpenModal(null)} />}
      {openModal === "hospitable" && <PMSModal provider="hospitable" open={true} onClose={() => setOpenModal(null)} />}
      {openModal === "hospitable_connect" && <PMSModal provider="hospitable_connect" open={true} onClose={() => setOpenModal(null)} />}
      {openModal === "lodgify" && <PMSModal provider="lodgify" open={true} onClose={() => setOpenModal(null)} />}
      {/* Note: modals call onClose() without didConnect=true, so closing a modal
          does NOT mark the integration as connected. In production, the OAuth
          callback or API verification will call onClose with didConnect=true. */}
    </div>
    </UpgradeGate>
  );
}
