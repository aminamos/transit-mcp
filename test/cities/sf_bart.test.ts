import { describe, expect, it } from 'vitest';
import { SfBartTransitAdapter } from '../../src/cities/sf_bart.js';

describe('SfBartTransitAdapter', () => {
  it('should fetch BART routes and filter by query', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=routes')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              routes: {
                route: [
                  { routeID: 'ROUTE 1', number: '1', name: 'Antioch to SFIA', abbr: 'ANTC-SFIA', color: 'YELLOW', hexcolor: '#ffff33' },
                  { routeID: 'ROUTE 12', number: '12', name: 'Daly City to Dublin', abbr: 'DALY-DUBL', color: 'BLUE', hexcolor: '#0099CC' },
                ],
              },
            },
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const routes = await adapter.getRoutes();
    expect(routes).toHaveLength(2);
    expect(routes[0].type).toBe('subway');

    const yellow = await adapter.getRoutes('antioch');
    expect(yellow).toHaveLength(1);
    expect(yellow[0].shortName).toBe('ANTC-SFIA');
  });

  it('should fetch route stops with station coordinates', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              stations: {
                station: [
                  { abbr: 'EMBR', name: 'Embarcadero', gtfs_latitude: '37.7928', gtfs_longitude: '-122.397' },
                  { abbr: 'MONT', name: 'Montgomery St.', gtfs_latitude: '37.7892', gtfs_longitude: '-122.401' },
                ],
              },
            },
          }),
        };
      }
      if (url.includes('cmd=routeinfo')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              routes: {
                route: {
                  config: { station: ['EMBR', 'MONT'] },
                },
              },
            },
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const stops = await adapter.getStops('1');
    expect(stops).toHaveLength(2);
    expect(stops[0].name).toBe('Embarcadero');
    expect(stops[0].latitude).toBe(37.7928);
  });

  it('should fetch real-time ETD departures', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              stations: {
                station: [{ abbr: 'EMBR', name: 'Embarcadero' }],
              },
            },
          }),
        };
      }
      if (url.includes('cmd=etd')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              station: [
                {
                  name: 'Embarcadero',
                  abbr: 'EMBR',
                  etd: [
                    {
                      destination: 'Antioch',
                      abbreviation: 'ANTC',
                      estimate: [
                        { minutes: '4', platform: '2', direction: 'North', color: 'YELLOW', hexcolor: '#ffff33', delay: '60' },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const deps = await adapter.getDepartures('EMBR');
    expect(deps).toHaveLength(1);
    expect(deps[0].destination).toBe('Antioch');
    expect(deps[0].countdownMinutes).toBe(4);
    expect(deps[0].isRealtime).toBe(true);
  });

  it('should parse BART BSA alerts', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=bsa')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              bsa: [
                {
                  '@id': '101',
                  type: 'DELAY',
                  station: 'BART',
                  description: { '#cdata-section': '10-minute track maintenance delay between Daly City and 24th St.' },
                  posted: 'Sun Sep 13 2026',
                },
              ],
            },
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].description).toContain('10-minute track maintenance');
  });
});
