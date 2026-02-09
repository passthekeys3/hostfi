import { DEMO_ANALYTICS_DATA } from './demo-analytics';
import {
  calculateBenchmarks,
  generateInsights,
  getPortfolioSummary,
  getMonthlyTrendByProperty,
  getHeatmapData,
  getUtilityComparisonData,
} from './benchmarking';

const nonRentData = DEMO_ANALYTICS_DATA.filter(b => b.utility_type !== 'rent');

export const DEMO_BENCHMARKS = calculateBenchmarks(nonRentData);
export const DEMO_INSIGHTS = generateInsights(DEMO_BENCHMARKS);
export const DEMO_PORTFOLIO_SUMMARY = getPortfolioSummary(DEMO_BENCHMARKS);
export const DEMO_MONTHLY_TRENDS = getMonthlyTrendByProperty(DEMO_ANALYTICS_DATA);
export const DEMO_HEATMAP = getHeatmapData(DEMO_BENCHMARKS);
export const DEMO_UTILITY_COMPARISON = getUtilityComparisonData(DEMO_BENCHMARKS);
