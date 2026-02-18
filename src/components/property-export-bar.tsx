"use client";

import { useState } from "react";
import { Download, FileText, Share2, X, Check, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/expense-categories";
import { EXPENSE_CATEGORY_CONFIG } from "@/lib/expense-categories";

interface Property {
  id: string;
  name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip: string;
  property_type: string;
}

interface Expense {
  id: string;
  date: string;
  vendor?: string | null;
  amount: number;
  category: string;
  description?: string | null;
  status?: string;
}

interface PropertyExportBarProps {
  property: Property;
  expenses: Expense[];
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
}

export function PropertyExportBar({ property, expenses, expensesByCategory, totalExpenses }: PropertyExportBarProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [shared, setShared] = useState(false);

  function downloadCSV() {
    const headers = ["Date", "Vendor", "Category", "Amount", "Description", "Status"];
    const rows = expenses.map(e => [
      e.date,
      e.vendor ?? "Unknown",
      EXPENSE_CATEGORY_CONFIG[e.category as ExpenseCategory]?.label ?? e.category,
      e.amount.toFixed(2),
      e.description ?? "",
      e.status ?? "confirmed",
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(["", "", "", "", "", ""]);
    rows.push(["SUMMARY", "", "", "", "", ""]);
    rows.push(["Total Expenses", "", "", totalExpenses.toFixed(2), "", ""]);
    rows.push(["Number of Transactions", "", "", expenses.length.toString(), "", ""]);
    rows.push([]);

    Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, amount]) => {
        const label = EXPENSE_CATEGORY_CONFIG[cat as ExpenseCategory]?.label ?? cat;
        rows.push(["", label, "", amount.toFixed(2), "", ""]);
      });

    const csvContent = [
      `Property: ${property.name}`,
      `Address: ${property.address_line1}, ${property.city}, ${property.state} ${property.zip}`,
      `Report Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      "",
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${property.name.replace(/\s+/g, "-").toLowerCase()}-expenses-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    // Generate a print-friendly HTML report and trigger print dialog (Save as PDF)
    const categoryRows = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => {
        const label = EXPENSE_CATEGORY_CONFIG[cat as ExpenseCategory]?.label ?? cat;
        const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${amount.toFixed(2)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#666">${pct}%</td></tr>`;
      })
      .join("");

    const expenseRows = expenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(e => {
        const catLabel = EXPENSE_CATEGORY_CONFIG[e.category as ExpenseCategory]?.label ?? e.category;
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${e.vendor ?? "Unknown"}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px">${catLabel}</td><td style="padding:6px 12px;border-bottom:1px solid #f3f3f3;font-size:13px;text-align:right">$${e.amount.toFixed(2)}</td></tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><title>${property.name} — Expense Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color: #111827; max-width: 800px; margin: 0 auto; padding: 40px 24px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 15px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 32px 0 12px; }
  .address { color: #6b7280; font-size: 14px; margin-top: 4px; }
  .date { color: #9ca3af; font-size: 12px; margin-top: 8px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 24px 0; }
  .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  .summary-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${property.name}</h1>
<p class="address">${property.address_line1}${property.address_line2 ? `, ${property.address_line2}` : ""}, ${property.city}, ${property.state} ${property.zip}</p>
<p class="date">Report generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

<div class="summary-grid">
  <div class="summary-card"><div class="summary-label">Total Expenses</div><div class="summary-value">$${totalExpenses.toFixed(2)}</div></div>
  <div class="summary-card"><div class="summary-label">Transactions</div><div class="summary-value">${expenses.length}</div></div>
  <div class="summary-card"><div class="summary-label">Categories</div><div class="summary-value">${Object.keys(expensesByCategory).length}</div></div>
</div>

<h2>Breakdown by Category</h2>
<table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th></tr></thead><tbody>${categoryRows}<tr style="font-weight:700"><td style="padding:10px 12px;border-top:2px solid #e5e7eb">Total</td><td style="padding:10px 12px;border-top:2px solid #e5e7eb;text-align:right">$${totalExpenses.toFixed(2)}</td><td style="padding:10px 12px;border-top:2px solid #e5e7eb;text-align:right">100%</td></tr></tbody></table>

<h2>All Expenses</h2>
<table><thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>${expenseRows}</tbody></table>

<div class="footer">Generated by HostFi · hostfi.ai</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  function handleShare() {
    // Download CSV first
    downloadCSV();

    // Open email client
    const subject = encodeURIComponent(`${property.name} — Expense Report`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find attached the expense report for ${property.name}.\n\nAddress: ${property.address_line1}, ${property.city}, ${property.state} ${property.zip}\nTotal Expenses: ${formatCurrency(totalExpenses)}\nTransactions: ${expenses.length}\n\nPlease review and let me know if you have any questions.\n\nBest regards`
    );
    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`);

    setShared(true);
    setTimeout(() => {
      setShared(false);
      setShowShareModal(false);
      setOwnerEmail("");
    }, 2000);
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          onClick={downloadPDF}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" /> Export PDF
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5" /> Share With Owner
        </button>
      </div>

      {/* Share with Owner Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Share With Owner</h3>
              <button onClick={() => setShowShareModal(false)} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {shared ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-teal-500" />
                  </div>
                  <p className="font-semibold text-gray-900">CSV Downloaded & Email Opened</p>
                  <p className="text-sm text-gray-500 mt-1">Attach the CSV file to the email and send.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    This will download a CSV report for <strong>{property.name}</strong> only and open your email client to send it.
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-700">
                      The report contains only this property&apos;s expenses — no data from your other properties is included.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner&apos;s Email</label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={e => setOwnerEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <button
                    onClick={handleShare}
                    disabled={!ownerEmail || !ownerEmail.includes("@")}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
                  >
                    <Mail className="w-4 h-4" /> Download & Send
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
