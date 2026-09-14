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
});
