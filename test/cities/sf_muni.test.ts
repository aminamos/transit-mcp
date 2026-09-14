import { describe, expect, it } from 'vitest';
import { SfMuniTransitAdapter } from '../../src/cities/sf_muni.js';

describe('SfMuniTransitAdapter', () => {
  it('should list and filter Muni Metro, Streetcars, Cable Cars, and buses', async () => {
    const adapter = new SfMuniTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(50);

    // Light Rail
    const nJudah = allRoutes.find((r) => r.id === 'N');
    expect(nJudah).toBeDefined();
    expect(nJudah?.type).toBe('light_rail');
    expect(nJudah?.longName).toBe('N Judah');

    // Historic Streetcars
    const fMarket = allRoutes.find((r) => r.id === 'F');
    expect(fMarket).toBeDefined();
    expect(fMarket?.type).toBe('light_rail');

    // Cable Cars
    const phCable = allRoutes.find((r) => r.id === 'PH');
    expect(phCable).toBeDefined();
    expect(phCable?.type).toBe('cable_car');

    // Rapid Buses
    const bus38R = allRoutes.find((r) => r.id === '38R');
    expect(bus38R).toBeDefined();
    expect(bus38R?.type).toBe('bus');

    // Filter by shortName / id
    const byId = await adapter.getRoutes('38R');
    expect(byId.some((r) => r.id === '38R')).toBe(true);

    // Filter by longName
    const byName = await adapter.getRoutes('Geary Rapid');
    expect(byName.some((r) => r.id === '38R')).toBe(true);

    // Filter by description
    const byDesc = await adapter.getRoutes('Balboa Park');
    expect(byDesc.length).toBeGreaterThan(0);

    // Filter with no match
    const empty = await adapter.getRoutes('nonexistent_muni_line');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for a route or fallback to all stations', async () => {
    const adapter = new SfMuniTransitAdapter();
    const nStops = await adapter.getStops('N');
    expect(nStops.length).toBeGreaterThan(0);
    expect(nStops.some((s) => s.code === 'EMBR')).toBe(true);

    // Case insensitivity
    const nLowerStops = await adapter.getStops('n');
    expect(nLowerStops.length).toBe(nStops.length);

    // Unknown route falls back to all stations
    const fallback = await adapter.getStops('UNKNOWN_ROUTE');
    expect(fallback.length).toBeGreaterThanOrEqual(15);
  });

  it('should provide scheduled departures when unkeyed by station code or name', async () => {
    const adapter = new SfMuniTransitAdapter();

    // By station code (Powell with cable cars + Metro)
    const powellDeps = await adapter.getDepartures('POW');
    expect(powellDeps.length).toBeGreaterThan(0);
    expect(powellDeps.some((d) => d.status?.includes('Cable Car'))).toBe(true);
    expect(powellDeps.some((d) => d.status?.includes('Muni Metro'))).toBe(true);

    // By station name (Van Ness with bus 49 exercising unmapped dest)
    const vannDeps = await adapter.getDepartures('Van Ness');
    expect(vannDeps.length).toBeGreaterThan(0);
    expect(vannDeps.some((d) => d.destination === 'Downtown SF')).toBe(true);
    expect(vannDeps.some((d) => d.status?.includes('Scheduled (8-10 min)'))).toBe(true);

    // Unknown station query (fallback to default lines N, T, 38R)
    const unknownDeps = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDeps.length).toBeGreaterThan(0);
    expect(unknownDeps[0].stopName).toBe('Stop UNKNOWN_STATION');
    expect(unknownDeps[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should fetch and parse live 511.org departures when keyed', async () => {
    const mockPayload = {
      ServiceDelivery: {
        StopMonitoringDelivery: {
          MonitoredStopVisit: [
            {
              MonitoredVehicleJourney: {
                LineRef: 'N',
                DirectionRef: 'IB',
                DestinationName: 'Ocean Beach',
                MonitoredCall: {
                  ExpectedArrivalTime: new Date(Date.now() + 4 * 60000).toISOString(),
                },
              },
            },
            {
              MonitoredVehicleJourney: {
                LineRef: 'T',
                DirectionRef: 'OB',
                DestinationName: 'Sunnydale',
                MonitoredCall: {
                  AimExpectedArrivalTime: new Date(Date.now() - 1000).toISOString(), // 0 / Due wait
                },
              },
            },
            {
              MonitoredVehicleJourney: {
                // missing LineRef and DestinationName and MonitoredCall
              },
            },
          ],
        },
      },
    };

    const mockFetch = (async (url: string) => {
      expect(url).toContain('api.511.org');
      expect(url).toContain('api_key=test-511-key');
      return {
        ok: true,
        json: async () => mockPayload,
      };
    }) as any;

    const adapter = new SfMuniTransitAdapter(mockFetch, 'test-511-key');
    const departures = await adapter.getDepartures('EMBR');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('N');
    expect(departures[0].countdownMinutes).toBe(4);
    expect(departures[0].isRealtime).toBe(true);
    expect(departures[0].status).toBe('Live (511.org GPS)');

    // Due countdown
    expect(departures[1].countdownMinutes).toBe('Due');

    // Missing fields fallback
    expect(departures[2].routeShortName).toBe('Muni');
    expect(departures[2].destination).toBe('End of Line');
  });

  it('should fallback to scheduled departures when 511.org returns non-ok, empty, or throws', async () => {
    // Non-ok response
    const failingFetch = (async () => ({
      ok: false,
      status: 500,
    })) as any;

    const failingAdapter = new SfMuniTransitAdapter(failingFetch, 'key');
    const fallback1 = await failingAdapter.getDepartures('EMBR');
    expect(fallback1.length).toBeGreaterThan(0);
    expect(fallback1[0].isRealtime).toBe(false);

    // Empty MonitoredStopVisit array
    const emptyFetch = (async () => ({
      ok: true,
      json: async () => ({ ServiceDelivery: { StopMonitoringDelivery: { MonitoredStopVisit: [] } } }),
    })) as any;

    const emptyAdapter = new SfMuniTransitAdapter(emptyFetch, 'key');
    const fallback2 = await emptyAdapter.getDepartures('EMBR');
    expect(fallback2.length).toBeGreaterThan(0);

    // Throwing fetch
    const throwingFetch = (async () => {
      throw new Error('Network timeout');
    }) as any;

    const throwingAdapter = new SfMuniTransitAdapter(throwingFetch, 'key');
    const fallback3 = await throwingAdapter.getDepartures('EMBR');
    expect(fallback3.length).toBeGreaterThan(0);
  });

  it('should read API key from environment variables if present', async () => {
    const origMuniKey = process.env.MUNI_API_KEY;
    const orig511Key = process.env.BAY_AREA_511_API_KEY;

    try {
      process.env.MUNI_API_KEY = 'muni-env-key';
      const adapter1 = new SfMuniTransitAdapter();
      expect((adapter1 as any).apiKey).toBe('muni-env-key');

      delete process.env.MUNI_API_KEY;
      process.env.BAY_AREA_511_API_KEY = '511-env-key';
      const adapter2 = new SfMuniTransitAdapter();
      expect((adapter2 as any).apiKey).toBe('511-env-key');
    } finally {
      process.env.MUNI_API_KEY = origMuniKey;
      process.env.BAY_AREA_511_API_KEY = orig511Key;
    }
  });

  it('should return service alerts and filter by route, header, or description', async () => {
    const adapter = new SfMuniTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(3);

    // Filter by route
    const tAlerts = await adapter.getAlerts('T');
    expect(tAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by header
    const gearyAlerts = await adapter.getAlerts('Geary');
    expect(gearyAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by description
    const contactlessAlerts = await adapter.getAlerts('contactless');
    expect(contactlessAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter with no match
    const none = await adapter.getAlerts('nonexistent_alert_query');
    expect(none).toHaveLength(0);
  });
});
