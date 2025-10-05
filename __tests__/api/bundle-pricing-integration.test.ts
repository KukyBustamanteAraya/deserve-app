/**
 * Bundle Pricing Integration Tests
 * Verifies bundle discounts work correctly for product pricing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('[integration] Bundle Pricing Integration', () => {
  const testProductId = 14; // Known product with pricing tiers

  describe('Quantity-based pricing (no bundle)', () => {
    it('should return unit_price 1,800,000 and total 45,000,000 for qty 25', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.unit_price).toBe(1_800_000);
      expect(json.quantity).toBe(25);
      expect(json.total).toBe(45_000_000);
      expect(json.discount_pct).toBeUndefined(); // No bundle discount
    });
  });

  describe('Bundle discount pricing', () => {
    it('should return total 41,400,000 (8% off) for qty 25 with bundleCode B5', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25&bundleCode=B5`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.unit_price).toBe(1_800_000);
      expect(json.quantity).toBe(25);
      expect(json.discount_pct).toBe(8); // B5 bundle discount
      expect(json.total).toBe(41_400_000); // 45M - 8% = 41.4M

      // Verify calculation: unit_price * quantity * (100 - discount_pct) / 100
      const expectedTotal = Math.round((1_800_000 * 25 * (100 - 8)) / 100);
      expect(json.total).toBe(expectedTotal);
    });

    it('should return 5% discount for bundleCode B1', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25&bundleCode=B1`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.discount_pct).toBe(5); // B1 bundle discount

      // 45M - 5% = 42.75M
      const expectedTotal = Math.round((1_800_000 * 25 * (100 - 5)) / 100);
      expect(json.total).toBe(expectedTotal);
      expect(json.total).toBe(42_750_000);
    });

    it('should work with qty 1 and bundle B5', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=1&bundleCode=B5`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.unit_price).toBe(2_000_000); // Base price
      expect(json.quantity).toBe(1);
      expect(json.discount_pct).toBe(8);
      expect(json.total).toBe(1_840_000); // 2M - 8% = 1.84M
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid bundle code gracefully', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25&bundleCode=INVALID`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      // Should return error or no discount
      if (res.status === 200) {
        // If API returns success, discount should be 0 or undefined
        expect(json.discount_pct || 0).toBe(0);
      } else {
        // Or return error
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(json.error).toBeTruthy();
      }
    });
  });
});
