import Link from "next/link";
import { Property } from "@/lib/types";
import { cn, getPropertyTypeLabel, formatCurrency } from "@/lib/utils";
import { Building2, MapPin, Home, Hotel, KeyRound } from "lucide-react";

interface PropertyCardProps {
  property: Property;
  monthlySpend?: number;
  monthlyRevenue?: number;
  billCount?: number;
}

const propertyTypeConfig = {
  str: { label: 'STR', color: 'bg-violet-50 text-violet-700 ring-violet-200/60', icon: Hotel },
  ltr: { label: 'LTR', color: 'bg-blue-50 text-blue-700 ring-blue-200/60', icon: Home },
  primary: { label: 'Primary', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', icon: Home },
  arbitrage: { label: 'Arbitrage', color: 'bg-amber-50 text-amber-700 ring-amber-200/60', icon: KeyRound },
};

export function PropertyCard({ property, monthlySpend = 0, monthlyRevenue = 0, billCount = 0 }: PropertyCardProps) {
  const typeConfig = propertyTypeConfig[property.property_type] || propertyTypeConfig.ltr;
  const TypeIcon = typeConfig.icon;

  return (
    <Link href={`/dashboard/properties/${property.id}`}>
      <div 
        className="group bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:translate-y-[-3px] border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      >
        {/* Hover shadow enhancement handled via className */}
        
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(20, 184, 166, 0.06) 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 1px 2px rgba(20, 184, 166, 0.08)',
            }}
          >
            <Building2 className="w-5 h-5 text-accent" />
          </div>
          
          {/* Property type badge - more prominent */}
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 transition-all duration-200",
            typeConfig.color
          )}>
            <TypeIcon className="w-3 h-3" />
            {typeConfig.label}
          </div>
        </div>
        
        {/* Property info */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors duration-200">
            {property.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {property.bedrooms} bed · {property.bathrooms} bath
          </p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{property.city}, {property.state}</span>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className={cn(
            "w-2 h-2 rounded-full transition-all duration-200",
            property.status === 'active' 
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
              : 'bg-gray-300'
          )} />
          <span className="text-xs text-muted-foreground capitalize font-medium">
            {property.status}
          </span>
        </div>
        
        {/* Footer stats */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200/80">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Monthly Revenue</p>
            <p className="font-bold text-lg tabular-nums mt-0.5 text-teal-600" style={{ letterSpacing: '-0.02em' }}>
              {formatCurrency(monthlyRevenue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Monthly Spend</p>
            <p className="font-bold text-lg tabular-nums mt-0.5" style={{ letterSpacing: '-0.02em' }}>
              {formatCurrency(monthlySpend)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
