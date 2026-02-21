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

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(fileContent, 'base64');

    // Validate file size (10MB max)
    if (buffer.length > 10_485_760) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

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
    console.error('upload-receipt error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
