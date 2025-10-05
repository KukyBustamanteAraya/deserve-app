import { describe, it, expect } from 'vitest';

describe('catalog barrel resolves', () => {
  it('can import ProductCard via barrel', async () => {
    const mod = await import('@/components/catalog');
    expect(mod).toHaveProperty('ProductCard');
    expect(mod).toHaveProperty('CompactProductCard');
    expect(mod).toHaveProperty('ProductCardSkeleton');
  });

  it('can import FabricSelector via barrel', async () => {
    const mod = await import('@/components/catalog');
    expect(mod).toHaveProperty('FabricSelector');
  });

  it('can import QuantitySlider via barrel', async () => {
    const mod = await import('@/components/catalog');
    expect(mod).toHaveProperty('QuantitySlider');
  });

  it('can import TeamPricing via barrel', async () => {
    const mod = await import('@/components/catalog');
    expect(mod).toHaveProperty('TeamPricing');
  });
});
