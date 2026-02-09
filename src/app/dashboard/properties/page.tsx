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
          <p className="text-muted-foreground mt-1.5 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{properties.length}</span> properties managed
          </p>
        </div>
        <Link 
          href="/dashboard/properties/new" 
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-white font-medium rounded-xl text-sm min-h-[44px] transition-all duration-200 hover:translate-y-[-1px] shrink-0"
          style={{
            background: 'linear-gradient(180deg, #14B8A6 0%, #0d9488 100%)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
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
