"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";

const PROPERTY_TYPES = [
  { value: "str", label: "Short-Term Rental" },
  { value: "ltr", label: "Long-Term Rental" },
  { value: "primary", label: "Primary Residence" },
];

export function AddPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { router.push("/dashboard/properties"); }, 500);
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm transition-all";

  return (
    <>
      <div className="max-w-xl mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0" /> Demo Mode — Data won&apos;t be saved
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-2">Property Name</label>
          <input name="name" required placeholder="Venice Beach Unit" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Property Type</label>
          <select name="property_type" className={inputClass}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address Line 1</label>
          <input name="address_line1" required placeholder="1234 Main St" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address Line 2</label>
          <input name="address_line2" placeholder="Unit A" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bedrooms</label>
            <input name="bedrooms" type="number" required min={1} placeholder="4" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bathrooms</label>
            <input name="bathrooms" type="number" required min={1} step={0.5} placeholder="2" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Square Footage</label>
          <input name="sqft" type="number" min={1} placeholder="Optional" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input name="city" required placeholder="Los Angeles" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <input name="state" required placeholder="CA" maxLength={2} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">ZIP</label>
            <input name="zip" required placeholder="90001" className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "Adding..." : "Add Property"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto min-h-[36px] px-4 py-2 bg-white text-foreground font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
