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

  it('should test getRoutes rail type, failure, and query branches', async () => {
    const mockFetch = (async () => ({
      ok: true,
      json: async () => [
        { route_id: '888', agency_id: 0, route_label: 'Northstar Commuter Rail' },
        { route_id: '10', agency_id: 0, route_label: 'Route 10 Bus' },
      ],
    })) as any;
    const adapter = new MspTransitAdapter(mockFetch);
    const routes = await adapter.getRoutes();
    expect(routes[0].type).toBe('rail');
    expect(routes[1].type).toBe('bus');

    const filtered = await adapter.getRoutes('10');
    expect(filtered).toHaveLength(1);

    const empty = await adapter.getRoutes('ghost');
    expect(empty).toHaveLength(0);

    const failAdapter = new MspTransitAdapter((async () => ({ ok: false, status: 500, statusText: 'Error' })) as any);
    await expect(failAdapter.getRoutes()).rejects.toThrow(/Failed to fetch MSP routes/);
  });

  it('should test getStops direction branches and error conditions', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/directions/fail')) return { ok: false, status: 500 };
      if (url.includes('/directions/empty')) return { ok: true, json: async () => [] };
      if (url.includes('/directions/901')) {
        return {
          ok: true,
          json: async () => [
            { direction_id: 0, direction_name: 'Northbound' },
            { direction_id: 1, direction_name: 'Southbound' },
            { direction_id: 2, direction_name: 'Eastbound' },
            { direction_id: 3, direction_name: 'Westbound' },
          ],
        };
      }
      if (url.includes('/stops/901/fail')) return { ok: false, status: 500 };
      return {
        ok: true,
        json: async () => [{ place_code: 'STOP1', description: 'Stop 1' }],
      };
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    // Error in directions
    await expect(adapter.getStops('fail')).rejects.toThrow(/Failed to fetch directions for MSP route/);

    // Empty directions
    const emptyStops = await adapter.getStops('empty');
    expect(emptyStops).toEqual([]);

    // Default direction when undefined
    const defStops = await adapter.getStops('901');
    expect(defStops[0].direction).toBe(0);

    // Direction matching 'nb' (North)
    const nbStops = await adapter.getStops('901', 'nb');
    expect(nbStops[0].direction).toBe(0);

    // Direction matching 'sb' (South)
    const sbStops = await adapter.getStops('901', 'sb');
    expect(sbStops[0].direction).toBe(1);

    // Direction matching 'eb' (East)
    const ebStops = await adapter.getStops('901', 'eb');
    expect(ebStops[0].direction).toBe(2);

    // Direction matching 'wb' (West)
    const wbStops = await adapter.getStops('901', 'wb');
    expect(wbStops[0].direction).toBe(3);

    // Direction matching direct id '1'
    const idStops = await adapter.getStops('901', 1);
    expect(idStops[0].direction).toBe(1);

    // Direction unmatched (fallback to 0)
    const unStops = await adapter.getStops('901', 'nonexistent');
    expect(unStops[0].direction).toBe(0);

    // Error in stops
    const failStopsAdapter = new MspTransitAdapter((async (url: string) => {
      if (url.includes('/directions/')) return { ok: true, json: async () => [{ direction_id: 0, direction_name: 'North' }] };
      return { ok: false, status: 500 };
    }) as any);
    await expect(failStopsAdapter.getStops('901')).rejects.toThrow(/Failed to fetch stops for MSP route/);
  });

  it('should test getDepartures formatted stop, due/now countdown, non-realtime, and errors', async () => {
    let capturedUrl = '';
    const mockFetch = (async (url: string) => {
      capturedUrl = url;
      if (url.includes('fail')) return { ok: false, status: 500 };
      return {
        ok: true,
        json: async () => ({
          departures: [
            {
              actual: false,
              trip_id: '1',
              stop_id: 100,
              departure_text: 'Due',
              departure_time: 0,
              description: 'Dest Due',
              route_id: '901',
              route_short_name: '',
              direction_id: 0,
              direction_text: 'NB',
              agency_id: 0,
              schedule_relationship: '',
            },
            {
              actual: false,
              trip_id: '2',
              stop_id: 100,
              departure_text: 'Delayed',
              departure_time: 1789346400,
              description: 'Dest Delayed',
              route_id: '902',
              route_short_name: 'Green',
              direction_id: 1,
              direction_text: 'EB',
              agency_id: 0,
              schedule_relationship: 'Cancelled',
            },
          ],
        }),
      };
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    // Slash formatted input with >= 3 parts
    const depsSlash = await adapter.getDepartures('901/0/MAAM');
    expect(capturedUrl).toContain('/901/0/MAAM');
    expect(depsSlash).toHaveLength(2);
    expect(depsSlash[0].countdownMinutes).toBe(0);
    expect(depsSlash[0].routeShortName).toBe('901');
    expect(depsSlash[0].status).toBe('Scheduled');
    expect(depsSlash[0].isRealtime).toBe(false);
    expect(depsSlash[0].stopName).toBeUndefined();

    expect(depsSlash[1].status).toBe('Cancelled');
    expect(depsSlash[1].countdownMinutes).toBe('Delayed');

    // Slash formatted input with < 3 parts
    await adapter.getDepartures('901/0');
    expect(capturedUrl).toContain('/901%2F0');

    // HTTP failure
    await expect(adapter.getDepartures('fail')).rejects.toThrow(/Failed to fetch departures for stop/);

    // Empty departures array fallback
    const emptyDepAdapter = new MspTransitAdapter((async () => ({ ok: true, json: async () => ({}) })) as any);
    const emptyDeps = await emptyDepAdapter.getDepartures('51405');
    expect(emptyDeps).toEqual([]);
  });


  it('should test getAlerts with routeFilter and deduplication / closed stop branches', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/directions/901')) {
        return { ok: true, json: async () => [{ direction_id: 0, direction_name: 'North' }] };
      }
      if (url.includes('/stops/901/0')) {
        return { ok: true, json: async () => [{ place_code: 'MAAM', description: 'MOA' }] };
      }
      if (url.includes('/901/0/MAAM')) {
        return {
          ok: true,
          json: async () => ({
            alerts: [
              { stop_closed: true, alert_text: 'Station Closed' },
              { stop_closed: false, alert_text: 'Minor Delay' },
            ],
          }),
        };
      }
      if (url.includes('/directions/crash')) {
        throw new Error('Network error');
      }
      if (url.includes('/directions/empty')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: false, status: 404 };
    }) as any;

    const adapter = new MspTransitAdapter(mockFetch);
    // routeFilter with closed stop
    const alerts = await adapter.getAlerts('901');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].header).toBe('Stop Closed');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[1].header).toBe('Service Advisory');
    expect(alerts[1].severity).toBe('info');

    // routeFilter network error (catches gracefully)
    const crashedAlerts = await adapter.getAlerts('crash');
    expect(crashedAlerts).toEqual([]);

    // routeFilter empty directions
    const emptyAlerts = await adapter.getAlerts('empty');
    expect(emptyAlerts).toEqual([]);

    // routeFilter where response has no alerts property
    const noAlertsAdapter = new MspTransitAdapter((async (url: string) => {
      if (url.includes('/directions/')) return { ok: true, json: async () => [{ direction_id: 0, direction_name: 'North' }] };
      if (url.includes('/stops/')) return { ok: true, json: async () => [{ place_code: 'PC' }] };
      return { ok: true, json: async () => ({}) };
    }) as any);
    expect(await noAlertsAdapter.getAlerts('901')).toEqual([]);
    expect(await noAlertsAdapter.getAlerts()).toEqual([]);

    // Trunk routes without filter: test deduplication and stop_closed: true

    const trunkFetch = (async (url: string) => {
      if (url.includes('/stops/901/0') || url.includes('/stops/902/0')) {
        return { ok: true, json: async () => [{ place_code: 'STOP', description: 'Stop' }] };
      }
      if (url.includes('/0/STOP')) {
        return {
          ok: true,
          json: async () => ({
            alerts: [
              { stop_closed: true, alert_text: 'Trunk Closed' },
              { stop_closed: true, alert_text: 'Trunk Closed' }, // Duplicate text tests !alertsMap.has
            ],
          }),
        };
      }
      throw new Error('Unexpected');
    }) as any;
    const trunkAdapter = new MspTransitAdapter(trunkFetch);
    const trunkAlerts = await trunkAdapter.getAlerts();
    expect(trunkAlerts).toHaveLength(1);
    expect(trunkAlerts[0].header).toBe('Stop Closed');
    expect(trunkAlerts[0].severity).toBe('warning');

    // Trunk routes network error handled gracefully
    const crashTrunkAdapter = new MspTransitAdapter((async () => {
      throw new Error('Crash');
    }) as any);
    const emptyTrunk = await crashTrunkAdapter.getAlerts();
    expect(emptyTrunk).toEqual([]);
  });
});

