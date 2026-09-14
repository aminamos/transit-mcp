import { describe, expect, it } from 'vitest';
import { MspTransitAdapter } from '../../src/cities/msp.js';

describe('MspTransitAdapter', () => {
  it('should fetch and filter routes', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/routes')) {
        return {
          ok: true,
          json: async () => [
            { route_id: '901', agency_id: 0, route_label: 'METRO Blue Line' },
            { route_id: '902', agency_id: 0, route_label: 'METRO Green Line' },
            { route_id: '3', agency_id: 0, route_label: 'Route 3 - U of M / Como Ave' },
          ],
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes).toHaveLength(3);
    expect(allRoutes[0].type).toBe('light_rail');

    const blueRoutes = await adapter.getRoutes('blue');
    expect(blueRoutes).toHaveLength(1);
    expect(blueRoutes[0].id).toBe('901');
  });

  it('should fetch stops for a route and direction', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/directions/901')) {
        return {
          ok: true,
          json: async () => [
            { direction_id: 0, direction_name: 'Northbound' },
            { direction_id: 1, direction_name: 'Southbound' },
          ],
        };
      }
      if (url.includes('/stops/901/0')) {
        return {
          ok: true,
          json: async () => [
            { place_code: 'MAAM', description: 'Mall of America Station' },
            { place_code: '30AV', description: '30th Ave Station' },
          ],
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    const stops = await adapter.getStops('901', 'Northbound');
    expect(stops).toHaveLength(2);
    expect(stops[0].id).toBe('MAAM');
    expect(stops[0].name).toBe('Mall of America Station');
  });

  it('should parse real-time departures and countdowns', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/51405')) {
        return {
          ok: true,
          json: async () => ({
            stops: [{ stop_id: 51405, description: 'Mall of America Station' }],
            departures: [
              {
                actual: true,
                trip_id: '1234',
                stop_id: 51405,
                departure_text: '4 Min',
                departure_time: 1789346400,
                description: 'Downtown Mpls',
                route_id: '901',
                route_short_name: 'Blue',
                direction_id: 0,
                direction_text: 'NB',
                agency_id: 0,
                schedule_relationship: 'Scheduled',
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    const deps = await adapter.getDepartures('51405');
    expect(deps).toHaveLength(1);
    expect(deps[0].routeShortName).toBe('Blue');
    expect(deps[0].countdownMinutes).toBe(4);
    expect(deps[0].isRealtime).toBe(true);
    expect(deps[0].stopName).toBe('Mall of America Station');
  });

  it('should fetch service alerts', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/stops/901/0')) {
        return {
          ok: true,
          json: async () => [{ place_code: 'MAAM', description: 'Mall of America' }],
        };
      }
      if (url.includes('/901/0/MAAM')) {
        return {
          ok: true,
          json: async () => ({
            alerts: [{ stop_closed: false, alert_text: 'Elevator maintenance at Franklin Ave' }],
          }),
        };
      }
      return { ok: true, json: async () => [] };
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].description).toContain('Elevator maintenance');
  });
});
