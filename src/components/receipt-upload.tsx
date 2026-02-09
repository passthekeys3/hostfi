"use client";

import { useState, useRef, useCallback } from "react";
import type { ParsedReceipt } from "@/lib/receipt-parser";
import type { ExpenseCategory } from "@/lib/expense-categories";
import { EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";
import { Camera, Upload, X, ChevronDown, ChevronUp, Check, AlertCircle, Loader2 } from "lucide-react";

interface ReceiptUploadProps {
  onDataReady: (data: {
    amount: number;
    vendor: string;
    date: string;
    category: ExpenseCategory;
  }) => void;
}

type UploadState = "idle" | "preview" | "scanning" | "parsed" | "error";

export default function ReceiptUpload({ onDataReady }: ReceiptUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Please upload an image (JPG, PNG, HEIC) or PDF");
      setState("error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      // Extract base64 data (remove data:...;base64, prefix)
      const base64 = result.split(",")[1];
      const mimeType = file.type || "image/jpeg";
      setImageData({ base64, mimeType });
      setState("preview");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleScan = async () => {
    if (!imageData) return;
    setState("scanning");
    setError(null);

    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mimeType: imageData.mimeType,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse receipt");
      }

      const data: ParsedReceipt = await response.json();
      setParsedData(data);
      setState("parsed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan receipt");
      setState("error");
    }
  };

  const handleUseData = () => {
    if (!parsedData) return;
    onDataReady({
      amount: parsedData.amount,
      vendor: parsedData.vendor_name,
      date: parsedData.date || new Date().toISOString().split("T")[0],
      category: parsedData.category_suggestion,
    });
  };

  const reset = () => {
    setState("idle");
    setPreviewUrl(null);
    setImageData(null);
    setParsedData(null);
    setError(null);
    setShowItems(false);
  };

  // Idle state — upload zone
  if (state === "idle") {
    return (
      <div className="space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200",
            isDragging
              ? "border-teal-400 bg-teal-50/50"
              : "border-gray-200 hover:border-teal-400/60 bg-gray-50"
          )}
        >
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground/80">
            Drop a receipt image or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, HEIC, or PDF — up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {/* Mobile camera button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all shadow-sm min-h-[48px]"
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    );
  }

  // Preview state — show thumbnail + scan button
  if (state === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4 bg-white rounded-2xl border border-gray-200/60 p-4 shadow-sm">
          {previewUrl && (
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
              {/* Using <img> instead of next/image for base64 data URL support */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Receipt ready to scan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI will extract vendor, amount, date, and line items
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleScan}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Scan Receipt
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-foreground text-sm font-medium rounded-xl hover:bg-gray-100 transition-all border border-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Scanning state
  if (state === "scanning") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/60 p-8 shadow-sm text-center">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          <p className="text-sm font-medium text-foreground/80">
            Scanning receipt…
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Reading vendor, amount, and line items
        </p>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="bg-white rounded-2xl border border-red-200/60 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Failed to scan receipt
            </p>
            <p className="text-xs text-red-500/80 mt-0.5">{error}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-sm text-teal-600 font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Parsed state — show extracted data
  if (state === "parsed" && parsedData) {
    const catConfig = EXPENSE_CATEGORY_CONFIG[parsedData.category_suggestion];
    const catColors = getCategoryColorClasses(catConfig.color);

    return (
      <div className="bg-white rounded-2xl border border-teal-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-teal-50/50 border-b border-teal-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <p className="text-sm font-semibold text-teal-800">
                Receipt scanned
              </p>
            </div>
            <span className="text-xs text-teal-600/70 font-medium">
              {Math.round(parsedData.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary row */}
          <div className="flex items-start gap-4">
            {previewUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                {/* Using <img> instead of next/image for base64 data URL support */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="font-semibold text-base">{parsedData.vendor_name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground text-lg">
                  ${parsedData.amount.toFixed(2)}
                </span>
                {parsedData.date && (
                  <span>{parsedData.date}</span>
                )}
                {parsedData.payment_method && (
                  <span className="text-xs">{parsedData.payment_method}</span>
                )}
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border",
                  catColors.bg,
                  catColors.border
                )}
              >
                <catConfig.icon className="w-3 h-3" /> {catConfig.label}
              </span>
            </div>
          </div>

          {/* Line items (collapsible) */}
          {parsedData.items.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showItems ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {parsedData.items.length} line items
              </button>
              {showItems && (
                <div className="mt-2 space-y-1">
                  {parsedData.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-gray-50"
                    >
                      <span className="text-foreground/80 truncate mr-2">
                        {item.description}
                      </span>
                      <span className="font-medium shrink-0">
                        ${item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {parsedData.tax_amount != null && (
                    <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg text-muted-foreground">
                      <span>Tax</span>
                      <span>${parsedData.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleUseData}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-all shadow-sm min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              Use this data
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2.5 bg-white text-foreground text-sm font-medium rounded-xl hover:bg-gray-100 transition-all border border-gray-200 shadow-sm min-h-[44px]"
            >
              Rescan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
