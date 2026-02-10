"use client";

import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Integration, ConnectionStatus } from "./types";

interface IntegrationCardProps {
  integration: Integration;
  status: ConnectionStatus;
  onConnect: (id: string) => void;
  onDisconnect?: (id: string) => void;
}

export function IntegrationCard({ integration, status, onConnect, onDisconnect }: IntegrationCardProps) {
  const isConnected = status === "connected";
  const isComingSoon = status === "coming_soon";

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 flex items-center gap-4 transition-all",
      isConnected ? "border-teal-200" : "border-gray-100 hover:border-gray-200"
    )}>
      {/* Logo */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0",
        integration.logoColor
      )}>
        {integration.logo}
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
            onClick={() => onDisconnect?.(integration.id)}
            aria-label={`Disconnect ${integration.name}`}
            className="text-[11px] font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Disconnect
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
  );
}
