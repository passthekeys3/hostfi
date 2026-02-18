import { NextRequest } from 'next/server';

/**
 * POST /api/parse-email
 * 
 * DEPRECATED — redirects to /api/email/inbound
 * Kept for backwards compatibility with any existing Postmark webhook config.
 * Both routes now use the same handler.
 */

// Re-export the handler from the canonical route
export { POST } from '@/app/api/email/inbound/route';
