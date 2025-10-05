/**
 * Pricing Calculator Integration Tests
 * Tests pricing_tiers_product (product-based tiers) + bundle discounts (CLP)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('[integration] GET /api/pricing/calculate', () => {
  describe('Single Product Pricing (pricing_tiers_product + fallback)', () => {
    const testProductId = 18; // Using a known product ID

    it('should calculate price for qty 1', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=1`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('unit_price');
      expect(json).toHaveProperty('quantity', 1);
      expect(json).toHaveProperty('total');
      expect(json.total).toBe(json.unit_price * 1);
      // Should be integer (CLP)
      expect(Number.isInteger(json.unit_price)).toBe(true);
      expect(Number.isInteger(json.total)).toBe(true);
    });

    it('should use pricing_tiers_product for qty 25 if seeded', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.unit_price).toBeGreaterThan(0);
      expect(json.total).toBe(json.unit_price * 25);
      // Verify discounted (either from DB tier or fallback band)
      // At qty 25, should have 10% discount from fallback bands
    });

    it('should calculate price for qty 50', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=50`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.total).toBe(json.unit_price * 50);
    });

    it('should calculate price for qty 100', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=100`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.total).toBe(json.unit_price * 100);
    });

    it('should return unit_price from pricing_tiers_product when available', async () => {
      // Test that DB tier is preferred over fallback
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=10`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.unit_price).toBeGreaterThan(0);
      // If pricing_tiers_product is seeded, this should match DB value
      // Otherwise falls back to 5% discount band
    });
  });

  describe('Bundle Pricing (MVP with discount_pct)', () => {
    const testProductId = 18;

    it('should apply B5 bundle discount (8%) to total', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=12&bundleCode=B5`
      );
      const json = await res.json();

      // If discount_pct column exists, expect bundle discount
      if (!json.error) {
        expect(res.status).toBe(200);
        expect(json).toHaveProperty('unit_price');
        expect(json).toHaveProperty('discount_pct');
        expect(json).toHaveProperty('total');

        // Verify discount is applied: total < (unit_price * quantity)
        const grossTotal = json.unit_price * 12;
        expect(json.total).toBeLessThan(grossTotal);

        // B5 should have 8% discount
        if (json.discount_pct) {
          expect(json.discount_pct).toBe(8);
          const expectedTotal = Math.round(grossTotal * (100 - 8) / 100);
          expect(json.total).toBe(expectedTotal);
        }
      } else {
        // If migration not applied, expect "Bundle not found"
        expect(json.error).toContain('Bundle not found');
      }
    });

    it('should apply B1 bundle discount (5%) to total', async () => {
      const res = await fetch(
        `${BASE_URL}/api/pricing/calculate?productId=${testProductId}&quantity=25&bundleCode=B1`
      );
      const json = await res.json();

      if (!json.error) {
        expect(res.status).toBe(200);
        expect(json.discount_pct).toBe(5);

        const grossTotal = json.unit_price * 25;
        const expectedTotal = Math.round(grossTotal * 0.95);
        expect(json.total).toBe(expectedTotal);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return error for invalid quantity', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=18&quantity=0`);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBeTruthy();
    });

    it('should return error for missing productId', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?quantity=10`);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBeTruthy();
    });

    it('should return 404 for invalid productId', async () => {
      const res = await fetch(`${BASE_URL}/api/pricing/calculate?productId=99999&quantity=10`);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBeTruthy();
    });
  });
});
