import { describe, expect, it } from 'vitest';
import { TransitRegistry } from '../src/registry.js';

describe('TransitRegistry', () => {
  const registry = new TransitRegistry();

  it('should list 5 supported cities', () => {
    const cities = registry.listSupportedCities();
    expect(cities).toHaveLength(5);
    const ids = cities.map((c) => c.id);
    expect(ids).toContain('msp');
    expect(ids).toContain('boston');
    expect(ids).toContain('sf_bart');
    expect(ids).toContain('chicago');
    expect(ids).toContain('portland');
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
  });
});
