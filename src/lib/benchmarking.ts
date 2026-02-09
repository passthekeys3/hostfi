// Cross-Property Utility Benchmarking Engine

import { type MonthlyBill, type UtilityType, UTILITY_LABELS } from './demo-analytics';

export interface UtilityMetric {
  monthly_avg: number;
  trend: 'up' | 'down' | 'stable';
  trend_percent: number;
  rank: number;
  vs_portfolio_avg: number;
}

export interface PropertyBenchmark {
  property_id: string;
  property_name: string;
  metrics: {
    total_monthly_avg: number;
    total_annual: number;
    by_utility: Record<string, UtilityMetric>;
  };
}

export interface BenchmarkInsight {
  id: string;
  type: 'outlier' | 'savings_opportunity' | 'efficiency_leader' | 'trending_up';
  message: string;
  property_name: string;
  utility_type?: string;
  potential_savings?: number;
  severity: 'info' | 'warning' | 'opportunity';
}

export interface PortfolioSummary {
  total_monthly_avg: number;
  most_efficient: { property_name: string; monthly_avg: number };
  least_efficient: { property_name: string; monthly_avg: number };
  biggest_savings: { property_name: string; utility_type: string; annual_savings: number };
}

export function calculateBenchmarks(data: MonthlyBill[]): PropertyBenchmark[] {
  const properties = [...new Set(data.map(b => b.property_id))];
  const months = [...new Set(data.map(b => b.month))].sort();
  const numMonths = months.length;
  const utilityTypes = [...new Set(data.filter(b => b.utility_type !== 'rent').map(b => b.utility_type))];

  // Calculate portfolio averages per utility
  const portfolioAvgs: Record<string, number> = {};
  for (const ut of utilityTypes) {
    const total = data.filter(b => b.utility_type === ut).reduce((s, b) => s + b.amount, 0);
    portfolioAvgs[ut] = total / (numMonths * properties.length);
  }

  const benchmarks: PropertyBenchmark[] = [];

  for (const pid of properties) {
    const propData = data.filter(b => b.property_id === pid);
    const propName = propData[0]?.property_name || pid;

    const byUtility: Record<string, UtilityMetric> = {};
    let totalSum = 0;

    for (const ut of utilityTypes) {
      const utilData = propData.filter(b => b.utility_type === ut);
      const total = utilData.reduce((s, b) => s + b.amount, 0);
      const avg = total / numMonths;
      totalSum += total;

      // Trend: compare last 3 months vs first 3 months
      const recent = utilData.filter(b => months.indexOf(b.month) >= numMonths - 3);
      const earlier = utilData.filter(b => months.indexOf(b.month) < 3);
      const recentAvg = recent.reduce((s, b) => s + b.amount, 0) / Math.max(recent.length, 1);
      const earlierAvg = earlier.reduce((s, b) => s + b.amount, 0) / Math.max(earlier.length, 1);
      const trendPct = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

      const vsPortfolio = portfolioAvgs[ut] > 0 ? ((avg - portfolioAvgs[ut]) / portfolioAvgs[ut]) * 100 : 0;

      byUtility[ut] = {
        monthly_avg: Math.round(avg * 100) / 100,
        trend: Math.abs(trendPct) < 5 ? 'stable' : trendPct > 0 ? 'up' : 'down',
        trend_percent: Math.round(Math.abs(trendPct) * 10) / 10,
        rank: 0, // filled below
        vs_portfolio_avg: Math.round(vsPortfolio * 10) / 10,
      };
    }

    benchmarks.push({
      property_id: pid,
      property_name: propName,
      metrics: {
        total_monthly_avg: Math.round((totalSum / numMonths) * 100) / 100,
        total_annual: Math.round(totalSum * 100) / 100,
        by_utility: byUtility,
      },
    });
  }

  // Calculate ranks per utility (1 = lowest cost = best)
  for (const ut of utilityTypes) {
    const sorted = [...benchmarks].sort(
      (a, b) => (a.metrics.by_utility[ut]?.monthly_avg || 0) - (b.metrics.by_utility[ut]?.monthly_avg || 0)
    );
    sorted.forEach((bm, i) => {
      if (bm.metrics.by_utility[ut]) bm.metrics.by_utility[ut].rank = i + 1;
    });
  }

  return benchmarks;
}

export function generateInsights(benchmarks: PropertyBenchmark[]): BenchmarkInsight[] {
  const insights: BenchmarkInsight[] = [];
  let id = 0;

  for (const bm of benchmarks) {
    for (const [ut, metric] of Object.entries(bm.metrics.by_utility)) {
      const label = UTILITY_LABELS[ut as UtilityType] || ut;

      // Outlier: spending significantly more than portfolio
      if (metric.vs_portfolio_avg > 25) {
        insights.push({
          id: `insight-${++id}`,
          type: 'outlier',
          message: `${bm.property_name} spends ${Math.round(metric.vs_portfolio_avg)}% more on ${label.toLowerCase()} than your portfolio average`,
          property_name: bm.property_name,
          utility_type: ut,
          severity: 'warning',
        });
      }

      // Efficiency leader
      if (metric.rank === 1 && benchmarks.length > 1) {
        const worst = benchmarks.reduce((w, b) =>
          (b.metrics.by_utility[ut]?.monthly_avg || 0) > (w.metrics.by_utility[ut]?.monthly_avg || 0) ? b : w
        );
        if (worst.property_id !== bm.property_id) {
          insights.push({
            id: `insight-${++id}`,
            type: 'efficiency_leader',
            message: `${bm.property_name} is your most efficient property for ${label.toLowerCase()} ($${metric.monthly_avg}/mo avg vs $${worst.metrics.by_utility[ut]?.monthly_avg}/mo at ${worst.property_name})`,
            property_name: bm.property_name,
            utility_type: ut,
            severity: 'info',
          });
        }
      }

      // Savings opportunity: if not the best, calculate savings to match best
      if (metric.rank > 1) {
        const best = benchmarks.find(b => b.metrics.by_utility[ut]?.rank === 1);
        if (best) {
          const bestAvg = best.metrics.by_utility[ut].monthly_avg;
          const savings = (metric.monthly_avg - bestAvg) * 12;
          if (savings > 100) {
            insights.push({
              id: `insight-${++id}`,
              type: 'savings_opportunity',
              message: `If ${bm.property_name} matched ${best.property_name}'s ${label.toLowerCase()} efficiency, you'd save $${Math.round(savings)}/year`,
              property_name: bm.property_name,
              utility_type: ut,
              potential_savings: Math.round(savings),
              severity: 'opportunity',
            });
          }
        }
      }

      // Trending up
      if (metric.trend === 'up' && metric.trend_percent > 10) {
        insights.push({
          id: `insight-${++id}`,
          type: 'trending_up',
          message: `${label} costs at ${bm.property_name} are trending up ${metric.trend_percent}% over the past quarter`,
          property_name: bm.property_name,
          utility_type: ut,
          severity: 'warning',
        });
      }
    }
  }

  // Sort by potential savings (biggest first), then by severity
  return insights.sort((a, b) => (b.potential_savings || 0) - (a.potential_savings || 0));
}

export function getPortfolioSummary(benchmarks: PropertyBenchmark[]): PortfolioSummary {
  const totalAvg = benchmarks.reduce((s, b) => s + b.metrics.total_monthly_avg, 0) / benchmarks.length;

  const sorted = [...benchmarks].sort((a, b) => a.metrics.total_monthly_avg - b.metrics.total_monthly_avg);
  const mostEfficient = sorted[0];
  const leastEfficient = sorted[sorted.length - 1];

  // Find biggest savings opportunity
  let biggestSavings = { property_name: '', utility_type: '', annual_savings: 0 };
  for (const bm of benchmarks) {
    for (const [ut, metric] of Object.entries(bm.metrics.by_utility)) {
      if (metric.rank > 1) {
        const best = benchmarks.find(b => b.metrics.by_utility[ut]?.rank === 1);
        if (best) {
          const savings = (metric.monthly_avg - best.metrics.by_utility[ut].monthly_avg) * 12;
          if (savings > biggestSavings.annual_savings) {
            biggestSavings = {
              property_name: bm.property_name,
              utility_type: UTILITY_LABELS[ut as UtilityType] || ut,
              annual_savings: Math.round(savings),
            };
          }
        }
      }
    }
  }

  return {
    total_monthly_avg: Math.round(totalAvg * 100) / 100,
    most_efficient: { property_name: mostEfficient.property_name, monthly_avg: mostEfficient.metrics.total_monthly_avg },
    least_efficient: { property_name: leastEfficient.property_name, monthly_avg: leastEfficient.metrics.total_monthly_avg },
    biggest_savings: biggestSavings,
  };
}

// Monthly trend data for chart
export function getMonthlyTrendByProperty(data: MonthlyBill[]) {
  const months = [...new Set(data.map(b => b.month))].sort();
  const properties = [...new Set(data.map(b => b.property_name))];

  return months.map(m => {
    const row: Record<string, string | number> = {
      month: m,
      monthLabel: data.find(b => b.month === m)?.monthLabel || m,
    };
    for (const prop of properties) {
      const total = data.filter(b => b.month === m && b.property_name === prop && b.utility_type !== 'rent')
        .reduce((s, b) => s + b.amount, 0);
      row[prop] = Math.round(total * 100) / 100;
    }
    return row;
  });
}

// Heatmap data
export function getHeatmapData(benchmarks: PropertyBenchmark[]) {
  const allUtilities = new Set<string>();
  benchmarks.forEach(b => Object.keys(b.metrics.by_utility).forEach(u => allUtilities.add(u)));
  const utilities = [...allUtilities].filter(u => u !== 'rent');

  // Get portfolio avg per utility
  const portfolioAvgs: Record<string, number> = {};
  for (const ut of utilities) {
    const sum = benchmarks.reduce((s, b) => s + (b.metrics.by_utility[ut]?.monthly_avg || 0), 0);
    portfolioAvgs[ut] = sum / benchmarks.length;
  }

  return {
    utilities,
    portfolioAvgs,
    rows: benchmarks.map(b => ({
      property_name: b.property_name,
      cells: Object.fromEntries(utilities.map(ut => [ut, {
        amount: b.metrics.by_utility[ut]?.monthly_avg || 0,
        vs_avg: b.metrics.by_utility[ut]?.vs_portfolio_avg || 0,
      }])),
    })),
  };
}

// Bar chart data for utility comparison
export function getUtilityComparisonData(benchmarks: PropertyBenchmark[]) {
  const allUtilities = new Set<string>();
  benchmarks.forEach(b => Object.keys(b.metrics.by_utility).forEach(u => allUtilities.add(u)));
  const utilities = [...allUtilities].filter(u => u !== 'rent');

  return utilities.map(ut => {
    const row: Record<string, string | number> = {
      utility: UTILITY_LABELS[ut as UtilityType] || ut,
    };
    for (const bm of benchmarks) {
      row[bm.property_name] = bm.metrics.by_utility[ut]?.monthly_avg || 0;
    }
    return row;
  });
}
