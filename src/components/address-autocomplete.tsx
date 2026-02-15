"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressData {
  address_line1: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressAutocompleteProps {
  onSelect: (address: AddressData) => void;
  defaultValue?: string;
  className?: string;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

export function AddressAutocomplete({ onSelect, defaultValue = "", className }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          setScriptLoaded(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          setScriptLoaded(true);
          clearInterval(check);
        }
      }, 50);
    };
    document.head.appendChild(script);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!scriptLoaded || input.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address", "subpremise", "premise"],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Suggestion[] = (results || []).slice(0, 5).map((s: any) => {
        const prediction = s.placePrediction;
        const mainText = prediction?.mainText?.text || "";
        const secondaryText = prediction?.secondaryText?.text || "";
        return {
          placeId: prediction?.placeId || "",
          mainText,
          secondaryText,
          description: prediction?.text?.text || `${mainText}, ${secondaryText}`,
        };
      });

      setSuggestions(mapped);
      setShowDropdown(mapped.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [scriptLoaded]);

  const handleInput = (value: string) => {
    setQuery(value);
    setSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSelect = async (suggestion: Suggestion) => {
    try {
      const place = new google.maps.places.Place({ id: suggestion.placeId });
      await place.fetchFields({ fields: ["addressComponents", "formattedAddress"] });

      const components = place.addressComponents || [];
      const get = (type: string) => components.find((c: { types: string[] }) => c.types.includes(type));

      const streetNumber = get("street_number")?.longText || "";
      const route = get("route")?.longText || "";
      const city = get("locality")?.longText || get("sublocality_level_1")?.longText || get("administrative_area_level_2")?.longText || "";
      const state = get("administrative_area_level_1")?.shortText || "";
      const zip = get("postal_code")?.longText || "";

      const address_line1 = streetNumber ? `${streetNumber} ${route}` : route;

      setQuery(address_line1);
      setSelected(true);
      setShowDropdown(false);
      setSuggestions([]);

      onSelect({ address_line1, city, state, zip });
    } catch {
      // Fallback - just use the suggestion text
      setQuery(suggestion.mainText);
      setSelected(true);
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={apiKey ? "Start typing an address..." : "1234 Main St"}
          name="address_line1"
          required
          autoComplete="off"
          className={cn(
            "w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm transition-all",
            selected && "border-teal-300 bg-teal-50/30",
            className
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1.5 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
        >
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.mainText}</p>
                <p className="text-xs text-gray-500 truncate">{s.secondaryText}</p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50/50">
            <img src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" alt="Powered by Google" className="h-3 opacity-50" />
          </div>
        </div>
      )}
    </div>
  );
}
