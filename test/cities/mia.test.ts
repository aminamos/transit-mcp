import { describe, expect, it } from 'vitest';
import { MiamiDadeTransitAdapter } from '../../src/cities/mia.js';

describe('MiamiDadeTransitAdapter', () => {
  it('should list and filter Miami Metrorail, Metromover, and Metrobus routes', async () => {
    const adapter = new MiamiDadeTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(80);

    const orange = allRoutes.find((r) => r.id === 'Orange');
    expect(orange).toBeDefined();
    expect(orange?.type).toBe('subway');
    expect(orange?.description).toContain('Airport');

    const bus38 = allRoutes.find((r) => r.id === '38');
    expect(bus38).toBeDefined();
    expect(bus38?.type).toBe('bus');

    const mover = allRoutes.find((r) => r.id === 'Inner');
    expect(mover).toBeDefined();
    expect(mover?.type).toBe('light_rail');

    const filtered = await adapter.getRoutes('Airport');
    expect(filtered.length).toBeGreaterThanOrEqual(1);

    const empty = await adapter.getRoutes('nonexistent_xyz');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for routes or fallback to all stations', async () => {
    const adapter = new MiamiDadeTransitAdapter();
    const orangeStops = await adapter.getStops('Orange');
    expect(orangeStops.length).toBeGreaterThan(0);
    expect(orangeStops.some((s) => s.name === 'Government Center')).toBe(true);

    const fallback = await adapter.getStops('unknown_route');
    expect(fallback.length).toBeGreaterThan(10);
  });

  it('should calculate Metrorail and Metromover departures', async () => {
    const adapter = new MiamiDadeTransitAdapter();
    const departures = await adapter.getDepartures('Government Center');
    expect(departures.length).toBeGreaterThan(0);

    const moverDep = departures.find((d) => d.status?.includes('Metromover'));
    expect(moverDep).toBeDefined();

    const railDep = departures.find((d) => d.status?.includes('Scheduled'));
    expect(railDep).toBeDefined();

    const codeDep = await adapter.getDepartures('MIA');
    expect(codeDep.length).toBeGreaterThan(0);

    const unknownDep = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDep.length).toBeGreaterThan(0);
    expect(unknownDep[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should return service alerts and filter by route', async () => {
    const adapter = new MiamiDadeTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const orangeAlerts = await adapter.getAlerts('Orange');
    expect(orangeAlerts.length).toBeGreaterThan(0);

    const nonMatching = await adapter.getAlerts('nonexistent_route');
    expect(nonMatching).toHaveLength(0);
  });
});
