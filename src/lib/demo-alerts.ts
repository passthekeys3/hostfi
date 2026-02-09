export type AlertType = 'due_soon' | 'overdue' | 'unusual_amount' | 'missing_bill' | 'new_parsed';
export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  property_id?: string;
  bill_id?: string;
  created_at: string;
  read: boolean;
}

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-1',
    type: 'due_soon',
    severity: 'warning',
    title: 'SoCalGas bill due soon',
    description: 'Venice Beach Unit — $67.30 due Feb 12',
    property_id: '1',
    bill_id: 'b2',
    created_at: '2026-02-18T09:00:00Z',
    read: false,
  },
  {
    id: 'alert-2',
    type: 'overdue',
    severity: 'critical',
    title: 'LADWP bill is overdue',
    description: 'Silver Lake Duplex — $198.00 was due Feb 20',
    property_id: '2',
    bill_id: 'b3',
    created_at: '2026-02-06T00:00:00Z',
    read: false,
  },
  {
    id: 'alert-3',
    type: 'unusual_amount',
    severity: 'warning',
    title: 'Electric bill 43% higher than usual',
    description: 'Venice Beach Unit — $142.50 vs $94.20 average',
    property_id: '1',
    bill_id: 'b1',
    created_at: '2026-02-05T10:00:00Z',
    read: false,
  },
  {
    id: 'alert-4',
    type: 'missing_bill',
    severity: 'info',
    title: 'Spectrum bill not received this month',
    description: 'Silver Lake Duplex — Usually arrives by the 5th',
    property_id: '2',
    created_at: '2026-02-06T12:00:00Z',
    read: true,
  },
  {
    id: 'alert-5',
    type: 'new_parsed',
    severity: 'success',
    title: '3 new bills parsed from email',
    description: 'SoCalGas, LADWP, and Edison bills ready for review',
    created_at: '2026-02-07T10:30:00Z',
    read: false,
  },
  {
    id: 'alert-6',
    type: 'due_soon',
    severity: 'warning',
    title: 'Spectrum bill due tomorrow',
    description: 'Silver Lake Duplex — $79.99 due Feb 10',
    property_id: '2',
    bill_id: 'b4',
    created_at: '2026-02-09T09:00:00Z',
    read: true,
  },
  {
    id: 'alert-7',
    type: 'overdue',
    severity: 'critical',
    title: 'SCE bill is 5 days overdue',
    description: 'Joshua Tree Cabin — $210.75 was due Feb 18',
    property_id: '3',
    bill_id: 'b5',
    created_at: '2026-02-23T00:00:00Z',
    read: false,
  },
  {
    id: 'alert-8',
    type: 'unusual_amount',
    severity: 'warning',
    title: 'Water bill 37% higher than usual',
    description: 'Joshua Tree Cabin — $72.40 vs $52.80 average',
    property_id: '3',
    created_at: '2026-02-04T14:00:00Z',
    read: true,
  },
];

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  due_soon: { label: 'Due Soon', color: 'text-yellow-600', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  overdue: { label: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  unusual_amount: { label: 'Unusual Amount', color: 'text-orange-600', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  missing_bill: { label: 'Missing Bill', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  new_parsed: { label: 'New Parsed', color: 'text-teal-600', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30' },
};

export type AlertFilter = 'all' | 'urgent' | 'insights' | 'activity';

export function filterAlerts(alerts: Alert[], filter: AlertFilter): Alert[] {
  switch (filter) {
    case 'urgent':
      return alerts.filter(a => a.type === 'overdue' || a.type === 'due_soon');
    case 'insights':
      return alerts.filter(a => a.type === 'unusual_amount' || a.type === 'missing_bill');
    case 'activity':
      return alerts.filter(a => a.type === 'new_parsed');
    default:
      return alerts;
  }
}
