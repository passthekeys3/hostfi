"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-gray-300 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Something Went Wrong</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors">
        <RotateCcw className="w-4 h-4" /> Try Again
      </button>
    </div>
  );
}
