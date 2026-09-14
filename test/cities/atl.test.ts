import { describe, expect, it } from 'vitest';
import { MartaTransitAdapter } from '../../src/cities/atl.js';

describe('MartaTransitAdapter', () => {
  it('should list and filter MARTA rail and bus routes', async () => {
    const adapter = new MartaTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThan(5);

    const red = allRoutes.find((r) => r.id === 'Red');
    expect(red).toBeDefined();
    expect(red?.agency).toBe('MARTA');
    expect(red?.type).toBe('subway');

    const filtered = await adapter.getRoutes('airport');
    expect(filtered.length).toBeGreaterThanOrEqual(1);

    const empty = await adapter.getRoutes('xyz_nonexistent');
    expect(empty).toHaveLength(0);
  });

  it('should return stops for a route or all stations fallback', async () => {
    const adapter = new MartaTransitAdapter();
    const redStops = await adapter.getStops('Red');
    expect(redStops.length).toBeGreaterThan(0);
    expect(redStops.some((s) => s.name === 'Five Points')).toBe(true);

    const fallback = await adapter.getStops('unknown');
    expect(fallback.length).toBeGreaterThan(10);
  });

  it('should parse real-time arrivals from MARTA live API', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/RealtimeTrain/RestServiceNextTrain/getRealtimeArrivals')) {
        return {
          ok: true,
          json: async () => [
            {
              STATION: 'AIRPORT STATION',
              LINE: 'RED',
              DESTINATION: 'North Springs',
              WAITING_SECONDS: '180',
              DIRECTION: 'N',
            },
            {
              STATION: 'AIRPORT STATION',
              LINE: 'GOLD',
              DESTINATION: 'Doraville',
              WAITING_SECONDS: '0',
              DIRECTION: 'N',
            },
            {
              STATION: 'AIR',
              LINE: 'BLUE',
              DESTINATION: 'Indian Creek',
              WAITING_SECONDS: '300',
              DIRECTION: 'E',
            },
          ],
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new MartaTransitAdapter(mockFetch, 'test-key');
    const departures = await adapter.getDepartures('AIR');
    expect(departures).toHaveLength(3);
    expect(departures[0].routeShortName).toBe('RED');
    expect(departures[0].countdownMinutes).toBe(3);
    expect(departures[0].isRealtime).toBe(true);
    expect(departures[1].countdownMinutes).toBe('Due');
    expect(departures[2].routeShortName).toBe('BLUE');
  });

  it('should fall back to scheduled headways when live API fails or station unmatched', async () => {
    const failingFetch = (async () => {
      throw new Error('MARTA API down');
    }) as any;

    const adapter = new MartaTransitAdapter(failingFetch);
    const departures = await adapter.getDepartures('Five Points');
    expect(departures.length).toBeGreaterThan(0);
    expect(departures[0].status).toContain('Scheduled');
    expect(departures[0].stopName).toBe('Five Points');

    const unknownDep = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDep.length).toBeGreaterThan(0);
    expect(unknownDep[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should handle sparse live arrival fields gracefully', async () => {
    const mockFetchSparse = (async () => ({
      ok: true,
      json: async () => [
        {
          STATION: 'AIRPORT STATION',
        },
        {
          STATION: '',
        },
      ],
    })) as any;
    const sparseAdapter = new MartaTransitAdapter(mockFetchSparse);
    const sparseDeps = await sparseAdapter.getDepartures('AIR');
    expect(sparseDeps).toHaveLength(1);
    expect(sparseDeps[0].routeShortName).toBe('Train');
    expect(sparseDeps[0].destination).toBe('End of Line');
  });

  it('should provide service alerts and filter by route', async () => {
    const adapter = new MartaTransitAdapter();
    const alerts = await adapter.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);

    const redAlerts = await adapter.getAlerts('Red');
    expect(redAlerts.length).toBeGreaterThan(0);

    const empty = await adapter.getAlerts('nonexistent_route');
    expect(empty).toHaveLength(0);
  });
});
