import { describe, expect, it } from 'vitest';
import { PortlandTriMetTransitAdapter } from '../../src/cities/portland.js';

describe('PortlandTriMetTransitAdapter', () => {
  it('should list MAX Light Rail routes', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const routes = await adapter.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(5);
    const blueLine = routes.find((r) => r.shortName === 'MAX Blue');
    expect(blueLine).toBeDefined();
    expect(blueLine?.type).toBe('light_rail');

    const redLine = await adapter.getRoutes('Red');
    expect(redLine.some((r) => r.shortName === 'MAX Red')).toBe(true);
  });

  it('should return stops for MAX Blue line', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const stops = await adapter.getStops('100');
    expect(stops.length).toBeGreaterThan(0);
    const pioneer = stops.find((s) => s.name.includes('Pioneer Courthouse Square'));
    expect(pioneer).toBeDefined();
  });

  it('should provide departures for Portland stops', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const deps = await adapter.getDepartures('8334');
    expect(deps.length).toBeGreaterThan(0);
    expect(deps[0].stopName).toContain('Pioneer Courthouse Square');
  });

  it('should return TriMet alerts', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].header).toContain('TriMet');
  });
});
