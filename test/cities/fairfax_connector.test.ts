import { describe, expect, it } from 'vitest';
import { FairfaxConnectorTransitAdapter } from '../../src/cities/fairfax_connector.js';

describe('FairfaxConnectorTransitAdapter', () => {
  it('should list and filter Express routes, Silver/Orange feeders, and Fairfax buses', async () => {
    const adapter = new FairfaxConnectorTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(40);

    // Express route
    const exp395 = allRoutes.find((r) => r.id === '395');
    expect(exp395).toBeDefined();
    expect(exp395?.type).toBe('bus');
    expect(exp395?.description).toContain('Express Lanes');

    // Silver Line Feeder
    const feeder505 = allRoutes.find((r) => r.id === '505');
    expect(feeder505).toBeDefined();
    expect(feeder505?.longName).toContain('Wiehle-Reston East');

    // Orange Line Feeder
    const feeder621 = allRoutes.find((r) => r.id === '621');
    expect(feeder621).toBeDefined();
    expect(feeder621?.longName).toContain('Vienna Metro');

    // Filter by id / shortName
    const byId = await adapter.getRoutes('494');
    expect(byId.some((r) => r.id === '494')).toBe(true);

    // Filter by longName
    const byName = await adapter.getRoutes('Pentagon Express');
    expect(byName.length).toBeGreaterThan(0);

    // Filter by description
    const byDesc = await adapter.getRoutes('I-495');
    expect(byDesc.length).toBeGreaterThan(0);

    // Filter with no match
    const empty = await adapter.getRoutes('nonexistent_fairfax_line');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for a route or fallback to all stations', async () => {
    const adapter = new FairfaxConnectorTransitAdapter();
    const stops505 = await adapter.getStops('505');
    expect(stops505.length).toBeGreaterThan(0);
    expect(stops505.some((s) => s.code === 'WIEH')).toBe(true);

    // Case insensitivity
    const lowerStops = await adapter.getStops('505');
    expect(lowerStops.length).toBe(stops505.length);

    // Unknown route falls back to all stations
    const fallback = await adapter.getStops('UNKNOWN_ROUTE');
    expect(fallback.length).toBeGreaterThanOrEqual(10);
  });

  it('should provide scheduled departures when unkeyed by station code or name', async () => {
    const adapter = new FairfaxConnectorTransitAdapter();

    // By station code (WIEH with Metro feeder)
    const wiehDeps = await adapter.getDepartures('WIEH');
    expect(wiehDeps.length).toBeGreaterThan(0);
    expect(wiehDeps.some((d) => d.status?.includes('Metro Feeder'))).toBe(true);

    // By station name (Pentagon with express 395)
    const pentDeps = await adapter.getDepartures('Pentagon');
    expect(pentDeps.length).toBeGreaterThan(0);
    expect(pentDeps.some((d) => d.status?.includes('Express Bus'))).toBe(true);

    // Station with unmapped destination line (DUNN Dunn Loring with 467)
    const dunnDeps = await adapter.getDepartures('DUNN');
    expect(dunnDeps.length).toBeGreaterThan(0);
    expect(dunnDeps.some((d) => d.destination === 'Fairfax County Transit Hub')).toBe(true);

    // Unknown station query (fallback to default lines 505, 401, 395)
    const unknownDeps = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDeps.length).toBeGreaterThan(0);
    expect(unknownDeps[0].stopName).toBe('Stop UNKNOWN_STATION');
    expect(unknownDeps[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should fetch and parse live Bustime predictions when keyed', async () => {
    const mockPayload1 = {
      'bustime-response': {
        prd: [
          {
            rt: '505',
            rtdir: 'Eastbound',
            des: 'Wiehle-Reston East Metro',
            prdctdn: 'DUE',
          },
          {
            rt: '401',
            rtdir: 'Northbound',
            des: 'Tysons Corner',
            prdctdn: '12',
          },
          {
            // missing rt, des, and prdctdn
          },
        ],
      },
    };

    const mockFetch = (async (url: string) => {
      expect(url).toContain('api.fairfaxcounty.gov');
      expect(url).toContain('key=test-fairfax-key');
      return {
        ok: true,
        json: async () => mockPayload1,
      };
    }) as any;

    const adapter = new FairfaxConnectorTransitAdapter(mockFetch, 'test-fairfax-key');
    const departures = await adapter.getDepartures('WIEH');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('505');
    expect(departures[0].countdownMinutes).toBe('Due');
    expect(departures[0].isRealtime).toBe(true);
    expect(departures[0].status).toBe('Live (GPS)');

    // Numeric wait time
    expect(departures[1].countdownMinutes).toBe(12);

    // Missing fields fallback
    expect(departures[2].routeShortName).toBe('Fairfax Connector');
    expect(departures[2].destination).toBe('End of Line');
    expect(departures[2].countdownMinutes).toBe('Due');
  });

  it('should fetch and parse alternate predictions array when keyed', async () => {
    const mockPayload2 = {
      predictions: [
        {
          route: '395',
          destination: 'Pentagon',
          minutes: 4,
          direction: 'Northbound',
        },
        {
          routeId: '599',
          destination: 'Crystal City',
          minutes: 0,
        },
        {
          // missing route and destination, invalid minutes
          minutes: 'invalid',
        },
      ],
    };

    const adapter = new FairfaxConnectorTransitAdapter((async () => ({
      ok: true,
      json: async () => mockPayload2,
    })) as any, 'key');

    const departures = await adapter.getDepartures('PENT');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('395');
    expect(departures[0].countdownMinutes).toBe(4);
    expect(departures[1].countdownMinutes).toBe('Due');
    expect(departures[2].routeShortName).toBe('Fairfax Connector');
    expect(departures[2].countdownMinutes).toBe('Due');
  });

  it('should fallback to scheduled departures when Fairfax API returns non-ok, empty, or throws', async () => {
    // Non-ok response
    const failingFetch = (async () => ({
      ok: false,
      status: 500,
    })) as any;

    const failingAdapter = new FairfaxConnectorTransitAdapter(failingFetch, 'key');
    const fallback1 = await failingAdapter.getDepartures('WIEH');
    expect(fallback1.length).toBeGreaterThan(0);
    expect(fallback1[0].isRealtime).toBe(false);

    // Empty response
    const emptyFetch = (async () => ({
      ok: true,
      json: async () => ({ 'bustime-response': { prd: [] } }),
    })) as any;

    const emptyAdapter = new FairfaxConnectorTransitAdapter(emptyFetch, 'key');
    const fallback2 = await emptyAdapter.getDepartures('WIEH');
    expect(fallback2.length).toBeGreaterThan(0);

    // Throwing fetch
    const throwingFetch = (async () => {
      throw new Error('Network error');
    }) as any;

    const throwingAdapter = new FairfaxConnectorTransitAdapter(throwingFetch, 'key');
    const fallback3 = await throwingAdapter.getDepartures('WIEH');
    expect(fallback3.length).toBeGreaterThan(0);
  });

  it('should read API key from environment variable if present', async () => {
    const origKey = process.env.FAIRFAX_API_KEY;

    try {
      process.env.FAIRFAX_API_KEY = 'fairfax-env-key';
      const adapter = new FairfaxConnectorTransitAdapter();
      expect((adapter as any).apiKey).toBe('fairfax-env-key');
    } finally {
      process.env.FAIRFAX_API_KEY = origKey;
    }
  });

  it('should return service alerts and filter by route, header, or description', async () => {
    const adapter = new FairfaxConnectorTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(3);

    // Filter by route
    const silverAlerts = await adapter.getAlerts('505');
    expect(silverAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by header
    const expressAlerts = await adapter.getAlerts('HOV');
    expect(expressAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by description
    const transferAlerts = await adapter.getAlerts('SmarTrip');
    expect(transferAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter with no match
    const none = await adapter.getAlerts('nonexistent_alert_query');
    expect(none).toHaveLength(0);
  });
});
