// Integration connection types stored in Supabase

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: 'zapier' | 'google_sheets' | 'google_drive' | 'slack';
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  metadata: Record<string, unknown>; // provider-specific config
  created_at: string;
  updated_at: string;
}

// Zapier webhook event types
export type WebhookEventType =
  | 'expense.created'
  | 'expense.updated'
  | 'expense.deleted'
  | 'bill.due_soon'
  | 'bill.overdue'
  | 'anomaly.detected'
  | 'receipt.parsed'
  | 'report.weekly'
  | 'report.monthly';

export interface WebhookSubscription {
  id: string;
  user_id: string;
  target_url: string;
  event_types: WebhookEventType[];
  secret: string;
  active: boolean;
  created_at: string;
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

// Google Sheets sync config
export interface GoogleSheetsConfig {
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  column_mapping: {
    date: string;
    property: string;
    category: string;
    amount: string;
    vendor: string;
    [key: string]: string;
  };
  sync_frequency: 'realtime' | 'hourly' | 'daily';
  last_synced_at?: string;
}

// Google Drive backup config
export interface GoogleDriveConfig {
  folder_id: string;
  folder_name: string;
  backup_receipts: boolean;
  backup_reports: boolean;
  organize_by_property: boolean;
}

// Slack integration config
export interface SlackConfig {
  team_id: string;
  team_name: string;
  bot_token: string;
  expense_channel_id: string;
  expense_channel_name: string;
  alert_channel_id: string;
  alert_channel_name: string;
  notifications: {
    new_bill: boolean;
    bill_due: boolean;
    overdue: boolean;
    anomaly: boolean;
    weekly_digest: boolean;
    monthly_report: boolean;
    receipt_confirmation: boolean;
    approval_requests: boolean;
  };
  approval_threshold?: number;
}
