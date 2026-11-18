import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type LucideIcon, Zap, Flame, Droplets, Wifi, Trash2, Home, Shield, ClipboardList } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
}

/** Calendar date from a date-only string. `new Date('YYYY-MM-DD')` is UTC midnight and shifts the day in the US. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayDateInput(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDate(date: string | null): string {
  const parsed = parseDateOnly(date);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${count} ${word}`;
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
    case 'arbitrage': return 'Rental Arbitrage';
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
