/**
 * Auto-sync triggers — fire-and-forget calls to sync integrations
 * when data changes. These never throw — failures are logged silently.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

/**
 * Sync a single expense to Google Sheets (if connected).
 * Call this after creating/updating an expense.
 */
export async function triggerGoogleSheetsSync(expense: {
  date: string;
  property_name: string;
  category: string;
  amount: number;
  description: string;
  notes?: string;
}, cookie?: string) {
  if (!APP_URL) return;
  try {
    await fetch(`${APP_URL}/api/integrations/google/sync-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ expense }),
    });
  } catch (error) {
    console.error('[auto-sync] Google Sheets sync failed:', error);
  }
}

/**
 * Upload a receipt file to Google Drive (if connected).
 * Call this after attaching a receipt to an expense.
 */
export async function triggerGoogleDriveUpload(
  fileName: string,
  fileContent: string, // base64
  mimeType: string,
  cookie?: string
) {
  if (!APP_URL) return;
  try {
    await fetch(`${APP_URL}/api/integrations/google/upload-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ fileName, fileContent, mimeType }),
    });
  } catch (error) {
    console.error('[auto-sync] Google Drive upload failed:', error);
  }
}

/**
 * Fire webhook events to Zapier/Make subscribers.
 * Call this after expense/revenue CRUD operations.
 */
export async function triggerWebhookEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  if (!APP_URL) return;
  try {
    await fetch(`${APP_URL}/api/integrations/webhooks/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, eventType, payload }),
    });
  } catch (error) {
    console.error('[auto-sync] Webhook event fire failed:', error);
  }
}
