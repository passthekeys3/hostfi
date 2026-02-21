import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

describe('Stripe configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getPlatformFeePercent', () => {
    it('returns 0.5% for free plan', async () => {
      const { getPlatformFeePercent } = await import('../stripe');
      expect(getPlatformFeePercent('free')).toBe(0.5);
    });

    it('returns 0.25% for pro plan', async () => {
      const { getPlatformFeePercent } = await import('../stripe');
      expect(getPlatformFeePercent('pro')).toBe(0.25);
    });

    it('returns 0.25% for business plan', async () => {
      const { getPlatformFeePercent } = await import('../stripe');
      expect(getPlatformFeePercent('business')).toBe(0.25);
    });
  });

  describe('PLANS configuration', () => {
    it('has correct property limits', async () => {
      const { PLANS } = await import('../stripe');
      expect(PLANS.free.properties).toBe(3);
      expect(PLANS.pro.properties).toBe(10);
      expect(PLANS.business.properties).toBe(25);
    });

    it('has correct prices', async () => {
      const { PLANS } = await import('../stripe');
      expect(PLANS.free.price).toBe(0);
      expect(PLANS.pro.price).toBe(15);
      expect(PLANS.business.price).toBe(49);
    });

    it('free plan has no priceId', async () => {
      const { PLANS } = await import('../stripe');
      expect(PLANS.free.priceId).toBeNull();
      expect(PLANS.free.annualPriceId).toBeNull();
    });

    it('paid plans have priceIds', async () => {
      const { PLANS } = await import('../stripe');
      expect(PLANS.pro.priceId).toBeTruthy();
      expect(PLANS.pro.annualPriceId).toBeTruthy();
      expect(PLANS.business.priceId).toBeTruthy();
      expect(PLANS.business.annualPriceId).toBeTruthy();
    });
  });

  describe('isFeatureAvailable', () => {
    it('restricts premium features from free plan', async () => {
      const { isFeatureAvailable } = await import('../stripe');
      expect(isFeatureAvailable('free', 'ach_payments')).toBe(false);
      expect(isFeatureAvailable('free', 'tax_export')).toBe(false);
      expect(isFeatureAvailable('free', 'ai_summaries')).toBe(false);
    });

    it('allows premium features on pro plan', async () => {
      const { isFeatureAvailable } = await import('../stripe');
      expect(isFeatureAvailable('pro', 'ach_payments')).toBe(true);
      expect(isFeatureAvailable('pro', 'tax_export')).toBe(true);
      expect(isFeatureAvailable('pro', 'ai_summaries')).toBe(true);
    });

    it('restricts business features from pro plan', async () => {
      const { isFeatureAvailable } = await import('../stripe');
      expect(isFeatureAvailable('pro', 'benchmarking')).toBe(false);
      expect(isFeatureAvailable('pro', 'team_access')).toBe(false);
      expect(isFeatureAvailable('pro', 'api_access')).toBe(false);
    });

    it('allows all features on business plan', async () => {
      const { isFeatureAvailable } = await import('../stripe');
      expect(isFeatureAvailable('business', 'ach_payments')).toBe(true);
      expect(isFeatureAvailable('business', 'benchmarking')).toBe(true);
      expect(isFeatureAvailable('business', 'team_access')).toBe(true);
      expect(isFeatureAvailable('business', 'quickbooks')).toBe(true);
      expect(isFeatureAvailable('business', 'api_access')).toBe(true);
    });
  });

  describe('getPlanLimits', () => {
    it('returns correct limits for each plan', async () => {
      const { getPlanLimits, PLANS } = await import('../stripe');
      
      expect(getPlanLimits('free')).toBe(PLANS.free);
      expect(getPlanLimits('pro')).toBe(PLANS.pro);
      expect(getPlanLimits('business')).toBe(PLANS.business);
    });
  });

  describe('production validation', () => {
    it('logs error in production without STRIPE_SECRET_KEY', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (process.env as Record<string, string>).NODE_ENV = 'production';
      delete process.env.STRIPE_SECRET_KEY;

      vi.resetModules();
      await import('../stripe');

      expect(consoleSpy).toHaveBeenCalledWith(
        'STRIPE_SECRET_KEY not configured — payments will not work'
      );
      consoleSpy.mockRestore();
    });
  });
});
