// Demo analytics data — 12 months of realistic LA utility costs across 3 properties

export type UtilityType = 'rent' | 'electric' | 'gas' | 'water' | 'internet' | 'trash' | 'cleaning' | 'insurance' | 'maintenance' | 'supplies' | 'taxes' | 'management' | 'subscription';

export interface MonthlyBill {
  month: string; // YYYY-MM
  monthLabel: string; // "Mar 2025"
  property_id: string;
  property_name: string;
  utility_type: UtilityType;
  amount: number;
}

const MONTHS = [
  '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08',
  '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
];

const MONTH_LABELS = [
  'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25',
  'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26',
];

function rand(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

// Seasonal multiplier: index 0=Mar ... 11=Feb
// Summer = higher electric, Winter = higher gas
const SEASON_ELECTRIC = [0.9, 0.95, 1.05, 1.2, 1.35, 1.4, 1.25, 1.1, 0.95, 0.85, 0.85, 0.88];
const SEASON_GAS = [1.1, 0.9, 0.7, 0.55, 0.5, 0.5, 0.55, 0.7, 0.9, 1.2, 1.3, 1.25];

interface PropertyConfig {
  id: string;
  name: string;
  rent: [number, number];
  electric: [number, number];
  gas: [number, number];
  water: [number, number];
  internet: [number, number];
  trash: [number, number];
}

const PROPERTIES: PropertyConfig[] = [
  {
    id: '1', name: 'Venice Beach Unit',
    rent: [3200, 3200], electric: [95, 115], gas: [40, 55],
    water: [45, 65], internet: [79.99, 79.99], trash: [35, 42],
  },
  {
    id: '2', name: 'Silver Lake Duplex',
    rent: [3500, 3500], electric: [110, 140], gas: [45, 65],
    water: [55, 75], internet: [89.99, 89.99], trash: [40, 48],
  },
  {
    id: '3', name: 'Joshua Tree Cabin',
    rent: [2800, 2800], electric: [80, 100], gas: [30, 45],
    water: [40, 55], internet: [69.99, 69.99], trash: [30, 38],
  },
];

function generateBills(): MonthlyBill[] {
  const bills: MonthlyBill[] = [];

  for (const prop of PROPERTIES) {
    for (let i = 0; i < MONTHS.length; i++) {
      const month = MONTHS[i];
      const label = MONTH_LABELS[i];

      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'rent', amount: prop.rent[0] });
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'electric', amount: rand(prop.electric[0], prop.electric[1]) * SEASON_ELECTRIC[i] });
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'gas', amount: rand(prop.gas[0], prop.gas[1]) * SEASON_GAS[i] });
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'water', amount: rand(prop.water[0], prop.water[1]) });
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'internet', amount: prop.internet[0] });
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'trash', amount: rand(prop.trash[0], prop.trash[1]) });

      // Non-utility expense types
      // Cleaning: ~2 turnovers per month for STRs
      if (prop.id !== '2') { // not the LTR
        bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'cleaning', amount: rand(280, 350) });
      }
      // Insurance: spread annual cost monthly
      bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'insurance', amount: 100 });
      // Maintenance: random, some months nothing
      if (Math.random() > 0.5) {
        bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'maintenance', amount: rand(50, 300) });
      }
      // Supplies: occasional
      if (Math.random() > 0.6) {
        bills.push({ month, monthLabel: label, property_id: prop.id, property_name: prop.name, utility_type: 'supplies', amount: rand(40, 150) });
      }
    }
  }

  // Add management fee for Silver Lake only
  for (let i = 0; i < MONTHS.length; i++) {
    bills.push({ month: MONTHS[i], monthLabel: MONTH_LABELS[i], property_id: '2', property_name: 'Silver Lake Duplex', utility_type: 'management', amount: 450 });
  }

  // Add subscription (PMS) — global, attributed to property 1
  for (let i = 0; i < MONTHS.length; i++) {
    bills.push({ month: MONTHS[i], monthLabel: MONTH_LABELS[i], property_id: '1', property_name: 'Venice Beach Unit', utility_type: 'subscription', amount: 29 });
  }

  // Add quarterly taxes for property 1
  for (let i = 0; i < MONTHS.length; i += 3) {
    bills.push({ month: MONTHS[i], monthLabel: MONTH_LABELS[i], property_id: '1', property_name: 'Venice Beach Unit', utility_type: 'taxes', amount: 1850 });
  }

  return bills;
}

export const DEMO_ANALYTICS_DATA = generateBills();

export const UTILITY_COLORS: Record<UtilityType, string> = {
  rent: '#14B8A6',    // teal
  electric: '#3B82F6', // blue
  gas: '#F59E0B',     // amber
  water: '#8B5CF6',   // violet
  internet: '#06B6D4', // cyan
  trash: '#F43F5E',   // rose
  cleaning: '#7C3AED', // violet-600
  insurance: '#0891B2', // cyan-600
  maintenance: '#EA580C', // orange-600
  supplies: '#D97706', // amber-600
  taxes: '#DC2626',   // red-600
  management: '#4F46E5', // indigo-600
  subscription: '#0D9488', // teal-600
};

export const UTILITY_LABELS: Record<UtilityType, string> = {
  rent: 'Rent/Mortgage',
  electric: 'Electric',
  gas: 'Gas',
  water: 'Water',
  internet: 'Internet',
  trash: 'Trash',
  cleaning: 'Cleaning',
  insurance: 'Insurance',
  maintenance: 'Maintenance',
  supplies: 'Supplies',
  taxes: 'Taxes',
  management: 'Management',
  subscription: 'Subscriptions',
};

export const ALL_UTILITY_TYPES: UtilityType[] = ['rent', 'electric', 'gas', 'water', 'internet', 'trash'];
export const ALL_EXPENSE_TYPES: UtilityType[] = ['rent', 'electric', 'gas', 'water', 'internet', 'trash', 'cleaning', 'insurance', 'maintenance', 'supplies', 'taxes', 'management', 'subscription'];

export function getMonthlyTotals(data: MonthlyBill[]) {
  const map = new Map<string, { month: string; monthLabel: string; total: number }>();
  for (const b of data) {
    const existing = map.get(b.month);
    if (existing) {
      existing.total += b.amount;
    } else {
      map.set(b.month, { month: b.month, monthLabel: b.monthLabel, total: b.amount });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function getSpendByProperty(data: MonthlyBill[]) {
  const map = new Map<string, { property_id: string; property_name: string; total: number; months: number }>();
  const monthSet = new Set<string>();
  for (const b of data) {
    monthSet.add(b.month);
    const key = b.property_id;
    const existing = map.get(key);
    if (existing) {
      existing.total += b.amount;
    } else {
      map.set(key, { property_id: b.property_id, property_name: b.property_name, total: b.amount, months: 0 });
    }
  }
  const numMonths = monthSet.size;
  return Array.from(map.values()).map(p => ({ ...p, avgMonthly: p.total / numMonths })).sort((a, b) => b.total - a.total);
}

export function getUtilityBreakdown(data: MonthlyBill[]) {
  const map = new Map<UtilityType, number>();
  for (const b of data) {
    map.set(b.utility_type, (map.get(b.utility_type) || 0) + b.amount);
  }
  return Array.from(map.entries()).map(([type, total]) => ({
    name: UTILITY_LABELS[type],
    type,
    value: Math.round(total * 100) / 100,
    color: UTILITY_COLORS[type],
  })).sort((a, b) => b.value - a.value);
}

export function getMoMComparison(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  const result: { utility: string; type: UtilityType; current: number; previous: number }[] = [];
  for (const ut of ALL_UTILITY_TYPES) {
    const curr = data.filter(b => b.month === current && b.utility_type === ut).reduce((s, b) => s + b.amount, 0);
    const prev = data.filter(b => b.month === previous && b.utility_type === ut).reduce((s, b) => s + b.amount, 0);
    result.push({ utility: UTILITY_LABELS[ut], type: ut, current: Math.round(curr * 100) / 100, previous: Math.round(prev * 100) / 100 });
  }
  return result;
}

export function getPropertyTable(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  const props = [...new Set(data.map(b => b.property_id))];
  const lastMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  return props.map(pid => {
    const propData = data.filter(b => b.property_id === pid);
    const name = propData[0]?.property_name || pid;
    const total = propData.reduce((s, b) => s + b.amount, 0);
    const avgMonthly = total / months.length;
    const highestBill = Math.max(...propData.map(b => b.amount));
    const currTotal = propData.filter(b => b.month === lastMonth).reduce((s, b) => s + b.amount, 0);
    const prevTotal = propData.filter(b => b.month === prevMonth).reduce((s, b) => s + b.amount, 0);
    const trendPct = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0;

    return {
      property_id: pid,
      property_name: name,
      avgMonthly: Math.round(avgMonthly * 100) / 100,
      highestBill: Math.round(highestBill * 100) / 100,
      currentMonth: Math.round(currTotal * 100) / 100,
      trendPct: Math.round(trendPct * 10) / 10,
    };
  });
}
