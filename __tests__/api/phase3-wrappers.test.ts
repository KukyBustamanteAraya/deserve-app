/**
 * Phase 3 API Wrapper Integration Tests
 * Verifies all endpoints return standardized { data: { items } } format
 * and rugby fabric recommendations show Firm first
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('[integration] Phase 3 API Wrapper Contract', () => {
  describe('GET /api/fabrics', () => {
    it('should return { data: { items } } wrapper', async () => {
      const res = await fetch(`${BASE_URL}/api/fabrics`, { cache: 'no-store' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
    });
  });

  describe('GET /api/sports', () => {
    it('should return { data: { items } } wrapper', async () => {
      const res = await fetch(`${BASE_URL}/api/sports`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('GET /api/bundles', () => {
    it('should return { data: { items } } wrapper', async () => {
      const res = await fetch(`${BASE_URL}/api/bundles`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
    });
  });

  describe('GET /api/fabrics/recommendations - Rugby Overrides', () => {
    it('should show Firm first for rugby jerseys with suitability 5', async () => {
      const res = await fetch(`${BASE_URL}/api/fabrics/recommendations?type=jersey&sport=rugby`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
      
      // Verify Firm is first
      expect(json.data.items.length).toBeGreaterThan(0);
      expect(json.data.items[0].fabric_name).toBe('Firm');
      expect(json.data.items[0].suitability).toBe(5);
    });

    it('should show Firm first for rugby shorts with suitability 5', async () => {
      const res = await fetch(`${BASE_URL}/api/fabrics/recommendations?type=shorts&sport=rugby`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
      
      // Verify Firm is first
      expect(json.data.items.length).toBeGreaterThan(0);
      expect(json.data.items[0].fabric_name).toBe('Firm');
      expect(json.data.items[0].suitability).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should return { data: { items: [] } } on error', async () => {
      // This test assumes the endpoint handles errors gracefully
      const res = await fetch(`${BASE_URL}/api/fabrics/recommendations?type=invalid`);
      const json = await res.json();

      // Even on error, should have data wrapper
      expect(json).toHaveProperty('data');
      expect(json.data).toHaveProperty('items');
      expect(Array.isArray(json.data.items)).toBe(true);
    });
  });
});
