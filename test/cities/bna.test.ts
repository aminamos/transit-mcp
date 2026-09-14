import { describe, expect, it } from 'vitest';
import { WeGoNashvilleTransitAdapter } from '../../src/cities/bna.js';

describe('WeGoNashvilleTransitAdapter', () => {
  it('should list and filter WeGo Star rail and bus routes', async () => {
    const adapter = new WeGoNashvilleTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(40);

    const star = allRoutes.find((r) => r.id === 'Star');
    expect(star).toBeDefined();
    expect(star?.type).toBe('rail');
    expect(star?.longName).toContain('WeGo Star');

    const bus55 = allRoutes.find((r) => r.id === '55');
    expect(bus55).toBeDefined();
    expect(bus55?.type).toBe('bus');

    const filtered = await adapter.getRoutes('airport');
    expect(filtered.length).toBeGreaterThanOrEqual(1);

    const empty = await adapter.getRoutes('xyz_nonexistent');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for WeGo Star or fallback to all stations', async () => {
    const adapter = new WeGoNashvilleTransitAdapter();
    const starStops = await adapter.getStops('Star');
    expect(starStops.length).toBeGreaterThan(0);
    expect(starStops.some((s) => s.name === 'Riverfront Station')).toBe(true);

    const fallback = await adapter.getStops('unknown_route');
    expect(fallback.length).toBeGreaterThan(5);
  });

  it('should calculate commuter rail and bus departures', async () => {
    const adapter = new WeGoNashvilleTransitAdapter();
    const departures = await adapter.getDepartures('Riverfront Station');
    expect(departures.length).toBeGreaterThan(0);

    const railDep = departures.find((d) => d.status?.includes('Passenger Rail'));
    expect(railDep).toBeDefined();

    const codeDep = await adapter.getDepartures('CENT');
    expect(codeDep.length).toBeGreaterThan(0);

    const unknownDep = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDep.length).toBeGreaterThan(0);
    expect(unknownDep[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should return service alerts and filter by route', async () => {
    const adapter = new WeGoNashvilleTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const starAlerts = await adapter.getAlerts('Star');
    expect(starAlerts.length).toBeGreaterThan(0);

    const nonMatching = await adapter.getAlerts('nonexistent_route');
    expect(nonMatching).toHaveLength(0);
  });
});
