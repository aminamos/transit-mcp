import { describe, expect, it } from 'vitest';
import { PortlandTriMetTransitAdapter } from '../../src/cities/portland.js';

describe('PortlandTriMetTransitAdapter', () => {
  it('should list MAX Light Rail and TriMet bus routes', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const routes = await adapter.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(70);
    const blueLine = routes.find((r) => r.shortName === 'MAX Blue');
    expect(blueLine).toBeDefined();
    expect(blueLine?.type).toBe('light_rail');

    const bus72 = routes.find((r) => r.id === '72');
    expect(bus72).toBeDefined();
    expect(bus72?.type).toBe('bus');

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

  it('should test getRoutes search filtering matching description and empty matches', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const byDesc = await adapter.getRoutes('beaverton');
    expect(byDesc.some((r) => r.id === '100')).toBe(true);

    const empty = await adapter.getRoutes('no such route');
    expect(empty).toHaveLength(0);
  });

  it('should fallback to all stations when routeId is unmatched in getStops', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    const stops = await adapter.getStops('nonexistent');
    expect(stops.length).toBeGreaterThan(5);
  });

  it('should test scheduled departures with stop name, unknown stop, and diverse lines', async () => {
    const adapter = new PortlandTriMetTransitAdapter();
    // By stop name
    const depsByName = await adapter.getDepartures('galleria');
    expect(depsByName.length).toBeGreaterThan(0);
    expect(depsByName.some((d) => d.destination === 'Portland Airport (PDX)')).toBe(true);
    expect(depsByName.some((d) => d.destination === 'Gresham TC')).toBe(true);

    // Stop with other line e.g. PSU South has 290
    const depsPsu = await adapter.getDepartures('7601');
    expect(depsPsu.some((d) => d.destination === 'City Center')).toBe(true);

    // Unknown stop ID
    const depsUnknown = await adapter.getDepartures('88888');
    expect(depsUnknown.length).toBeGreaterThan(0);
    expect(depsUnknown[0].stopName).toBe('TriMet Stop (88888)');
  });

  it('should test live departures with appId, estimated/scheduled, and error fallbacks', async () => {
    const mockJson = {
      resultSet: {
        arrival: [
          {
            route: 100,
            shortSign: 'MAX Blue',
            fullSign: 'To Gresham TC',
            estimated: Date.now() + 60000, // <= 1 min -> Due
            status: 'estimated',
            dir: 0,
          },
          {
            route: 90,
            fullSign: '',
            scheduled: Date.now() + 600000, // 10 min
            status: 'scheduled',
            dir: 1,
          },
          {
            route: 12,
            dir: 1,
          },
        ],
      },
    };

    const mockFetch = (async (url: string) => {
      if (url.includes('fail-http')) return { ok: false, status: 500 };
      if (url.includes('throw-net')) throw new Error('Network error');
      return {
        ok: true,
        json: async () => mockJson,
      };
    }) as any;

    const adapter = new PortlandTriMetTransitAdapter(mockFetch, 'test-app-id');
    const deps = await adapter.getDepartures('8334');
    expect(deps).toHaveLength(3);
    expect(deps[0].countdownMinutes).toBe('Due');
    expect(deps[0].isRealtime).toBe(true);
    expect(deps[0].status).toBe('Live GPS');
    expect(deps[0].direction).toBe('Outbound');

    expect(deps[1].countdownMinutes).toBe(10);
    expect(deps[1].isRealtime).toBe(false);
    expect(deps[1].status).toBe('Scheduled');
    expect(deps[1].direction).toBe('Inbound');
    expect(deps[1].routeShortName).toBe('Line 90');
    expect(deps[1].destination).toBe('In Service');

    expect(deps[2].countdownMinutes).toBe('Due');
    expect(deps[2].departureTime).toBeDefined();

    // Fallback on HTTP failure
    const failDeps = await adapter.getDepartures('fail-http');
    expect(failDeps.length).toBeGreaterThan(0);

    // Fallback on network throw
    const throwDeps = await adapter.getDepartures('throw-net');
    expect(throwDeps.length).toBeGreaterThan(0);
  });

  it('should test getAlerts with appId, single detour, and error fallbacks', async () => {
    const mockJson = {
      resultSet: {
        detour: [
          {
            id: 1,
            header: 'Detour on Line 4',
            desc: 'Bus detour on Division',
            route: 4,
            begin: '2026-09-13',
          },
          {
            id: 2,
          },
        ],
      },
    };

    const mockFetch = (async (url: string) => {
      if (url.includes('fail-http')) return { ok: false, status: 500 };
      if (url.includes('throw-net')) throw new Error('Crash');
      return {
        ok: true,
        json: async () => mockJson,
      };
    }) as any;

    const adapter = new PortlandTriMetTransitAdapter(mockFetch, 'test-app-id');
    const alerts = await adapter.getAlerts();
    expect(alerts).toHaveLength(2);
    expect(alerts[0].header).toBe('Detour on Line 4');
    expect(alerts[0].description).toBe('Bus detour on Division');
    expect(alerts[0].affectedRoutes).toEqual(['4']);

    expect(alerts[1].header).toBe('TriMet Service Detour');
    expect(alerts[1].description).toBe('TriMet Service Detour');
    expect(alerts[1].affectedRoutes).toBeUndefined();

    // Single detour object (not array)
    const singleDetourFetch = (async () => ({
      ok: true,
      json: async () => ({
        resultSet: {
          detour: {
            id: 3,
            header: 'Single Detour',
            route: 100,
          },
        },
      }),
    })) as any;
    const singleAdapter = new PortlandTriMetTransitAdapter(singleDetourFetch, 'test-app-id');
    const singleAlerts = await singleAdapter.getAlerts();
    expect(singleAlerts).toHaveLength(1);

    // Fallback on HTTP failure
    const failAdapter = new PortlandTriMetTransitAdapter((async () => ({ ok: false, status: 500 })) as any, 'test-app-id');
    const fallbackAlerts = await failAdapter.getAlerts('MAX Red');
    expect(fallbackAlerts.length).toBe(2);
    expect(fallbackAlerts[1].id).toBe('trimet-red-info');

    // Fallback on network crash with non-red route filter
    const crashAdapter = new PortlandTriMetTransitAdapter((async () => { throw new Error('Crash'); }) as any, 'test-app-id');
    const blueAlerts = await crashAdapter.getAlerts('MAX Blue');
    expect(blueAlerts).toHaveLength(1);
    expect(blueAlerts[0].affectedRoutes).toEqual(['MAX Blue']);

    // Empty detour resultSet
    const emptyDetourAdapter = new PortlandTriMetTransitAdapter((async () => ({
      ok: true,
      json: async () => ({ resultSet: {} }),
    })) as any, 'test-app-id');
    expect(await emptyDetourAdapter.getAlerts()).toEqual([]);
  });

  it('should test missing arrivals and unknown routeInfo in scheduled departures', async () => {
    // Missing arrival property in resultSet
    const emptyArrivalAdapter = new PortlandTriMetTransitAdapter((async () => ({
      ok: true,
      json: async () => ({ resultSet: {} }),
    })) as any, 'test-app-id');
    expect(await emptyArrivalAdapter.getDepartures('8334')).toEqual([]);

    // Stop with line not in TRIMET_ROUTES to test routeInfo ? routeInfo.shortName : Line ${lineId}
    const adapter = new PortlandTriMetTransitAdapter();
    const depsUnknownLine = await adapter.getDepartures('8340');
    expect(depsUnknownLine.some((d) => d.routeShortName === 'Line 999')).toBe(true);
  });



  it('should read TRIMET_APP_ID from process.env', async () => {
    const original = process.env.TRIMET_APP_ID;
    process.env.TRIMET_APP_ID = 'pdx-env-app-id';
    const adapter = new PortlandTriMetTransitAdapter();
    expect((adapter as any).appId).toBe('pdx-env-app-id');
    process.env.TRIMET_APP_ID = original;
  });
});
