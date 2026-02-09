import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Properties — HostFi",
};
import { PropertyCard } from "@/components/property-card";
import { DEMO_PROPERTIES, DEMO_EXPENSES } from "@/lib/data";
import { DEMO_BILLS } from "@/lib/types";
import { Plus } from "lucide-react";

export default function PropertiesPage() {
  // Data layer — returns demo data when Supabase is not configured
  const properties = DEMO_PROPERTIES;
  const bills = DEMO_BILLS;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{properties.length}</span> properties managed
          </p>
        </div>
        <Link 
          href="/dashboard/properties/new" 
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Property</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {properties.map((property) => {
          const propertyBills = bills.filter(b => b.utility_account?.property?.id === property.id);
          const propertyExpenses = DEMO_EXPENSES.filter(e => e.property_id === property.id);
          const monthlySpend = propertyExpenses.reduce((sum, e) => sum + e.amount, 0);
          return (
            <PropertyCard
              key={property.id}
              property={property}
              monthlySpend={monthlySpend}
              billCount={propertyBills.length}
            />
          );
        })}
      </div>
    </div>
  );
}
