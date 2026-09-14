import { describe, expect, it } from 'vitest';
import { AcTransitAdapter } from '../../src/cities/ac_transit.js';

describe('AcTransitAdapter', () => {
  it('should list and filter Tempo BRT, Transbay express, and East Bay local buses', async () => {
    const adapter = new AcTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(60);

    // Tempo BRT
    const tempo = allRoutes.find((r) => r.id === '1T');
    expect(tempo).toBeDefined();
    expect(tempo?.type).toBe('bus');
    expect(tempo?.longName).toContain('Tempo');
    expect(tempo?.description).toContain('International');

    // Transbay Express
    const fTransbay = allRoutes.find((r) => r.id === 'F');
    expect(fTransbay).toBeDefined();
    expect(fTransbay?.longName).toContain('Berkeley');
    expect(fTransbay?.description).toContain('Salesforce');

    // All-Nighter
    const owl800 = allRoutes.find((r) => r.id === '800');
    expect(owl800).toBeDefined();
    expect(owl800?.longName).toContain('Night Owl');

    // Filter by id / shortName
    const byId = await adapter.getRoutes('1T');
    expect(byId.some((r) => r.id === '1T')).toBe(true);

    // Filter by longName
    const byName = await adapter.getRoutes('San Pablo');
    expect(byName.length).toBeGreaterThan(0);

    // Filter by description
    const byDesc = await adapter.getRoutes('Telegraph');
    expect(byDesc.length).toBeGreaterThan(0);

    // Filter with no match
    const empty = await adapter.getRoutes('nonexistent_actransit_line');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for a route or fallback to all stations', async () => {
    const adapter = new AcTransitAdapter();
    const brtStops = await adapter.getStops('1T');
    expect(brtStops.length).toBeGreaterThan(0);
    expect(brtStops.some((s) => s.code === 'UPT')).toBe(true);

    // Case insensitivity
    const lowerStops = await adapter.getStops('1t');
    expect(lowerStops.length).toBe(brtStops.length);

    // Unknown route falls back to all stations
    const fallback = await adapter.getStops('UNKNOWN_ROUTE');
    expect(fallback.length).toBeGreaterThanOrEqual(10);
  });

  it('should provide scheduled departures when unkeyed by station code or name', async () => {
    const adapter = new AcTransitAdapter();

    // By station code (UPT with Tempo BRT)
    const uptDeps = await adapter.getDepartures('UPT');
    expect(uptDeps.length).toBeGreaterThan(0);
    expect(uptDeps.some((d) => d.status?.includes('Tempo BRT'))).toBe(true);

    // By station name (Salesforce Transit Center with Transbay express)
    const stcDeps = await adapter.getDepartures('Salesforce');
    expect(stcDeps.length).toBeGreaterThan(0);
    expect(stcDeps.some((d) => d.status?.includes('Transbay Express'))).toBe(true);

    // By station with unmapped destination lines (HAY Hayward BART)
    const hayDeps = await adapter.getDepartures('HAY');
    expect(hayDeps.length).toBeGreaterThan(0);
    expect(hayDeps.some((d) => d.destination === 'East Bay Transit Center')).toBe(true);

    // Unknown station query (fallback to default lines 1T, 51A, 72R)
    const unknownDeps = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDeps.length).toBeGreaterThan(0);
    expect(unknownDeps[0].stopName).toBe('Stop UNKNOWN_STATION');
    expect(unknownDeps[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should fetch and parse live AC Transit predictions when keyed', async () => {
    const mockPayload = {
      'bustime-response': {
        prd: [
          {
            rt: '1T',
            rtdir: 'Southbound',
            des: 'San Leandro BART',
            prdctdn: 'DUE',
          },
          {
            rt: 'NL',
            rtdir: 'Westbound',
            des: 'Salesforce Transit Center',
            prdctdn: '7',
          },
          {
            // missing rt, des, and prdctdn
          },
        ],
      },
    };

    const mockFetch = (async (url: string) => {
      expect(url).toContain('api.actransit.org');
      expect(url).toContain('token=test-act-token');
      return {
        ok: true,
        json: async () => mockPayload,
      };
    }) as any;

    const adapter = new AcTransitAdapter(mockFetch, 'test-act-token');
    const departures = await adapter.getDepartures('UPT');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('1T');
    expect(departures[0].countdownMinutes).toBe('Due');
    expect(departures[0].isRealtime).toBe(true);
    expect(departures[0].status).toBe('Live (GPS)');

    // Numeric countdown
    expect(departures[1].countdownMinutes).toBe(7);

    // Missing fields fallback
    expect(departures[2].routeShortName).toBe('Bus');
    expect(departures[2].destination).toBe('End of Line');
    expect(departures[2].countdownMinutes).toBe('Due');
  });

  it('should fallback to scheduled departures when AC Transit API returns non-ok, empty, or throws', async () => {
    // Non-ok response
    const failingFetch = (async () => ({
      ok: false,
      status: 500,
    })) as any;

    const failingAdapter = new AcTransitAdapter(failingFetch, 'token');
    const fallback1 = await failingAdapter.getDepartures('UPT');
    expect(fallback1.length).toBeGreaterThan(0);
    expect(fallback1[0].isRealtime).toBe(false);

    // Empty prd array
    const emptyFetch = (async () => ({
      ok: true,
      json: async () => ({ 'bustime-response': { prd: [] } }),
    })) as any;

    const emptyAdapter = new AcTransitAdapter(emptyFetch, 'token');
    const fallback2 = await emptyAdapter.getDepartures('UPT');
    expect(fallback2.length).toBeGreaterThan(0);

    // Throwing fetch
    const throwingFetch = (async () => {
      throw new Error('Network timeout');
    }) as any;

    const throwingAdapter = new AcTransitAdapter(throwingFetch, 'token');
    const fallback3 = await throwingAdapter.getDepartures('UPT');
    expect(fallback3.length).toBeGreaterThan(0);
  });

  it('should read API key from environment variable if present', async () => {
    const origKey = process.env.ACTRANSIT_API_KEY;

    try {
      process.env.ACTRANSIT_API_KEY = 'act-env-key';
      const adapter = new AcTransitAdapter();
      expect((adapter as any).apiKey).toBe('act-env-key');
    } finally {
      process.env.ACTRANSIT_API_KEY = origKey;
    }
  });

  it('should return service alerts and filter by route, header, or description', async () => {
    const adapter = new AcTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(2);

    // Filter by route
    const tempoAlerts = await adapter.getAlerts('1T');
    expect(tempoAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by header
    const bayBridgeAlerts = await adapter.getAlerts('Dedicated Lane');
    expect(bayBridgeAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by description
    const hovAlerts = await adapter.getAlerts('HOV lanes');
    expect(hovAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter with no match
    const none = await adapter.getAlerts('nonexistent_alert_query');
    expect(none).toHaveLength(0);
  });
});
