// Utility Cost Anomaly Detection Engine

import { type MonthlyBill, type UtilityType, DEMO_ANALYTICS_DATA } from './demo-analytics';
import { type LucideIcon, TrendingUp, BarChart3, Droplets, DollarSign, Mountain } from 'lucide-react';

export type AnomalyType = 'spike' | 'unusual_pattern' | 'possible_leak' | 'rate_increase' | 'new_high';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnomalyStatus = 'new' | 'acknowledged' | 'resolved' | 'dismissed';

export interface AnomalyResult {
  id: string;
  bill_id: string;
  property_name: string;
  utility_type: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  current_amount: number;
  expected_amount: number;
  deviation_percent: number;
  message: string;
  recommendation: string;
  seasonal_context?: string;
  detected_at: string;
  status: AnomalyStatus;
}

export interface AnomalyConfig {
  spike_threshold: number; // percentage above rolling avg (default 30)
  std_dev_threshold: number; // number of std deviations (default 2)
  leak_threshold: number; // water-specific percentage (default 50)
  rolling_window: number; // months for rolling avg (default 6)
}

const DEFAULT_CONFIG: AnomalyConfig = {
  spike_threshold: 30,
  std_dev_threshold: 2,
  leak_threshold: 50,
  rolling_window: 6,
};

// Seasonal expectations by month index (0=Jan, 11=Dec)
const SEASONAL_FACTORS: Record<string, number[]> = {
  electric: [0.9, 0.88, 0.9, 0.95, 1.05, 1.2, 1.35, 1.4, 1.25, 1.1, 0.95, 0.85],
  gas:      [1.3, 1.25, 1.1, 0.9, 0.7, 0.55, 0.5, 0.5, 0.55, 0.7, 0.9, 1.2],
  water:    [0.9, 0.9, 0.95, 1.0, 1.1, 1.15, 1.2, 1.2, 1.1, 1.0, 0.95, 0.9],
};

const SEASONAL_NOTES: Record<string, Record<string, string>> = {
  electric: {
    summer: 'Summer months typically see 20-40% higher electric bills due to AC usage.',
    winter: 'Winter electric usage may increase if guests use space heaters.',
  },
  gas: {
    winter: 'Winter gas bills are typically 30-60% above annual average due to heating.',
    summer: 'Summer gas bills should be at their lowest. An increase may warrant investigation.',
  },
  water: {
    summer: 'Summer water usage can increase 10-20% due to irrigation and pools.',
  },
};

function getSeasonalContext(utilityType: string, monthIndex: number): string | undefined {
  const isSummer = monthIndex >= 5 && monthIndex <= 8;
  const isWinter = monthIndex <= 1 || monthIndex >= 10;
  const notes = SEASONAL_NOTES[utilityType];
  if (!notes) return undefined;
  if (isSummer && notes.summer) return notes.summer;
  if (isWinter && notes.winter) return notes.winter;
  return undefined;
}

function isSeasonallyExpected(utilityType: string, monthIndex: number, deviationPercent: number): boolean {
  const factors = SEASONAL_FACTORS[utilityType];
  if (!factors) return false;
  const factor = factors[monthIndex];
  // If the seasonal factor explains most of the deviation, it's expected
  const seasonalDeviation = (factor - 1) * 100;
  return seasonalDeviation > 0 && deviationPercent <= seasonalDeviation * 1.5;
}

function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function determineSeverity(anomalyType: AnomalyType, deviationPercent: number, isSeasonalExpected: boolean): AnomalySeverity {
  if (anomalyType === 'possible_leak') return deviationPercent > 100 ? 'critical' : 'high';
  if (isSeasonalExpected) return 'low';
  if (deviationPercent > 80) return 'high';
  if (deviationPercent > 40) return 'medium';
  return 'low';
}

function getRecommendation(anomalyType: AnomalyType, utilityType: string, propertyName: string): string {
  switch (anomalyType) {
    case 'spike':
      if (utilityType === 'electric') return 'Check for appliances left running, AC usage, or space heaters. If this is a winter month, consider if guests are using electric heating.';
      if (utilityType === 'gas') return 'Review thermostat settings and guest heating usage patterns.';
      return `Review recent usage at ${propertyName} for anything unusual.`;
    case 'possible_leak':
      return 'Urgently inspect for running toilets, dripping faucets, or irrigation system issues. A significant water increase often indicates a physical leak.';
    case 'unusual_pattern':
      return `This bill deviates significantly from the seasonal pattern. Review usage at ${propertyName} and check for any changes in occupancy or equipment.`;
    case 'rate_increase':
      return 'Your provider may have applied a rate increase after a promotional period ended. Call to negotiate or check for current promotions.';
    case 'new_high':
      return `This is the highest bill recorded for this utility at ${propertyName}. Review if occupancy was unusually high or if new appliances/equipment were added.`;
  }
}

export function detectAnomalies(
  currentBill: MonthlyBill,
  historicalBills: MonthlyBill[],
  config: AnomalyConfig = DEFAULT_CONFIG,
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];
  const amounts = historicalBills.map(b => b.amount).sort((a, b) => a - b);
  if (amounts.length < 3) return anomalies;

  const recentAmounts = amounts.slice(-config.rolling_window);
  const rollingAvg = recentAmounts.reduce((s, v) => s + v, 0) / recentAmounts.length;
  const stdDev = calcStdDev(recentAmounts);
  const deviationPercent = rollingAvg > 0 ? ((currentBill.amount - rollingAvg) / rollingAvg) * 100 : 0;
  const monthIndex = new Date(currentBill.month + '-01').getMonth();
  const seasonalExpected = isSeasonallyExpected(currentBill.utility_type, monthIndex, deviationPercent);
  const seasonalCtx = getSeasonalContext(currentBill.utility_type, monthIndex);
  const maxHistorical = Math.max(...amounts);

  const baseId = `anomaly-${currentBill.property_id}-${currentBill.utility_type}-${currentBill.month}`;

  // Spike detection
  if (deviationPercent > config.spike_threshold) {
    anomalies.push({
      id: `${baseId}-spike`,
      bill_id: `bill-${currentBill.month}-${currentBill.utility_type}-${currentBill.property_id}`,
      property_name: currentBill.property_name,
      utility_type: currentBill.utility_type,
      anomaly_type: 'spike',
      severity: determineSeverity('spike', deviationPercent, seasonalExpected),
      current_amount: Math.round(currentBill.amount * 100) / 100,
      expected_amount: Math.round(rollingAvg * 100) / 100,
      deviation_percent: Math.round(deviationPercent * 10) / 10,
      message: `${currentBill.utility_type.charAt(0).toUpperCase() + currentBill.utility_type.slice(1)} bill at ${currentBill.property_name} is ${Math.round(deviationPercent)}% higher than your ${config.rolling_window}-month average ($${currentBill.amount.toFixed(2)} vs $${rollingAvg.toFixed(2)})`,
      recommendation: getRecommendation('spike', currentBill.utility_type, currentBill.property_name),
      seasonal_context: seasonalCtx,
      detected_at: new Date().toISOString(),
      status: 'new',
    });
  }

  // Possible leak (water only)
  if (currentBill.utility_type === 'water' && deviationPercent > config.leak_threshold) {
    anomalies.push({
      id: `${baseId}-leak`,
      bill_id: `bill-${currentBill.month}-${currentBill.utility_type}-${currentBill.property_id}`,
      property_name: currentBill.property_name,
      utility_type: currentBill.utility_type,
      anomaly_type: 'possible_leak',
      severity: determineSeverity('possible_leak', deviationPercent, false),
      current_amount: Math.round(currentBill.amount * 100) / 100,
      expected_amount: Math.round(rollingAvg * 100) / 100,
      deviation_percent: Math.round(deviationPercent * 10) / 10,
      message: `Water bill at ${currentBill.property_name} is ${Math.round(deviationPercent)}% above average — possible leak detected`,
      recommendation: getRecommendation('possible_leak', currentBill.utility_type, currentBill.property_name),
      detected_at: new Date().toISOString(),
      status: 'new',
    });
  }

  // Unusual pattern (std dev)
  if (stdDev > 0 && Math.abs(currentBill.amount - rollingAvg) > config.std_dev_threshold * stdDev && !seasonalExpected) {
    anomalies.push({
      id: `${baseId}-unusual`,
      bill_id: `bill-${currentBill.month}-${currentBill.utility_type}-${currentBill.property_id}`,
      property_name: currentBill.property_name,
      utility_type: currentBill.utility_type,
      anomaly_type: 'unusual_pattern',
      severity: determineSeverity('unusual_pattern', Math.abs(deviationPercent), false),
      current_amount: Math.round(currentBill.amount * 100) / 100,
      expected_amount: Math.round(rollingAvg * 100) / 100,
      deviation_percent: Math.round(Math.abs(deviationPercent) * 10) / 10,
      message: `${currentBill.utility_type.charAt(0).toUpperCase() + currentBill.utility_type.slice(1)} bill at ${currentBill.property_name} deviates significantly from the expected pattern`,
      recommendation: getRecommendation('unusual_pattern', currentBill.utility_type, currentBill.property_name),
      seasonal_context: seasonalCtx,
      detected_at: new Date().toISOString(),
      status: 'new',
    });
  }

  // New high
  if (currentBill.amount > maxHistorical && deviationPercent > 15) {
    anomalies.push({
      id: `${baseId}-newhigh`,
      bill_id: `bill-${currentBill.month}-${currentBill.utility_type}-${currentBill.property_id}`,
      property_name: currentBill.property_name,
      utility_type: currentBill.utility_type,
      anomaly_type: 'new_high',
      severity: determineSeverity('new_high', deviationPercent, seasonalExpected),
      current_amount: Math.round(currentBill.amount * 100) / 100,
      expected_amount: Math.round(rollingAvg * 100) / 100,
      deviation_percent: Math.round(deviationPercent * 10) / 10,
      message: `New all-time high ${currentBill.utility_type} bill at ${currentBill.property_name} ($${currentBill.amount.toFixed(2)})`,
      recommendation: getRecommendation('new_high', currentBill.utility_type, currentBill.property_name),
      seasonal_context: seasonalCtx,
      detected_at: new Date().toISOString(),
      status: 'new',
    });
  }

  return anomalies;
}

// Run anomaly detection on all demo data
export function detectDemoAnomalies(): AnomalyResult[] {
  const data = DEMO_ANALYTICS_DATA;
  const months = [...new Set(data.map(b => b.month))].sort();
  const latestMonth = months[months.length - 1];
  const anomalies: AnomalyResult[] = [];

  const currentBills = data.filter(b => b.month === latestMonth);

  for (const bill of currentBills) {
    if (bill.utility_type === 'rent' || bill.utility_type === 'internet') continue;
    const historical = data.filter(
      b => b.property_id === bill.property_id &&
        b.utility_type === bill.utility_type &&
        b.month !== latestMonth
    );
    anomalies.push(...detectAnomalies(bill, historical));
  }

  return anomalies;
}

export const ANOMALY_TYPE_CONFIG: Record<AnomalyType, { label: string; color: string; bgColor: string; borderColor: string; icon: LucideIcon }> = {
  spike: { label: 'Spike', color: 'text-orange-600', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/30', icon: TrendingUp },
  unusual_pattern: { label: 'Unusual Pattern', color: 'text-amber-600', bgColor: 'bg-amber-400/10', borderColor: 'border-amber-400/30', icon: BarChart3 },
  possible_leak: { label: 'Possible Leak', color: 'text-red-600', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/30', icon: Droplets },
  rate_increase: { label: 'Rate Increase', color: 'text-blue-600', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/30', icon: DollarSign },
  new_high: { label: 'New High', color: 'text-violet-600', bgColor: 'bg-violet-400/10', borderColor: 'border-violet-400/30', icon: Mountain },
};

export const SEVERITY_CONFIG: Record<AnomalySeverity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-400/10' },
  medium: { label: 'Medium', color: 'text-amber-600', bgColor: 'bg-amber-400/10' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-400/10' },
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-400/10' },
};
