"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Integration, ConnectionStatus } from "./types";
import type { ReactNode } from "react";

interface IntegrationCardProps {
  integration: Integration;
  status: ConnectionStatus;
  onConnect: (id: string) => void;
  onDisconnect?: (id: string) => void;
  /** Optional actions to show when connected (e.g., Sync All, Open Spreadsheet) */
  actions?: ReactNode;
}

export function IntegrationCard({ integration, status, onConnect, onDisconnect, actions }: IntegrationCardProps) {
  const isConnected = status === "connected";
  const isComingSoon = status === "coming_soon";

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 transition-all",
      isConnected ? "border-teal-200" : "border-gray-100 hover:border-gray-200"
    )}>
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
          !integration.logoUrl && integration.logoColor,
          !integration.logoUrl && "text-white text-xs font-bold"
        )}>
          {integration.logoUrl ? (
            <img
              src={integration.logoUrl}
              alt={integration.name}
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.classList.add(integration.logoColor, 'text-white', 'text-xs', 'font-bold');
                target.parentElement!.textContent = integration.logo;
              }}
            />
          ) : (
            integration.logo
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{integration.name}</h3>
            {isConnected && <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">{integration.description}</p>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {isComingSoon ? (
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              Soon
            </span>
          ) : isConnected ? (
            <button
              onClick={() => onConnect(integration.id)}
              aria-label={`Manage ${integration.name}`}
              className="text-[11px] font-medium text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-colors cursor-pointer"
            >
              Manage
            </button>
          ) : (
            <button
              onClick={() => onConnect(integration.id)}
              aria-label={`Connect ${integration.name}`}
              className="text-[11px] font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Connected actions row */}
      {isConnected && actions && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
