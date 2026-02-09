"use client";

import { useState } from "react";
import { Link2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
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
  IntegrationCard,
  type Integration,
  type ConnectionStatus,
} from "@/components/integrations";

const INTEGRATIONS: Integration[] = [
  { id: "quickbooks", name: "QuickBooks Online", description: "Sync expenses, revenue, and categories to your QuickBooks ledger automatically.", category: "Accounting", status: "disconnected", logo: "QB", logoColor: "bg-[#2CA01C]", tier: "business", details: "Two-way sync: expenses, revenue, vendors, and categories. Auto-maps HostFi categories to your Chart of Accounts." },
  { id: "xero", name: "Xero", description: "Seamless two-way sync with Xero. Expenses, revenue, contacts, and tracking categories.", category: "Accounting", status: "disconnected", logo: "XO", logoColor: "bg-[#13B5EA]", tier: "business", details: "Two-way sync: expenses map to Xero bills/spend money transactions, revenue to invoices. Properties map to Tracking Categories for per-property reporting." },
  { id: "hostaway", name: "Hostaway", description: "Import reservations and revenue data directly from Hostaway.", category: "Property Management", status: "coming_soon", logo: "HA", logoColor: "bg-[#FF6B35]", tier: "pro" },
  { id: "guesty", name: "Guesty", description: "Sync bookings, payouts, and property data from your Guesty account.", category: "Property Management", status: "coming_soon", logo: "GY", logoColor: "bg-[#00BFA5]", tier: "business" },
  { id: "ownerrez", name: "OwnerRez", description: "Connect your OwnerRez account to import reservations and financial data.", category: "Property Management", status: "coming_soon", logo: "OR", logoColor: "bg-[#1A73E8]", tier: "pro" },
  { id: "plaid", name: "Bank Accounts (Plaid)", description: "Connect bank accounts to auto-import and categorize transactions.", category: "Banking", status: "coming_soon", logo: "PL", logoColor: "bg-[#111111]", tier: "pro" },
  { id: "melio", name: "Melio", description: "Pay bills directly from HostFi. ACH free on paid plans, CC at 2.9%.", category: "Payments", status: "disconnected", logo: "ML", logoColor: "bg-[#00C2FF]", tier: "free", details: "Pay any vendor by ACH, check, or credit card. Free tier: CC only (2.9% + 0.5%). Pro/Business: free ACH." },
  { id: "slack", name: "Slack", description: "Two-way sync: team members upload receipts and invoices in Slack, get alerts and summaries back.", category: "Team", status: "disconnected", logo: "SL", logoColor: "bg-[#4A154B]", tier: "business", details: "Slack → HostFi: Drop receipts/invoices in a channel, AI parses and uploads automatically. HostFi → Slack: Bill alerts, anomaly warnings, weekly digests, due date reminders." },
  { id: "teams", name: "Microsoft Teams", description: "Same as Slack — upload receipts in Teams, get alerts and AI-parsed expenses back.", category: "Team", status: "disconnected", logo: "MT", logoColor: "bg-[#6264A7]", tier: "business", details: "Teams → HostFi: Drop receipts/invoices in a channel, AI parses automatically. HostFi → Teams: Alerts, digests, approval cards with action buttons." },
  { id: "google_sheets", name: "Google Sheets", description: "Live sync expenses, revenue, and P&L to Google Sheets. Auto-updates as data changes.", category: "Spreadsheets", status: "disconnected", logo: "GS", logoColor: "bg-[#0F9D58]", tier: "pro", details: "Choose what to sync: expenses, revenue, P&L summary, or custom views. Creates a shared spreadsheet your CPA can access directly." },
  { id: "google_drive", name: "Google Drive", description: "Auto-backup all receipts, invoices, and reports to a Google Drive folder.", category: "Storage", status: "disconnected", logo: "GD", logoColor: "bg-[#4285F4]", tier: "pro", details: "Organized by property and month. Every parsed receipt, invoice PDF, and generated report automatically saved. Perfect for tax season documentation." },
  { id: "dropbox", name: "Dropbox", description: "Sync receipts and financial reports to Dropbox. Organized by property.", category: "Storage", status: "disconnected", logo: "DB", logoColor: "bg-[#0061FF]", tier: "pro", details: "Auto-organized by property and month. Receipts, invoices, and reports sync automatically. Share folders with your CPA for tax season." },
  { id: "zapier", name: "Zapier", description: "Connect HostFi to 5,000+ apps. Trigger workflows on new expenses, alerts, or revenue.", category: "Automation", status: "disconnected", logo: "ZP", logoColor: "bg-[#FF4A00]", tier: "business", details: "Triggers: new expense, new revenue, anomaly detected, bill due, monthly summary ready. Actions: create expense, add revenue, update property. Build custom automations with 5,000+ apps." },
  { id: "make", name: "Make (Integromat)", description: "Visual automation platform. Build complex workflows with HostFi data.", category: "Automation", status: "disconnected", logo: "MK", logoColor: "bg-[#6D00CC]", tier: "business", details: "Visual workflow builder with 1,500+ app integrations. Pre-built HostFi scenarios for expense tracking, anomaly alerts, and automated reporting." },
  { id: "sms_alerts", name: "SMS Alerts (Twilio)", description: "Get text message alerts for due bills, anomalies, and weekly spending summaries.", category: "Notifications", status: "disconnected", logo: "SM", logoColor: "bg-[#F22F46]", tier: "pro", details: "Configure which alerts go to SMS: bill due reminders, overdue alerts, anomaly detection, weekly digest. Set quiet hours so you're not woken up at 3 AM." },
  { id: "email_smtp", name: "Custom Email Alerts", description: "Send HostFi alerts to any email — your CPA, property manager, or team.", category: "Notifications", status: "disconnected", logo: "EM", logoColor: "bg-[#EA4335]", tier: "pro", details: "Configure custom recipients for different alert types. Send weekly digests to your CPA, anomaly alerts to your property manager, due reminders to yourself." },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map(i => i.category))];

export default function IntegrationsPage() {
  const [qbModal, setQbModal] = useState(false);
  const [xeroModal, setXeroModal] = useState(false);
  const [slackModal, setSlackModal] = useState(false);
  const [sheetsModal, setSheetsModal] = useState(false);
  const [zapierModal, setZapierModal] = useState(false);
  const [teamsModal, setTeamsModal] = useState(false);
  const [driveModal, setDriveModal] = useState(false);
  const [dropboxModal, setDropboxModal] = useState(false);
  const [makeModal, setMakeModal] = useState(false);
  const [smsModal, setSmsModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  const modalMap: Record<string, [boolean, (v: boolean) => void]> = {
    quickbooks: [qbModal, setQbModal],
    xero: [xeroModal, setXeroModal],
    slack: [slackModal, setSlackModal],
    google_sheets: [sheetsModal, setSheetsModal],
    zapier: [zapierModal, setZapierModal],
    teams: [teamsModal, setTeamsModal],
    google_drive: [driveModal, setDriveModal],
    dropbox: [dropboxModal, setDropboxModal],
    make: [makeModal, setMakeModal],
    sms_alerts: [smsModal, setSmsModal],
    email_smtp: [emailModal, setEmailModal],
  };

  const handleConnect = (id: string) => {
    const entry = modalMap[id];
    if (entry) { entry[1](true); return; }
    if (id === "melio") {
      setConnectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

  const makeCloseHandler = (id: string) => () => {
    const entry = modalMap[id];
    if (entry) entry[1](false);
    setConnectedIds(prev => new Set(prev).add(id));
  };

  const getStatus = (integration: Integration): ConnectionStatus => {
    if (connectedIds.has(integration.id)) return "connected";
    return integration.status;
  };

  const filtered = filter === "all" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === filter);

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
            <p className="text-sm text-gray-500">Connect Your Tools to Automate Your Workflow</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter integrations by category">
        <button 
          onClick={() => setFilter("all")} 
          aria-pressed={filter === "all"}
          className={cn("px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-500/40", filter === "all" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => setFilter(cat)} 
            aria-pressed={filter === cat}
            className={cn("px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-500/40", filter === cat ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50")}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map(integration => (
          <IntegrationCard key={integration.id} integration={integration} status={getStatus(integration)} onConnect={handleConnect} />
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
        <Zap className="w-6 h-6 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Need a different integration?</h3>
        <p className="text-xs text-gray-500 mb-4">Let us know what tools you use and we&apos;ll prioritize it.</p>
        <button className="px-4 py-2.5 text-xs font-medium text-teal-700 bg-white border border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-200 transition-colors">Request Integration</button>
      </div>

      {qbModal && <QuickBooksModal onClose={makeCloseHandler("quickbooks")} />}
      {xeroModal && <XeroModal onClose={makeCloseHandler("xero")} />}
      {slackModal && <SlackModal onClose={makeCloseHandler("slack")} />}
      {sheetsModal && <GoogleSheetsModal onClose={makeCloseHandler("google_sheets")} />}
      {zapierModal && <ZapierModal onClose={makeCloseHandler("zapier")} />}
      {teamsModal && <TeamsModal onClose={makeCloseHandler("teams")} />}
      {driveModal && <GoogleDriveModal onClose={makeCloseHandler("google_drive")} />}
      {dropboxModal && <DropboxModal onClose={makeCloseHandler("dropbox")} />}
      {makeModal && <MakeModal onClose={makeCloseHandler("make")} />}
      {smsModal && <SMSAlertsModal onClose={makeCloseHandler("sms_alerts")} />}
      {emailModal && <EmailAlertsModal onClose={makeCloseHandler("email_smtp")} />}
    </div>
  );
}
