import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { authenticateRequest } from '../auth';

describe('authenticateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authenticated user when valid session exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    const result = await authenticateRequest();

    expect(result).toEqual({
      authenticated: true,
      userId: 'user-123',
      email: 'test@example.com',
    });
  });

  it('throws 401 response when no session exists', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('No session'),
        }),
      },
    } as any);

    await expect(authenticateRequest()).rejects.toBeInstanceOf(NextResponse);
    
    try {
      await authenticateRequest();
    } catch (response) {
      expect(response).toBeInstanceOf(NextResponse);
      const res = response as NextResponse;
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    }
  });

  it('returns demo mode result when Supabase is not configured', async () => {
    vi.mocked(createClient).mockResolvedValue(null as any);

    const result = await authenticateRequest();

    expect(result).toEqual({
      authenticated: false,
      userId: 'demo',
    });
  });
});
