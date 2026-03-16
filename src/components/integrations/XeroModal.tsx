"use client";

import { useState, useId, useCallback } from "react";
import Image from "next/image";
import { Check, X, Download, FileSpreadsheet, ChevronRight, ExternalLink, Shield, Info } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

type ExportFormat = "bills" | "bank" | "journal";

export function XeroConnectModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "export" | "success">("intro");
  const [format, setFormat] = useState<ExportFormat>("bills");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError("");
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/export/xero?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(data.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `hostfi_xero_${format}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [format, dateFrom, dateTo]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image src="/logos/xero.svg" alt="Xero" width={40} height={40} className="rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Xero Export</h2>
              <p className="text-xs text-gray-500 mt-0.5">Export expenses in Xero format</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === "intro" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Export your expenses for Xero</h4>
                <p className="text-xs text-gray-500">Download a CSV file ready to import into Xero. Choose the format that matches how you want the data in Xero.</p>
              </div>
              
              <div className="space-y-3">
                {[
                  { 
                    value: "bills" as ExportFormat, 
                    label: "Bills (Accounts Payable)", 
                    desc: "Each expense becomes a Xero bill. Best for tracking vendor payments and AP aging.",
                    recommended: true,
                  },
                  { 
                    value: "bank" as ExportFormat, 
                    label: "Bank Statement", 
                    desc: "Import as bank transactions for reconciliation. Use if you match expenses to bank feeds.",
                  },
                  { 
                    value: "journal" as ExportFormat, 
                    label: "Manual Journals", 
                    desc: "Double-entry journal format. Best for CPAs who want full control over debits and credits.",
                  },
                ].map((opt) => (
                  <label key={opt.value} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    format === opt.value ? "border-teal-400 bg-teal-50/50" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="format"
                      value={opt.value}
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="mt-0.5 accent-teal-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                        {opt.recommended && (
                          <span className="text-[10px] font-medium text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">Recommended</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button onClick={() => setStep("export")} className="w-full py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors flex items-center justify-center gap-2">
                Next: Select Date Range <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">Live two-way Xero sync via OAuth is coming soon. For now, use CSV export to get your data into Xero.</p>
              </div>
            </div>
          )}

          {step === "export" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Date range</h4>
                <p className="text-xs text-gray-500">Leave empty to export all expenses.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-gray-700">Export summary</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Format</span>
                  <span className="font-medium text-gray-700 capitalize">{format === "bills" ? "Xero Bills" : format === "bank" ? "Bank Statement" : "Manual Journals"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Date range</span>
                  <span className="font-medium text-gray-700">
                    {dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `From ${dateFrom}` : dateTo ? `To ${dateTo}` : "All time"}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("intro")} className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleExport} disabled={exporting} className="flex-1 py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {exporting ? "Exporting..." : <><Download className="w-4 h-4" /> Export CSV</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-teal-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Export Complete</h4>
                <p className="text-sm text-gray-500 mt-1">Your CSV file has been downloaded.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                <p className="text-xs font-semibold text-gray-900">How to import into Xero:</p>
                <ol className="space-y-2 text-xs text-gray-600 list-decimal pl-4">
                  {format === "bills" && (
                    <>
                      <li>Go to <strong>Business &gt; Bills to pay</strong> in Xero</li>
                      <li>Click <strong>Import</strong> in the top right</li>
                      <li>Upload the downloaded CSV file</li>
                      <li>Map the columns (should auto-detect)</li>
                      <li>Review and confirm the import</li>
                    </>
                  )}
                  {format === "bank" && (
                    <>
                      <li>Go to <strong>Accounting &gt; Bank accounts</strong> in Xero</li>
                      <li>Select your rental expense account</li>
                      <li>Click <strong>Import a Statement</strong></li>
                      <li>Upload the downloaded CSV file</li>
                      <li>Review and reconcile transactions</li>
                    </>
                  )}
                  {format === "journal" && (
                    <>
                      <li>Go to <strong>Accounting &gt; Manual journals</strong> in Xero</li>
                      <li>Click <strong>Import</strong></li>
                      <li>Upload the downloaded CSV file</li>
                      <li>Verify debits and credits balance</li>
                      <li>Post the journal entries</li>
                    </>
                  )}
                </ol>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("intro")} className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Export Again
                </button>
                <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
