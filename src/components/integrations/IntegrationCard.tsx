"use client";

import { Check, AlertCircle, Clock, RefreshCw, Settings2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Integration, ConnectionStatus } from "./types";

interface IntegrationCardProps {
  integration: Integration;
  status: ConnectionStatus;
  onConnect: (id: string) => void;
}

export function IntegrationCard({ integration, status, onConnect }: IntegrationCardProps) {
  const isConnected = status === "connected";
  const isComingSoon = status === "coming_soon";

  return (
    <div className={cn("bg-white rounded-xl border p-4 sm:p-5 transition-all", isConnected ? "border-teal-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-gray-300")}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0", integration.logoColor)}>{integration.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start sm:items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", integration.tier === "business" ? "text-blue-700 bg-blue-50" : integration.tier === "pro" ? "text-teal-700 bg-teal-50" : "text-gray-500 bg-gray-100")}>{integration.tier}</span>
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold rounded-full border",
                status === "connected" ? "bg-teal-50 text-teal-700 border-teal-200" :
                status === "error" ? "bg-rose-50 text-rose-600 border-rose-200" :
                status === "coming_soon" ? "bg-amber-50 text-amber-600 border-amber-200" :
                "bg-gray-50 text-gray-500 border-gray-200"
              )}>
                {status === "connected" && <Check className="w-3 h-3" />}
                {status === "error" && <AlertCircle className="w-3 h-3" />}
                {status === "connected" ? "Connected" : status === "error" ? "Error" : status === "coming_soon" ? "Soon" : "Not Connected"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>
          {isConnected && integration.lastSync && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400"><Clock className="w-3 h-3" /> Last synced: {integration.lastSync}</div>
          )}
          {isConnected && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button aria-label={`Sync ${integration.name} now`} className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 min-h-[36px] sm:min-h-0"><RefreshCw className="w-3 h-3" aria-hidden="true" /> Sync Now</button>
              <button aria-label={`${integration.name} settings`} className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 min-h-[36px] sm:min-h-0"><Settings2 className="w-3 h-3" aria-hidden="true" /> Settings</button>
            </div>
          )}
        </div>
        <div className="shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
          {isComingSoon ? (
            <button disabled aria-label={`${integration.name} coming soon`} className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed min-h-[44px] sm:min-h-0">Coming Soon</button>
          ) : isConnected ? (
            <button aria-label={`Disconnect ${integration.name}`} className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 min-h-[44px] sm:min-h-0">Disconnect</button>
          ) : (
            <button onClick={() => onConnect(integration.id)} aria-label={`Connect ${integration.name}`} className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40 min-h-[44px] sm:min-h-0"><Zap className="w-3 h-3" aria-hidden="true" /> Connect</button>
          )}
        </div>
      </div>
      {integration.details && !isConnected && !isComingSoon && (
        <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-[11px] text-gray-400 leading-relaxed">{integration.details}</p></div>
      )}
    </div>
  );
}
