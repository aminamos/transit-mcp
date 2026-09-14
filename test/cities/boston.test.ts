import { describe, expect, it } from 'vitest';
import { BostonMbtaTransitAdapter } from '../../src/cities/boston.js';

describe('BostonMbtaTransitAdapter', () => {
  it('should fetch routes and map GTFS types', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/routes')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'Red', type: 'route', attributes: { type: 1, long_name: 'Red Line', short_name: 'Red', color: 'DA291C' } },
              { id: 'Green-B', type: 'route', attributes: { type: 0, long_name: 'Green Line B', short_name: 'B' } },
              { id: 'CR-Fitchburg', type: 'route', attributes: { type: 2, long_name: 'Fitchburg Line' } },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const routes = await adapter.getRoutes();
    expect(routes).toHaveLength(3);
    expect(routes[0].type).toBe('subway');
    expect(routes[1].type).toBe('light_rail');
    expect(routes[2].type).toBe('rail');
  });

  it('should fetch stops for a route', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/stops')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'place-alfcl', type: 'stop', attributes: { name: 'Alewife', latitude: 42.395, longitude: -71.142 } },
              { id: 'place-davis', type: 'stop', attributes: { name: 'Davis', latitude: 42.396, longitude: -71.121 } },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const stops = await adapter.getStops('Red');
    expect(stops).toHaveLength(2);
    expect(stops[0].name).toBe('Alewife');
    expect(stops[0].parentStation).toBe('place-alfcl');
  });

  it('should fetch departures and resolve trip headsigns', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/predictions')) {
        const futureTime = new Date(Date.now() + 5 * 60000).toISOString();
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'pred-1',
                type: 'prediction',
                attributes: {
                  arrival_time: futureTime,
                  departure_time: futureTime,
                  direction_id: 1,
                  status: null,
                  schedule_relationship: null,
                },
                relationships: {
                  route: { data: { id: 'Red' } },
                  trip: { data: { id: 'trip-1' } },
                },
              },
            ],
            included: [
              { id: 'trip-1', type: 'trip', attributes: { headsign: 'Alewife' } },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const deps = await adapter.getDepartures('place-sstat');
    expect(deps).toHaveLength(1);
    expect(deps[0].routeId).toBe('Red');
    expect(deps[0].destination).toBe('Alewife');
    expect(deps[0].isRealtime).toBe(true);
  });

  it('should fetch MBTA service alerts', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/alerts')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'alert-1',
                type: 'alert',
                attributes: {
                  header: 'Shuttle buses replace Red Line trains',
                  description: 'Track maintenance between JFK and Ashmont',
                  severity: 7,
                  effect: 'SHUTTLE',
                  informed_entity: [{ route: 'Red' }],
                },
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts('Red');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('severe');
    expect(alerts[0].affectedRoutes).toContain('Red');
  });

  it('should handle API key configuration and header injection', async () => {
    let capturedHeaders: any;
    const mockFetch = (async (url: string, init?: any) => {
      capturedHeaders = init?.headers;
      return {
        ok: true,
        json: async () => ({ data: [] }),
      };
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch, 'test-key-123');
    await adapter.getRoutes();
    expect(capturedHeaders['x-api-key']).toBe('test-key-123');
  });

  it('should handle getRoutes error and query filtering branches', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('fail')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error' };
      }
      return {
        ok: true,
        json: async () => ({
          data: [
            { id: 'boat', type: 'route', attributes: { type: 4, short_name: '', long_name: '', description: 'Commuter boat' } },
            { id: '1', type: 'route', attributes: { type: 3, short_name: '1', long_name: 'Mass Ave', description: '' } },
          ],
        }),
      };
    }) as any;

    const failAdapter = new BostonMbtaTransitAdapter((async () => ({ ok: false, status: 500, statusText: 'Server Error' })) as any);
    await expect(failAdapter.getRoutes()).rejects.toThrow(/Failed to fetch MBTA routes/);

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const routes = await adapter.getRoutes('commuter');
    expect(routes).toHaveLength(1);
    expect(routes[0].type).toBe('ferry');
    expect(routes[0].shortName).toBe('boat');
    expect(routes[0].longName).toBe('boat');

    const routesById = await adapter.getRoutes('1');
    expect(routesById).toHaveLength(1);
    expect(routesById[0].type).toBe('bus');

    const emptyRoutes = await adapter.getRoutes('nonexistent');
    expect(emptyRoutes).toHaveLength(0);
  });

  it('should handle getStops with direction parameter and non-place stop id', async () => {
    let capturedUrl = '';
    const mockFetch = (async (url: string) => {
      capturedUrl = url;
      if (url.includes('fail')) {
        return { ok: false, status: 404 };
      }
      return {
        ok: true,
        json: async () => ({
          data: [
            { id: '1234', type: 'stop', attributes: { name: 'Stop 1234' } },
          ],
        }),
      };
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const stops = await adapter.getStops('1', 0);
    expect(capturedUrl).toContain('filter[direction_id]=0');
    expect(stops[0].parentStation).toBeUndefined();
    expect(stops[0].code).toBe('1234');

    await expect(adapter.getStops('fail')).rejects.toThrow(/Failed to fetch MBTA stops/);
  });

  it('should handle getDepartures edge cases (cancelled, outbound, missing times, error)', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('fail')) {
        return { ok: false, status: 500 };
      }
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'pred-due',
              type: 'prediction',
              attributes: {
                arrival_time: null,
                departure_time: new Date(Date.now() - 60000).toISOString(),
                direction_id: 0,
                status: 'CANCELLED',
                schedule_relationship: 'CANCELLED',
              },
              relationships: {},
            },
            {
              id: 'pred-notime',
              type: 'prediction',
              attributes: {
                arrival_time: null,
                departure_time: null,
                direction_id: 1,
                status: null,
                schedule_relationship: null,
              },
              relationships: {
                route: { data: { id: 'Orange' } },
                trip: { data: { id: 'trip-unknown' } },
              },
            },
          ],
          included: [
            { id: 'trip-not-a-trip', type: 'route' },
            { id: 'trip-no-headsign', type: 'trip', attributes: {} },
          ],
        }),
      };
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    await expect(adapter.getDepartures('fail')).rejects.toThrow(/Failed to fetch MBTA predictions/);

    const deps = await adapter.getDepartures('place-north');
    expect(deps).toHaveLength(2);
    expect(deps[0].status).toBe('Cancelled');
    expect(deps[0].countdownMinutes).toBe('Approaching');
    expect(deps[0].direction).toBe('Outbound');
    expect(deps[0].destination).toBe('Unknown');

    expect(deps[1].status).toBe('Scheduled');
    expect(deps[1].countdownMinutes).toBe('Unknown');
    expect(deps[1].destination).toBe('Orange');
    expect(deps[1].direction).toBe('Inbound');
  });

  it('should handle getAlerts without routeFilter, warning severity, and error', async () => {
    let capturedUrl = '';
    const mockFetch = (async (url: string) => {
      capturedUrl = url;
      if (url.includes('fail')) {
        return { ok: false, status: 500 };
      }
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'alert-warn',
              type: 'alert',
              attributes: {
                header: 'Warning header',
                severity: 5,
                service_effect: 'Delays',
                url: 'https://mbta.com/alert',
                informed_entity: [{}],
              },
            },
            {
              id: 'alert-info',
              type: 'alert',
              attributes: {
                header: 'Info header',
                severity: 2,
              },
            },
          ],
        }),
      };
    }) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts();
    expect(capturedUrl).not.toContain('filter[route]');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].effect).toBe('Delays');
    expect(alerts[0].description).toBe('Warning header');
    expect(alerts[0].affectedRoutes).toBeUndefined();
    expect(alerts[0].url).toBe('https://mbta.com/alert');

    expect(alerts[1].severity).toBe('info');

    const failAdapter = new BostonMbtaTransitAdapter((async () => ({ ok: false, status: 500 })) as any);
    await expect(failAdapter.getAlerts()).rejects.toThrow(/Failed to fetch MBTA alerts/);
  });

  it('should read API key from process.env and handle undefined json.data in all methods', async () => {
    const originalEnv = process.env.MBTA_API_KEY;
    process.env.MBTA_API_KEY = 'env-api-key';
    const mockFetch = (async () => ({
      ok: true,
      json: async () => ({}), // data is undefined
    })) as any;

    const adapter = new BostonMbtaTransitAdapter(mockFetch);
    const routes = await adapter.getRoutes();
    expect(routes).toEqual([]);

    const stops = await adapter.getStops('1');
    expect(stops).toEqual([]);

    const deps = await adapter.getDepartures('place-sstat');
    expect(deps).toEqual([]);

    const alerts = await adapter.getAlerts();
    expect(alerts).toEqual([]);

    process.env.MBTA_API_KEY = originalEnv;

    delete process.env.MBTA_API_KEY;
    const noKeyAdapter = new BostonMbtaTransitAdapter(mockFetch);
    expect((noKeyAdapter as any).apiKey).toBeUndefined();
    if (originalEnv !== undefined) {
      process.env.MBTA_API_KEY = originalEnv;
    }
  });
});




