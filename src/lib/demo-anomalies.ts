import { type AnomalyResult } from './anomaly-detection';

export const DEMO_ANOMALIES: AnomalyResult[] = [
  {
    id: 'anomaly-1',
    bill_id: 'bill-jan-electric-1',
    property_name: 'Venice Beach Unit',
    utility_type: 'electric',
    anomaly_type: 'spike',
    severity: 'high',
    current_amount: 178.42,
    expected_amount: 124.50,
    deviation_percent: 43.3,
    message: 'Electric bill at Venice Beach Unit is 43% higher than your 6-month average',
    recommendation: 'Check for appliances left running, AC usage, or space heaters. If this is a winter month, consider if guests are using electric heating.',
    seasonal_context: 'January electric bills are typically 10-15% above annual average due to holiday guests.',
    detected_at: '2026-01-15T10:00:00Z',
    status: 'new',
  },
  {
    id: 'anomaly-2',
    bill_id: 'bill-jan-water-2',
    property_name: 'Silver Lake Duplex',
    utility_type: 'water',
    anomaly_type: 'possible_leak',
    severity: 'critical',
    current_amount: 142.30,
    expected_amount: 62.00,
    deviation_percent: 129.5,
    message: 'Water bill at Silver Lake Duplex is 130% above average — possible leak detected',
    recommendation: 'Urgently inspect for running toilets, dripping faucets, or irrigation system issues. A 130% increase often indicates a physical leak.',
    detected_at: '2026-01-20T08:00:00Z',
    status: 'new',
  },
  {
    id: 'anomaly-3',
    bill_id: 'bill-dec-gas-1',
    property_name: 'Venice Beach Unit',
    utility_type: 'gas',
    anomaly_type: 'unusual_pattern',
    severity: 'medium',
    current_amount: 68.90,
    expected_amount: 52.00,
    deviation_percent: 32.5,
    message: 'Gas bill at Venice Beach Unit is 33% above average',
    recommendation: 'Review thermostat settings and guest heating usage patterns.',
    seasonal_context: 'Winter gas increases of 20-30% are normal. This is slightly above seasonal expectations.',
    detected_at: '2026-01-10T14:00:00Z',
    status: 'acknowledged',
  },
  {
    id: 'anomaly-4',
    bill_id: 'bill-jan-electric-3',
    property_name: 'Joshua Tree Cabin',
    utility_type: 'electric',
    anomaly_type: 'new_high',
    severity: 'medium',
    current_amount: 245.60,
    expected_amount: 198.00,
    deviation_percent: 24.0,
    message: 'New all-time high electric bill at Joshua Tree Cabin ($245.60)',
    recommendation: 'This is the highest electric bill recorded for this property. Review if occupancy was unusually high or if new appliances were added.',
    detected_at: '2026-02-01T09:00:00Z',
    status: 'new',
  },
  {
    id: 'anomaly-5',
    bill_id: 'bill-feb-internet-2',
    property_name: 'Silver Lake Duplex',
    utility_type: 'internet',
    anomaly_type: 'rate_increase',
    severity: 'low',
    current_amount: 89.99,
    expected_amount: 79.99,
    deviation_percent: 12.5,
    message: 'Spectrum internet bill increased by $10/mo at Silver Lake Duplex',
    recommendation: 'Spectrum may have applied a rate increase after a promotional period ended. Call to negotiate or check for current promotions.',
    detected_at: '2026-02-05T11:00:00Z',
    status: 'new',
  },
];

export function getActiveAnomalies() {
  return DEMO_ANOMALIES.filter(a => a.status === 'new' || a.status === 'acknowledged');
}

export function getCriticalAnomalies() {
  return DEMO_ANOMALIES.filter(a => a.severity === 'critical' && a.status === 'new');
}

export function getAnomalyCountByStatus() {
  return {
    new: DEMO_ANOMALIES.filter(a => a.status === 'new').length,
    acknowledged: DEMO_ANOMALIES.filter(a => a.status === 'acknowledged').length,
    resolved: DEMO_ANOMALIES.filter(a => a.status === 'resolved').length,
    dismissed: DEMO_ANOMALIES.filter(a => a.status === 'dismissed').length,
  };
}
