import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => vi.fn(() => false)),
}));

import { authenticateRequest } from '@/lib/auth';
import { POST } from '@/app/api/revenue/import/route';

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/revenue/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/revenue/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue({
      authenticated: true,
      userId: 'test-user-456',
      email: 'test@example.com',
    });
  });

  describe('validation', () => {
    it('rejects non-array entries', async () => {
      const req = createMockRequest({ entries: 'not-an-array' });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('must be an array');
    });

    it('rejects arrays over 10K items', async () => {
      const entries = Array(10_001).fill({
        property_id: 'prop-1',
        check_in: '2024-01-01',
        check_out: '2024-01-05',
        amount: 500,
      });

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Too many entries');
      expect(body.error).toContain('10000');
    });

    it('validates required fields - missing property_id', async () => {
      const entries = [
        { check_in: '2024-01-01', check_out: '2024-01-05', amount: 500 },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(1);
      expect(body.imported).toBe(0);
      expect(body.errors.some((e: string) => e.includes('property'))).toBe(true);
    });

    it('validates required fields - missing dates or amount', async () => {
      const entries = [
        { property_id: 'prop-1', check_out: '2024-01-05', amount: 500 }, // missing check_in
        { property_id: 'prop-1', check_in: '2024-01-01', amount: 500 }, // missing check_out
        { property_id: 'prop-1', check_in: '2024-01-01', check_out: '2024-01-05' }, // missing amount
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(3);
      expect(body.imported).toBe(0);
      expect(body.errors.some((e: string) => e.includes('Missing required fields'))).toBe(true);
    });

    it('validates date format', async () => {
      const entries = [
        { property_id: 'prop-1', check_in: 'invalid', check_out: '2024-01-05', amount: 500 },
        { property_id: 'prop-1', check_in: '2024-01-01', check_out: 'bad-date', amount: 500 },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(2);
      expect(body.errors.some((e: string) => e.includes('Invalid date format'))).toBe(true);
    });

    it('rejects amounts over $10M', async () => {
      const entries = [
        { property_id: 'prop-1', check_in: '2024-01-01', check_out: '2024-01-05', amount: 10_000_001 },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(1);
      expect(body.imported).toBe(0);
      expect(body.errors.some((e: string) => e.includes('Invalid amount'))).toBe(true);
    });

    it('rejects zero or negative amounts', async () => {
      const entries = [
        { property_id: 'prop-1', check_in: '2024-01-01', check_out: '2024-01-05', amount: 0 },
        { property_id: 'prop-1', check_in: '2024-01-01', check_out: '2024-01-05', amount: -100 },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(2);
      expect(body.imported).toBe(0);
    });
  });

  describe('duplicate detection', () => {
    it('detects duplicates by confirmation code', async () => {
      const entry = {
        property_id: 'prop-1',
        check_in: '2024-01-01',
        check_out: '2024-01-05',
        amount: 500,
        confirmation_code: 'ABC123',
      };

      const req = createMockRequest({
        entries: [entry, { ...entry, amount: 600 }], // same confirmation code
      });
      const res = await POST(req);
      const body = await res.json();

      expect(body.imported).toBe(1);
      expect(body.duplicates).toBe(1);
    });

    it('detects duplicates by dates and amount', async () => {
      const entry = {
        property_id: 'prop-1',
        check_in: '2024-01-01',
        check_out: '2024-01-05',
        amount: 500,
      };

      const req = createMockRequest({
        entries: [entry, entry, entry],
      });
      const res = await POST(req);
      const body = await res.json();

      expect(body.imported).toBe(1);
      expect(body.duplicates).toBe(2);
    });

    it('detects duplicates against existing entries', async () => {
      const entry = {
        property_id: 'prop-1',
        check_in: '2024-01-01',
        check_out: '2024-01-05',
        amount: 500,
      };

      const req = createMockRequest({
        entries: [entry],
        existingEntries: [entry],
      });
      const res = await POST(req);
      const body = await res.json();

      expect(body.imported).toBe(0);
      expect(body.duplicates).toBe(1);
    });
  });

  describe('successful import', () => {
    it('imports valid revenue entries', async () => {
      const entries = [
        {
          property_id: 'prop-1',
          check_in: '2024-01-15',
          check_out: '2024-01-20',
          amount: 750,
          guest_name: 'John Doe',
          source: 'airbnb',
          confirmation_code: 'AIRBNB123',
        },
        {
          property_id: 'prop-2',
          check_in: '2024-02-01',
          check_out: '2024-02-03',
          amount: 300,
          source: 'vrbo',
        },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.imported).toBe(2);
      expect(body.entries.length).toBe(2);
      expect(body.entries[0].user_id).toBe('test-user-456');
      expect(body.entries[0].amount).toBe(750);
      expect(body.entries[0].guest_name).toBe('John Doe');
      expect(body.entries[0].nights).toBe(5);
    });

    it('calculates nights correctly', async () => {
      const entries = [
        {
          property_id: 'prop-1',
          check_in: '2024-01-01',
          check_out: '2024-01-04',
          amount: 300,
        },
      ];

      const req = createMockRequest({ entries });
      const res = await POST(req);
      const body = await res.json();

      expect(body.entries[0].nights).toBe(3);
    });
  });
});
