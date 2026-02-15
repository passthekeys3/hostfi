"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Info, AlertCircle } from "lucide-react";
import { isDemoMode } from "@/lib/data/data-provider";
import { AddressAutocomplete, type AddressData } from "@/components/address-autocomplete";

const PROPERTY_TYPES = [
  { value: "str", label: "Short-Term Rental" },
  { value: "ltr", label: "Long-Term Rental" },
  { value: "primary", label: "Primary Residence" },
];

export function AddPropertyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo = isDemoMode();

  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const handleAddressSelect = (address: AddressData) => {
    if (cityRef.current) cityRef.current.value = address.city;
    if (stateRef.current) stateRef.current.value = address.state;
    if (zipRef.current) zipRef.current.value = address.zip;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (demo) {
      setTimeout(() => { router.push("/dashboard/properties"); }, 500);
      return;
    }

    try {
      const form = new FormData(e.currentTarget);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) { setError("Database not configured."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("You must be logged in to add a property.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("properties").insert({
        user_id: user.id,
        name: form.get("name") as string,
        property_type: form.get("property_type") as string,
        address_line1: form.get("address_line1") as string,
        address_line2: (form.get("address_line2") as string) || null,
        city: form.get("city") as string,
        state: form.get("state") as string,
        zip: form.get("zip") as string,
        bedrooms: parseInt(form.get("bedrooms") as string) || 1,
        bathrooms: parseFloat(form.get("bathrooms") as string) || 1,
        sqft: form.get("sqft") ? parseInt(form.get("sqft") as string) : null,
        status: "active",
      });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard/properties");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm transition-all";

  return (
    <>
      {demo && (
        <div className="max-w-xl mb-4 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-sm text-muted-foreground flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" /> Demo Mode — Data won&apos;t be saved
        </div>
      )}
      {error && (
        <div className="max-w-xl mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
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
          <label className="block text-sm font-medium mb-2">Address</label>
          <AddressAutocomplete onSelect={handleAddressSelect} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address Line 2</label>
          <input name="address_line2" placeholder="Unit A, Apt 3B, etc." className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input ref={cityRef} name="city" required placeholder="Los Angeles" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <input ref={stateRef} name="state" required placeholder="CA" maxLength={2} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">ZIP</label>
            <input ref={zipRef} name="zip" required placeholder="90001" className={inputClass} />
          </div>
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

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Property"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto min-h-[36px] px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
