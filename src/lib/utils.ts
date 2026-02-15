import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type LucideIcon, Zap, Flame, Droplets, Wifi, Trash2, Home, Shield, ClipboardList } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'overdue': return 'bg-red-500/10 text-red-600 border-red-500/20';
    case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'active': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'inactive': return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
  }
}

export function getPropertyTypeLabel(type: string): string {
  switch (type) {
    case 'str': return 'Short-Term Rental';
    case 'ltr': return 'Long-Term Rental';
    case 'primary': return 'Primary Residence';
    default: return type;
  }
}

export function getUtilityIcon(type: string): LucideIcon {
  switch (type) {
    case 'electric': return Zap;
    case 'gas': return Flame;
    case 'water': return Droplets;
    case 'internet': return Wifi;
    case 'trash': return Trash2;
    case 'rent': return Home;
    case 'insurance': return Shield;
    default: return ClipboardList;
  }
}
