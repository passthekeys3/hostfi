import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => vi.fn(() => false)),
}));

vi.mock('@/lib/expense-categories', () => ({
  EXPENSE_CATEGORY_CONFIG: {},
}));

import { authenticateRequest } from '@/lib/auth';
import { POST } from '@/app/api/expenses/import/route';

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/expenses/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/expenses/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue({
      authenticated: true,
      userId: 'test-user-123',
      email: 'test@example.com',
    });
  });

  describe('validation', () => {
    it('rejects non-array expenses', async () => {
      const req = createMockRequest({ expenses: 'not-an-array' });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('must be an array');
    });

    it('rejects arrays over 10K items', async () => {
      const expenses = Array(10_001).fill({
        date: '2024-01-01',
        amount: 100,
        description: 'Test',
        property: 'Test Property',
      });

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Too many expenses');
      expect(body.error).toContain('10000');
    });

    it('validates required fields', async () => {
      const expenses = [
        { date: '2024-01-01', amount: 100 }, // missing description, property
        { date: '2024-01-01', description: 'Test', property: 'Prop' }, // missing amount
        { amount: 100, description: 'Test', property: 'Prop' }, // missing date
      ];

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.skipped).toBe(3);
      expect(body.imported).toBe(0);
      expect(body.errors.length).toBe(3);
      expect(body.errors[0]).toContain('missing required fields');
    });

    it('validates date format', async () => {
      const expenses = [
        { date: 'invalid-date', amount: 100, description: 'Test', property: 'Prop' },
        { date: '01-01-2024', amount: 100, description: 'Test', property: 'Prop' },
      ];

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(2);
      expect(body.errors.some((e: string) => e.includes('invalid date format'))).toBe(true);
    });

    it('rejects amounts over $10M', async () => {
      const expenses = [
        { date: '2024-01-01', amount: 10_000_001, description: 'Too big', property: 'Prop' },
      ];

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(1);
      expect(body.imported).toBe(0);
      expect(body.errors.some((e: string) => e.includes('invalid amount'))).toBe(true);
    });

    it('rejects zero or negative amounts', async () => {
      const expenses = [
        { date: '2024-01-01', amount: 0, description: 'Zero', property: 'Prop' },
        { date: '2024-01-01', amount: -100, description: 'Negative', property: 'Prop' },
      ];

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(body.skipped).toBe(2);
      expect(body.imported).toBe(0);
    });
  });

  describe('duplicate detection', () => {
    it('detects duplicates within the import batch', async () => {
      const expense = {
        date: '2024-01-01',
        amount: 100,
        description: 'Same expense',
        property: 'Same Property',
      };

      const req = createMockRequest({ expenses: [expense, expense, expense] });
      const res = await POST(req);
      const body = await res.json();

      expect(body.imported).toBe(1);
      expect(body.duplicates).toBe(2);
    });

    it('detects duplicates against existing expenses', async () => {
      const expense = {
        date: '2024-01-01',
        amount: 100,
        description: 'Existing expense',
        property: 'Property',
      };

      const req = createMockRequest({
        expenses: [expense],
        existingExpenses: [expense],
      });
      const res = await POST(req);
      const body = await res.json();

      expect(body.imported).toBe(0);
      expect(body.duplicates).toBe(1);
    });
  });

  describe('successful import', () => {
    it('imports valid expenses', async () => {
      const expenses = [
        {
          date: '2024-01-15',
          amount: 150.50,
          description: 'Plumbing repair',
          property: 'Beach House',
          vendor: 'Local Plumber',
          category: 'repairs',
          notes: 'Fixed leaky faucet',
        },
        {
          date: '2024-02-01',
          amount: 2000,
          description: 'Property insurance',
          property: 'Mountain Cabin',
        },
      ];

      const req = createMockRequest({ expenses });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.imported).toBe(2);
      expect(body.expenses.length).toBe(2);
      expect(body.expenses[0].user_id).toBe('test-user-123');
      expect(body.expenses[0].amount).toBe(150.50);
      expect(body.expenses[0].description).toBe('Plumbing repair');
    });
  });
});
