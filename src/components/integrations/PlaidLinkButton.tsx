"use client";

import { useState, useCallback } from "react";
import { Landmark, RefreshCw, Check, AlertCircle } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess?: (accounts: Array<{ account_id: string; name: string; type: string; mask: string | null }>, institution: { name: string } | null) => void;
  onError?: (error: string) => void;
  accessToken?: string; // For update mode
  className?: string;
  children?: React.ReactNode;
}

/**
 * Plaid Link button — handles the full flow:
 * 1. Creates a link token from our API
 * 2. Opens Plaid Link widget (or simulates in demo mode)
 * 3. Exchanges public token for access token
 * 4. Returns connected accounts
 */
export function PlaidLinkButton({
  onSuccess,
  onError,
  accessToken,
  className,
  children,
}: PlaidLinkButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "linking" | "exchanging" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      // Step 1: Get link token
      const tokenRes = await fetch("/api/integrations/plaid/link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to create link token");
      }

      const tokenData = await tokenRes.json();

      // Demo mode — simulate the flow
      if (tokenData.demo) {
        setStatus("linking");
        await new Promise(r => setTimeout(r, 1500));

        setStatus("exchanging");
        const exchangeRes = await fetch("/api/integrations/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: "demo-public-token" }),
        });

        if (!exchangeRes.ok) throw new Error("Failed to exchange token");
        const exchangeData = await exchangeRes.json();

        setStatus("success");
        onSuccess?.(exchangeData.accounts, exchangeData.institution);
        return;
      }

      // Production mode — load and open Plaid Link
      setStatus("linking");
      await openPlaidLink(tokenData.link_token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMessage(msg);
      setStatus("error");
      onError?.(msg);
    }
  }, [accessToken, onSuccess, onError]);

  async function openPlaidLink(linkToken: string) {
    // Dynamically load Plaid Link SDK
    if (!(window as unknown as Record<string, unknown>).Plaid) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Plaid SDK"));
        document.head.appendChild(script);
      });
    }

    const Plaid = (window as unknown as Record<string, unknown>).Plaid as {
      create: (config: Record<string, unknown>) => { open: () => void; destroy: () => void };
    };

    const handler = Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: Record<string, unknown>) => {
        setStatus("exchanging");
        try {
          const exchangeRes = await fetch("/api/integrations/plaid/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token: publicToken }),
          });

          if (!exchangeRes.ok) throw new Error("Failed to exchange token");
          const exchangeData = await exchangeRes.json();

          setStatus("success");
          onSuccess?.(exchangeData.accounts, exchangeData.institution);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Exchange failed";
          setErrorMessage(msg);
          setStatus("error");
          onError?.(msg);
        }

        handler.destroy();
      },
      onExit: (err: unknown) => {
        if (err) {
          const msg = typeof err === "object" && err !== null && "error_message" in err
            ? String((err as Record<string, unknown>).error_message)
            : "Link exited with error";
          setErrorMessage(msg);
          setStatus("error");
          onError?.(msg);
        } else {
          setStatus("idle");
        }
        handler.destroy();
      },
      onEvent: (eventName: string) => {
        // Could log events for analytics
      },
    });

    handler.open();
  }

  const buttonText = () => {
    switch (status) {
      case "loading": return "Preparing...";
      case "linking": return "Connecting Bank...";
      case "exchanging": return "Securing Connection...";
      case "success": return "Connected";
      case "error": return "Try Again";
      default: return children || "Connect Bank Account";
    }
  };

  const buttonIcon = () => {
    switch (status) {
      case "loading":
      case "linking":
      case "exchanging":
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case "success":
        return <Check className="w-4 h-4" />;
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Landmark className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status === "loading" || status === "linking" || status === "exchanging" || status === "success"}
        className={className || "flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 rounded-xl transition-colors cursor-pointer"}
      >
        {buttonIcon()}
        {buttonText()}
      </button>
      {errorMessage && status === "error" && (
        <p className="mt-2 text-xs text-red-500 text-center">{errorMessage}</p>
      )}
    </div>
  );
}
