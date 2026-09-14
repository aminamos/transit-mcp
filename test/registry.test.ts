import { describe, expect, it } from 'vitest';
import { TransitRegistry } from '../src/registry.js';
import { SUPPORTED_CITY_IDS } from '../src/types.js';

describe('TransitRegistry', () => {
  const registry = new TransitRegistry();

  it('should list 9 supported cities', () => {
    const cities = registry.listSupportedCities();
    expect(cities).toHaveLength(9);
    const ids = cities.map((c) => c.id);
    expect(ids).toContain('msp');
    expect(ids).toContain('dc');
    expect(ids).toContain('atl');
    expect(ids).toContain('mia');
    expect(ids).toContain('bna');
    expect(ids).toContain('boston');
    expect(ids).toContain('sf_bart');
    expect(ids).toContain('chicago');
    expect(ids).toContain('portland');
    expect(SUPPORTED_CITY_IDS).toHaveLength(9);
  });

  it('should resolve city by exact ID', () => {
    expect(registry.getAdapter('msp').info.id).toBe('msp');
    expect(registry.getAdapter('boston').info.id).toBe('boston');
    expect(registry.getAdapter('sf_bart').info.id).toBe('sf_bart');
    expect(registry.getAdapter('chicago').info.id).toBe('chicago');
    expect(registry.getAdapter('portland').info.id).toBe('portland');
  });

  it('should resolve city by common aliases', () => {
    expect(registry.getAdapter('minneapolis').info.id).toBe('msp');
    expect(registry.getAdapter('stpaul').info.id).toBe('msp');
    expect(registry.getAdapter('twin-cities').info.id).toBe('msp');
    expect(registry.getAdapter('mbta').info.id).toBe('boston');
    expect(registry.getAdapter('sf').info.id).toBe('sf_bart');
    expect(registry.getAdapter('bart').info.id).toBe('sf_bart');
    expect(registry.getAdapter('bayarea').info.id).toBe('sf_bart');
    expect(registry.getAdapter('cta').info.id).toBe('chicago');
    expect(registry.getAdapter('trimet').info.id).toBe('portland');
    expect(registry.getAdapter('pdx').info.id).toBe('portland');
  });

  it('should throw an informative error on unknown city', () => {
    expect(() => registry.getAdapter('atlantis')).toThrowError(/Unsupported city "atlantis"/);
    expect(() => registry.getAdapter('zz')).toThrowError(/Unsupported city "zz"/);
  });

  it('should resolve city by prefix match', () => {
    expect(registry.getAdapter('bost').info.id).toBe('boston');
  });

  it('should resolve city by substring match when length >= 3', () => {
    expect(registry.getAdapter('cago').info.id).toBe('chicago');
  });

  it('should throw if matched alias points to missing adapter', () => {
    const customRegistry = new TransitRegistry();
    (customRegistry as any).adapters.delete('msp');
    expect(() => customRegistry.getAdapter('msp')).toThrowError(/Unsupported city "msp"/);
  });
});

