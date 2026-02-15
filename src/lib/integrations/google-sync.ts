/**
 * Server-side Google sync helpers
 * Handles getting user tokens, refreshing if needed, and syncing to Sheets/Drive
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { appendRows, refreshGoogleToken, uploadToDrive, createDriveFolder } from './google';

type GoogleProvider = 'google_sheets' | 'google_drive';

interface GoogleConnection {
  accessToken: string;
  refreshToken: string;
  metadata: Record<string, unknown>;
}

interface ExpenseData {
  date: string;
  property_name: string;
  category: string;
  amount: number;
  description: string;
  notes?: string;
}

interface RevenueData {
  date: string;
  property_name: string;
  source: string;
  amount: number;
  booking_id?: string;
  notes?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

/**
 * Get a user's Google connection, refreshing token if needed
 */
export async function getGoogleConnection(
  userId: string,
  provider: GoogleProvider
): Promise<GoogleConnection | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: connection, error } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('active', true)
    .single();

  if (error || !connection) return null;

  let accessToken = connection.access_token;
  const metadata = (connection.metadata || {}) as Record<string, unknown>;
  const tokenExpiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;

  // Refresh token if expired or expiring within 1 minute
  if (tokenExpiresAt && Date.now() > tokenExpiresAt - 60_000) {
    try {
      const refreshed = await refreshGoogleToken(connection.refresh_token);
      accessToken = refreshed.access_token;

      // Update stored token
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabase
        .from('integration_connections')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: newExpiresAt,
        })
        .eq('user_id', userId)
        .eq('provider', provider);
    } catch {
      // Token refresh failed - connection may need to be re-authorized
      return null;
    }
  }

  return {
    accessToken,
    refreshToken: connection.refresh_token,
    metadata,
  };
}

/**
 * Sync a single expense to Google Sheets
 * Fails silently if not connected
 */
export async function syncExpenseToSheets(
  userId: string,
  expense: ExpenseData
): Promise<void> {
  try {
    const connection = await getGoogleConnection(userId, 'google_sheets');
    if (!connection) return;

    const spreadsheetId = connection.metadata.spreadsheet_id as string | undefined;
    if (!spreadsheetId) return;

    const row = [
      expense.date,
      expense.property_name,
      expense.category,
      `$${expense.amount.toFixed(2)}`,
      expense.description,
      expense.notes || '',
      '', // Receipt column - could be populated later
    ];

    await appendRows(connection.accessToken, spreadsheetId, 'Expenses', [row]);

    // Update last_synced timestamp
    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('integration_connections')
        .update({ metadata: { ...connection.metadata, last_synced: new Date().toISOString() } })
        .eq('user_id', userId)
        .eq('provider', 'google_sheets');
    }
  } catch (err) {
    // Fail silently - sync is optional
    console.error('syncExpenseToSheets error:', err);
  }
}

/**
 * Sync a single revenue entry to Google Sheets
 * Fails silently if not connected
 */
export async function syncRevenueToSheets(
  userId: string,
  revenue: RevenueData
): Promise<void> {
  try {
    const connection = await getGoogleConnection(userId, 'google_sheets');
    if (!connection) return;

    const spreadsheetId = connection.metadata.spreadsheet_id as string | undefined;
    if (!spreadsheetId) return;

    const row = [
      revenue.date,
      revenue.property_name,
      revenue.source,
      `$${revenue.amount.toFixed(2)}`,
      revenue.booking_id || '',
      revenue.notes || '',
    ];

    await appendRows(connection.accessToken, spreadsheetId, 'Revenue', [row]);

    // Update last_synced timestamp
    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('integration_connections')
        .update({ metadata: { ...connection.metadata, last_synced: new Date().toISOString() } })
        .eq('user_id', userId)
        .eq('provider', 'google_sheets');
    }
  } catch (err) {
    console.error('syncRevenueToSheets error:', err);
  }
}

/**
 * Ensure the HostFi root folder exists in Google Drive
 * Returns folderId
 */
async function ensureHostFiFolder(
  userId: string,
  accessToken: string,
  metadata: Record<string, unknown>
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Check if we already have the folder ID cached
  if (metadata.hostfi_folder_id) {
    return metadata.hostfi_folder_id as string;
  }

  try {
    const { folderId } = await createDriveFolder(accessToken, 'HostFi');

    // Cache the folder ID
    await supabase
      .from('integration_connections')
      .update({ metadata: { ...metadata, hostfi_folder_id: folderId } })
      .eq('user_id', userId)
      .eq('provider', 'google_drive');

    return folderId;
  } catch {
    return null;
  }
}

/**
 * Ensure a property subfolder exists
 */
async function ensurePropertyFolder(
  userId: string,
  accessToken: string,
  metadata: Record<string, unknown>,
  propertyName: string,
  parentFolderId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Sanitize property name for folder
  const safeName = propertyName.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);
  const folderKey = `property_folder_${safeName}`;

  // Check cache
  if (metadata[folderKey]) {
    return metadata[folderKey] as string;
  }

  try {
    const { folderId } = await createDriveFolder(accessToken, safeName, parentFolderId);

    // Cache the folder ID
    await supabase
      .from('integration_connections')
      .update({ metadata: { ...metadata, [folderKey]: folderId } })
      .eq('user_id', userId)
      .eq('provider', 'google_drive');

    return folderId;
  } catch {
    return null;
  }
}

/**
 * Upload a receipt to Google Drive
 * Organizes by: HostFi / [Property Name] / receipts
 */
export async function backupReceiptToDrive(
  userId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
  propertyName?: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const connection = await getGoogleConnection(userId, 'google_drive');
    if (!connection) return null;

    // Ensure HostFi root folder exists
    const rootFolderId = await ensureHostFiFolder(userId, connection.accessToken, connection.metadata);
    if (!rootFolderId) return null;

    // Determine target folder
    let targetFolderId = rootFolderId;
    if (propertyName) {
      const propertyFolderId = await ensurePropertyFolder(
        userId,
        connection.accessToken,
        connection.metadata,
        propertyName,
        rootFolderId
      );
      if (propertyFolderId) {
        targetFolderId = propertyFolderId;
      }
    }

    // Upload the file
    const result = await uploadToDrive(
      connection.accessToken,
      targetFolderId,
      fileName,
      mimeType,
      content
    );

    return result;
  } catch (err) {
    console.error('backupReceiptToDrive error:', err);
    return null;
  }
}

/**
 * Sync all expenses to Google Sheets (for "Sync All" button)
 */
export async function syncAllExpensesToSheets(
  userId: string,
  expenses: ExpenseData[]
): Promise<{ synced: number; spreadsheetUrl: string } | null> {
  try {
    const connection = await getGoogleConnection(userId, 'google_sheets');
    if (!connection) return null;

    const spreadsheetId = connection.metadata.spreadsheet_id as string | undefined;
    if (!spreadsheetId) return null;

    // Convert expenses to rows
    const rows = expenses.map((e) => [
      e.date,
      e.property_name,
      e.category,
      `$${e.amount.toFixed(2)}`,
      e.description,
      e.notes || '',
      '',
    ]);

    if (rows.length > 0) {
      await appendRows(connection.accessToken, spreadsheetId, 'Expenses', rows);
    }

    // Update last_synced timestamp
    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('integration_connections')
        .update({ metadata: { ...connection.metadata, last_synced: new Date().toISOString() } })
        .eq('user_id', userId)
        .eq('provider', 'google_sheets');
    }

    return {
      synced: rows.length,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (err) {
    console.error('syncAllExpensesToSheets error:', err);
    return null;
  }
}

/**
 * Get the spreadsheet URL for a user
 */
export async function getSpreadsheetUrl(userId: string): Promise<string | null> {
  const connection = await getGoogleConnection(userId, 'google_sheets');
  if (!connection) return null;

  const spreadsheetId = connection.metadata.spreadsheet_id as string | undefined;
  if (!spreadsheetId) return null;

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

/**
 * Get connection metadata (for showing in UI)
 */
export async function getConnectionMetadata(
  userId: string,
  provider: GoogleProvider
): Promise<Record<string, unknown> | null> {
  const connection = await getGoogleConnection(userId, provider);
  if (!connection) return null;
  return connection.metadata;
}
