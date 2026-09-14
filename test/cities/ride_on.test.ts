import { describe, expect, it } from 'vitest';
import { MontgomeryRideOnTransitAdapter } from '../../src/cities/ride_on.js';

describe('MontgomeryRideOnTransitAdapter', () => {
  it('should list and filter Flash BRT, Ride On extRa, and local Montgomery County buses', async () => {
    const adapter = new MontgomeryRideOnTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThanOrEqual(50);

    // Flash BRT
    const flashOrange = allRoutes.find((r) => r.id === 'FLASH-ORANGE');
    expect(flashOrange).toBeDefined();
    expect(flashOrange?.type).toBe('bus');
    expect(flashOrange?.longName).toContain('Flash BRT');
    expect(flashOrange?.description).toContain('Colesville');

    // Ride On extRa
    const extra101 = allRoutes.find((r) => r.id === '101');
    expect(extra101).toBeDefined();
    expect(extra101?.longName).toContain('Ride On extRa');

    // Express bus
    const express100 = allRoutes.find((r) => r.id === '100');
    expect(express100).toBeDefined();
    expect(express100?.description).toContain('I-270');

    // Filter by id / shortName
    const byId = await adapter.getRoutes('FLASH-BLUE');
    expect(byId.some((r) => r.id === 'FLASH-BLUE')).toBe(true);

    // Filter by longName
    const byName = await adapter.getRoutes('Friendship Heights');
    expect(byName.length).toBeGreaterThan(0);

    // Filter by description
    const byDesc = await adapter.getRoutes('Burtonsville');
    expect(byDesc.length).toBeGreaterThan(0);

    // Filter with no match
    const empty = await adapter.getRoutes('nonexistent_moco_route');
    expect(empty).toHaveLength(0);
  });

  it('should list stops for a route or fallback to all stations', async () => {
    const adapter = new MontgomeryRideOnTransitAdapter();
    const flashStops = await adapter.getStops('FLASH-ORANGE');
    expect(flashStops.length).toBeGreaterThan(0);
    expect(flashStops.some((s) => s.code === 'SSTC')).toBe(true);

    // Case insensitivity
    const lowerStops = await adapter.getStops('flash-orange');
    expect(lowerStops.length).toBe(flashStops.length);

    // Unknown route falls back to all stations
    const fallback = await adapter.getStops('UNKNOWN_ROUTE');
    expect(fallback.length).toBeGreaterThanOrEqual(10);
  });

  it('should provide scheduled departures when unkeyed by station code or name', async () => {
    const adapter = new MontgomeryRideOnTransitAdapter();

    // By station code (SSTC with Flash BRT)
    const sstcDeps = await adapter.getDepartures('SSTC');
    expect(sstcDeps.length).toBeGreaterThan(0);
    expect(sstcDeps.some((d) => d.status?.includes('Flash BRT'))).toBe(true);

    // By station name (Medical Center with extRa 101)
    const medDeps = await adapter.getDepartures('Medical Center');
    expect(medDeps.length).toBeGreaterThan(0);
    expect(medDeps.some((d) => d.status?.includes('Ride On extRa'))).toBe(true);

    // Station with line exercising unmapped destination fallback (SHAD Shady Grove with Route 64)
    const shadDeps = await adapter.getDepartures('SHAD');
    expect(shadDeps.length).toBeGreaterThan(0);
    expect(shadDeps.some((d) => d.destination === 'Montgomery County Metro')).toBe(true);

    // Unknown station query (fallback to default lines FLASH-ORANGE, 101, 55)
    const unknownDeps = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDeps.length).toBeGreaterThan(0);
    expect(unknownDeps[0].stopName).toBe('Stop UNKNOWN_STATION');
    expect(unknownDeps[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should fetch and parse live Ride On predictions when keyed', async () => {
    const mockPayload1 = {
      predictions: [
        {
          route: 'FLASH-ORANGE',
          destination: 'Briggs Chaney',
          minutes: 5,
          direction: 'Northbound',
        },
        {
          routeId: '101',
          destination: 'Lakeforest',
          minutes: 0,
        },
        {
          // missing route and destination and invalid minutes
          minutes: 'invalid',
        },
      ],
    };

    const mockFetch = (async (url: string) => {
      expect(url).toContain('api.montgomerycountymd.gov');
      expect(url).toContain('key=test-moco-key');
      return {
        ok: true,
        json: async () => mockPayload1,
      };
    }) as any;

    const adapter = new MontgomeryRideOnTransitAdapter(mockFetch, 'test-moco-key');
    const departures = await adapter.getDepartures('SSTC');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('FLASH-ORANGE');
    expect(departures[0].countdownMinutes).toBe(5);
    expect(departures[0].isRealtime).toBe(true);
    expect(departures[0].status).toBe('Live (GPS)');

    // 0 minutes becomes 'Due'
    expect(departures[1].countdownMinutes).toBe('Due');

    // Missing fields fallback
    expect(departures[2].routeShortName).toBe('Ride On');
    expect(departures[2].destination).toBe('Scheduled Destination');
    expect(departures[2].countdownMinutes).toBe('Due');

    // Test alternative departures field in API response
    const mockPayload2 = {
      departures: [
        {
          route: '55',
          destination: 'Germantown',
          minutes: '8',
        },
      ],
    };
    const adapter2 = new MontgomeryRideOnTransitAdapter((async () => ({
      ok: true,
      json: async () => mockPayload2,
    })) as any, 'test-key');
    const departures2 = await adapter2.getDepartures('ROCK');
    expect(departures2).toHaveLength(1);
    expect(departures2[0].countdownMinutes).toBe(8);
  });

  it('should fallback to scheduled departures when Ride On API returns non-ok, empty, or throws', async () => {
    // Non-ok response
    const failingFetch = (async () => ({
      ok: false,
      status: 500,
    })) as any;

    const failingAdapter = new MontgomeryRideOnTransitAdapter(failingFetch, 'key');
    const fallback1 = await failingAdapter.getDepartures('SSTC');
    expect(fallback1.length).toBeGreaterThan(0);
    expect(fallback1[0].isRealtime).toBe(false);

    // Empty departures array
    const emptyFetch = (async () => ({
      ok: true,
      json: async () => ({ predictions: [] }),
    })) as any;

    const emptyAdapter = new MontgomeryRideOnTransitAdapter(emptyFetch, 'key');
    const fallback2 = await emptyAdapter.getDepartures('SSTC');
    expect(fallback2.length).toBeGreaterThan(0);

    // Throwing fetch
    const throwingFetch = (async () => {
      throw new Error('Network error');
    }) as any;

    const throwingAdapter = new MontgomeryRideOnTransitAdapter(throwingFetch, 'key');
    const fallback3 = await throwingAdapter.getDepartures('SSTC');
    expect(fallback3.length).toBeGreaterThan(0);
  });

  it('should read API key from environment variable if present', async () => {
    const origKey = process.env.RIDE_ON_API_KEY;

    try {
      process.env.RIDE_ON_API_KEY = 'moco-env-key';
      const adapter = new MontgomeryRideOnTransitAdapter();
      expect((adapter as any).apiKey).toBe('moco-env-key');
    } finally {
      process.env.RIDE_ON_API_KEY = origKey;
    }
  });

  it('should return service alerts and filter by route, header, or description', async () => {
    const adapter = new MontgomeryRideOnTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThanOrEqual(3);

    // Filter by route
    const flashAlerts = await adapter.getAlerts('FLASH-ORANGE');
    expect(flashAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by header
    const extraAlerts = await adapter.getAlerts('Limited-Stop');
    expect(extraAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter by description
    const bayAlerts = await adapter.getAlerts('Levels 1, 2, and 3');
    expect(bayAlerts.length).toBeGreaterThanOrEqual(1);

    // Filter with no match
    const none = await adapter.getAlerts('nonexistent_alert_query');
    expect(none).toHaveLength(0);
  });
});
