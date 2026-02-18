import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { backupReceiptToDrive } from '@/lib/integrations/google-sync';

const isRateLimited = createRateLimiter('google-upload-receipt', 20, 60_000);

/**
 * POST /api/integrations/google/upload-receipt
 * Upload a receipt file to Google Drive (if connected).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = await authenticateRequest();

    const body = await request.json();
    const { fileName, fileContent, mimeType, propertyName } = body as {
      fileName: string;
      fileContent: string; // base64
      mimeType: string;
      propertyName?: string;
    };

    if (!fileName || !fileContent || !mimeType) {
      return NextResponse.json({ error: 'Missing required fields: fileName, fileContent, mimeType' }, { status: 400 });
    }

    const buffer = Buffer.from(fileContent, 'base64');

    const result = await backupReceiptToDrive(
      auth.userId,
      fileName,
      mimeType,
      buffer,
      propertyName
    );

    if (!result) {
      return NextResponse.json({ success: false, message: 'Google Drive not connected or upload failed' });
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('upload-receipt error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
