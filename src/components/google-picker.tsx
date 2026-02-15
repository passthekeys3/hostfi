"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FolderOpen, FileSpreadsheet, Loader2 } from "lucide-react";

// Declare global types for Google Picker API
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
    };
    google: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          SPREADSHEETS: string;
          FOLDERS: string;
        };
        View: new (viewId: string) => GooglePickerView;
        DocsView: new (viewId: string) => GooglePickerDocsView;
        Action: {
          PICKED: string;
          CANCEL: string;
        };
      };
    };
  }
}

interface GooglePickerBuilder {
  addView(view: GooglePickerView | GooglePickerDocsView): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setDeveloperKey(key: string): GooglePickerBuilder;
  setAppId(appId: string): GooglePickerBuilder;
  setTitle(title: string): GooglePickerBuilder;
  setCallback(callback: (data: GooglePickerResult) => void): GooglePickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface GooglePickerView {
  setMimeTypes?(mimeTypes: string): GooglePickerView;
}

interface GooglePickerDocsView {
  setIncludeFolders(include: boolean): GooglePickerDocsView;
  setSelectFolderEnabled(enabled: boolean): GooglePickerDocsView;
  setMimeTypes(mimeTypes: string): GooglePickerDocsView;
}

interface GooglePickerResult {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    url: string;
    mimeType: string;
  }>;
}

export interface GooglePickerFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

export interface GooglePickerProps {
  accessToken: string;
  onSelect: (file: GooglePickerFile) => void;
  onCancel?: () => void;
  mode: "spreadsheet" | "folder";
  title?: string;
  buttonText?: string;
  className?: string;
  /** If true, fetches a fresh access token from the API before opening */
  autoRefreshToken?: boolean;
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Extract app ID from client ID (the number before .apps.googleusercontent.com)
function getAppId(clientId: string): string {
  const match = clientId.match(/^(\d+)/);
  return match ? match[1] : "";
}

export function GooglePicker({
  accessToken: initialAccessToken,
  onSelect,
  onCancel,
  mode,
  title,
  buttonText,
  className,
  autoRefreshToken = true,
}: GooglePickerProps) {
  const [loading, setLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const pickerLoadedRef = useRef(false);

  // Load Google API script
  useEffect(() => {
    if (pickerLoadedRef.current) {
      setApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-api-script");
    if (existingScript) {
      // Script already exists, wait for gapi
      const checkGapi = setInterval(() => {
        if (window.gapi && window.google?.picker) {
          setApiLoaded(true);
          pickerLoadedRef.current = true;
          clearInterval(checkGapi);
        }
      }, 100);
      return () => clearInterval(checkGapi);
    }

    const script = document.createElement("script");
    script.id = "google-api-script";
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("picker", () => {
        setApiLoaded(true);
        pickerLoadedRef.current = true;
      });
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove the script - other components might need it
    };
  }, []);

  const openPicker = useCallback(async () => {
    if (!apiLoaded || !window.google?.picker) {
      console.error("Google Picker API not loaded");
      return;
    }

    if (!GOOGLE_API_KEY) {
      console.error("NEXT_PUBLIC_GOOGLE_API_KEY is not set");
      return;
    }

    setLoading(true);

    // Always fetch a fresh token to avoid expiry issues
    let accessToken = initialAccessToken;
    if (autoRefreshToken) {
      try {
        const res = await fetch("/api/integrations/google/access-token");
        const data = await res.json();
        if (data.access_token) accessToken = data.access_token;
      } catch {
        // Fall back to the provided token
      }
    }

    try {
      const appId = getAppId(GOOGLE_CLIENT_ID);
      let view: GooglePickerView | GooglePickerDocsView;

      if (mode === "spreadsheet") {
        view = new window.google.picker.View(
          window.google.picker.ViewId.SPREADSHEETS
        );
      } else {
        // For folder selection, use DocsView with folder settings
        const docsView = new window.google.picker.DocsView(
          window.google.picker.ViewId.FOLDERS
        );
        docsView.setIncludeFolders(true);
        docsView.setSelectFolderEnabled(true);
        docsView.setMimeTypes("application/vnd.google-apps.folder");
        view = docsView;
      }

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setAppId(appId)
        .setTitle(title || (mode === "spreadsheet" ? "Select a Spreadsheet" : "Select a Folder"))
        .setCallback((data: GooglePickerResult) => {
          setLoading(false);
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            onSelect(data.docs[0]);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            onCancel?.();
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error("Error opening picker:", err);
      setLoading(false);
    }
  }, [apiLoaded, initialAccessToken, autoRefreshToken, mode, title, onSelect, onCancel]);

  const Icon = mode === "spreadsheet" ? FileSpreadsheet : FolderOpen;
  const defaultText = mode === "spreadsheet" ? "Choose Spreadsheet" : "Choose Folder";

  return (
    <button
      onClick={openPicker}
      disabled={loading || !apiLoaded}
      className={className || "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {buttonText || defaultText}
    </button>
  );
}
