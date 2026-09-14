import { describe, expect, it } from 'vitest';
import { WmataTransitAdapter } from '../../src/cities/dc.js';

describe('WmataTransitAdapter', () => {
  it('should list and filter WMATA lines and bus routes', async () => {
    const adapter = new WmataTransitAdapter();
    const allRoutes = await adapter.getRoutes();
    expect(allRoutes.length).toBeGreaterThan(5);

    const redLine = allRoutes.find((r) => r.id === 'RD');
    expect(redLine).toBeDefined();
    expect(redLine?.shortName).toBe('Red');
    expect(redLine?.type).toBe('subway');

    const filtered = await adapter.getRoutes('silver');
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.some((r) => r.id === 'SV')).toBe(true);

    const empty = await adapter.getRoutes('nonexistent_line_xyz');
    expect(empty).toHaveLength(0);
  });

  it('should return stations for a route or all stations as fallback', async () => {
    const adapter = new WmataTransitAdapter();
    const redStops = await adapter.getStops('RD');
    expect(redStops.length).toBeGreaterThan(0);
    expect(redStops.some((s) => s.name === 'Metro Center')).toBe(true);

    const fallbackStops = await adapter.getStops('NONEXISTENT');
    expect(fallbackStops.length).toBeGreaterThan(10);
  });

  it('should get live departures when API key is provided and API responds', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/StationPrediction.svc/json/GetPrediction/A01')) {
        return {
          ok: true,
          json: async () => ({
            Trains: [
              {
                Line: 'RD',
                DestinationName: 'Shady Grove',
                Min: '3',
                Car: '8',
                Group: '1',
              },
              {
                Line: 'RD',
                DestinationName: 'Glenmont',
                Min: 'ARR',
                Car: '6',
                Group: '2',
              },
              {
                Line: 'BL',
                DestinationName: '',
                Min: 'BRD',
              },
              {
                Line: 'OR',
                Min: 'DLY',
              },
              {
                Line: 'SV',
                Min: '',
              },
              {
                Line: '',
                Min: '1',
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new WmataTransitAdapter(mockFetch, 'test-key');
    const departures = await adapter.getDepartures('A01');
    expect(departures).toHaveLength(6);
    expect(departures[0].routeShortName).toBe('RD');
    expect(departures[0].destination).toBe('Shady Grove');
    expect(departures[0].countdownMinutes).toBe(3);
    expect(departures[0].status).toBe('Live (8-car)');
    expect(departures[1].countdownMinutes).toBe(0);
    expect(departures[2].destination).toBe('Train');
    expect(departures[2].status).toBe('Live');
    expect(departures[2].countdownMinutes).toBe(0);
    expect(departures[3].countdownMinutes).toBe('DLY');
    expect(departures[4].countdownMinutes).toBe(0);
    expect(departures[5].routeShortName).toBe('Metro');
  });

  it('should fall back to scheduled headways when unkeyed or on error', async () => {
    const adapter = new WmataTransitAdapter();
    const departures = await adapter.getDepartures('Metro Center');
    expect(departures.length).toBeGreaterThan(0);
    expect(departures[0].status).toContain('Scheduled');
    expect(departures[0].stopName).toBe('Metro Center');

    // Test error fallback when fetch rejects with key
    const failingFetch = (async () => {
      throw new Error('Network timeout');
    }) as any;
    const adapterWithFailingFetch = new WmataTransitAdapter(failingFetch, 'fake-key');
    const fallbackDeps = await adapterWithFailingFetch.getDepartures('C10');
    expect(fallbackDeps.length).toBeGreaterThan(0);

    const unknownDeps = await adapter.getDepartures('UNKNOWN_STATION');
    expect(unknownDeps.length).toBeGreaterThan(0);
    expect(unknownDeps[0].stopId).toBe('UNKNOWN_STATION');
  });

  it('should get live incidents when keyed or return default advisories', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('/Incidents.svc/json/Incidents')) {
        return {
          ok: true,
          json: async () => ({
            Incidents: [
              {
                IncidentID: 'inc-1',
                IncidentType: 'Delay',
                LinesAffected: 'RD, BL',
                Description: 'Track maintenance at Metro Center',
                DateUpdated: '2026-09-13T20:00:00',
              },
              {
                IncidentID: '',
                IncidentType: '',
                LinesAffected: '',
                Description: '',
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new WmataTransitAdapter(mockFetch, 'test-key');
    const alerts = await adapter.getAlerts();
    expect(alerts).toHaveLength(2);
    expect(alerts[0].header).toContain('RD, BL');

    const filtered = await adapter.getAlerts('RD');
    expect(filtered).toHaveLength(1);

    const nonMatching = await adapter.getAlerts('GR');
    expect(nonMatching).toHaveLength(0);

    // Unkeyed default advisory
    const unkeyedAdapter = new WmataTransitAdapter();
    const allDefaultAlerts = await unkeyedAdapter.getAlerts();
    expect(allDefaultAlerts.length).toBeGreaterThan(0);

    const defaultAlerts = await unkeyedAdapter.getAlerts('BL');
    expect(defaultAlerts.length).toBeGreaterThan(0);

    const defaultFilteredEmpty = await unkeyedAdapter.getAlerts('nonexistent_alert');
    expect(defaultFilteredEmpty).toHaveLength(0);

    // Keyed fetch failure fallback
    const failingFetch = (async () => {
      throw new Error('WMATA Incidents API error');
    }) as any;
    const failingAdapter = new WmataTransitAdapter(failingFetch, 'broken-key');
    const fallbackAlerts = await failingAdapter.getAlerts();
    expect(fallbackAlerts.length).toBeGreaterThan(0);
  });
});
