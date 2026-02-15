import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getConnectionMetadata, getSpreadsheetUrl } from '@/lib/integrations/google-sync';

/**
 * GET /api/integrations/google/connection
 * Get Google connection info for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    const [sheetsMetadata, driveMetadata, spreadsheetUrl] = await Promise.all([
      getConnectionMetadata(auth.userId, 'google_sheets'),
      getConnectionMetadata(auth.userId, 'google_drive'),
      getSpreadsheetUrl(auth.userId),
    ]);

    return NextResponse.json({
      sheets: {
        connected: !!sheetsMetadata,
        spreadsheetUrl,
        lastSynced: sheetsMetadata?.last_synced || null,
      },
      drive: {
        connected: !!driveMetadata,
        folderId: driveMetadata?.hostfi_folder_id || null,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
