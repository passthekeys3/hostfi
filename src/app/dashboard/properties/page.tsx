"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { Plus, Building2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function PropertiesPage() {
  const { properties, expenses, loading } = useDashboardData();
  const [cmStr, setCmStr] = useState('');
  useEffect(() => {
    const n = new Date();
    setCmStr(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{properties.length}</span> {properties.length === 1 ? 'property' : 'properties'} managed
          </p>
        </div>
        <Link 
          href="/dashboard/properties/new" 
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Property</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No properties yet</p>
          <Link href="/dashboard/properties/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Your First Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {properties.map((property) => {
            const propertyExpenses = expenses.filter(e => e.property_id === property.id);
            const monthlySpend = propertyExpenses.filter(e => cmStr ? e.date?.startsWith(cmStr) : false).reduce((sum, e) => sum + e.amount, 0);
            return (
              <PropertyCard
                key={property.id}
                property={property}
                monthlySpend={monthlySpend}
                billCount={propertyExpenses.length}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
