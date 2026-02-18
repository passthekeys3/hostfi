/**
 * Alert types and utilities
 */

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: string;
  property_id?: string;
  bill_id?: string;
}

export type AlertType = 'due_soon' | 'overdue' | 'unusual_amount' | 'missing_bill' | 'new_parsed';
export type AlertFilter = 'all' | 'urgent' | 'insights' | 'activity';

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; color: string; bgColor: string }> = {
  due_soon: { label: 'Due Soon', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  overdue: { label: 'Overdue', color: 'text-rose-700', bgColor: 'bg-rose-100' },
  unusual_amount: { label: 'Unusual Amount', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  missing_bill: { label: 'Missing Bill', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  new_parsed: { label: 'New Parsed', color: 'text-teal-700', bgColor: 'bg-teal-100' },
};

export function filterAlerts(alerts: Alert[], filter: AlertFilter): Alert[] {
  switch (filter) {
    case 'urgent':
      return alerts.filter(a => a.type === 'overdue' || a.type === 'due_soon');
    case 'insights':
      return alerts.filter(a => a.type === 'unusual_amount');
    case 'activity':
      return alerts.filter(a => a.type === 'new_parsed' || a.type === 'missing_bill');
    default:
      return alerts;
  }
}
