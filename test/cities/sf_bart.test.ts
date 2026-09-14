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

  it('should test station caching and getRoutes branches (routeID fallback, search, error)', async () => {
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
      if (url.includes('cmd=routes')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              routes: {
                route: [
                  { routeID: 'ROUTE 99', number: '', name: 'Special Loop', abbr: '', color: '' },
                ],
              },
            },
          }),
        };
      }
      throw new Error(`Unexpected: ${url}`);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    // 1. Station cache hit (calls getStops twice)
    const stnMockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) {
        return { ok: true, json: async () => ({ root: { stations: { station: [{ abbr: 'A', name: 'Alpha' }] } } }) };
      }
      if (url.includes('cmd=routeinfo')) {
        return { ok: true, json: async () => ({ root: { routes: { route: { config: { station: 'A' } } } } }) };
      }
      throw new Error(url);
    }) as any;
    const cacheAdapter = new SfBartTransitAdapter(stnMockFetch);
    await cacheAdapter.getStops('1');
    const stops2 = await cacheAdapter.getStops('1');
    expect(stops2).toHaveLength(1);

    // 2. getRoutes fallback name and search query
    const routes = await adapter.getRoutes();
    expect(routes[0].id).toBe('ROUTE 99');
    expect(routes[0].shortName).toBe('Route ');
    expect(routes[0].description).toBe('Line: Special Loop ()');

    const filtered = await adapter.getRoutes('special');
    expect(filtered).toHaveLength(1);
    const empty = await adapter.getRoutes('ghost');
    expect(empty).toHaveLength(0);

    // 3. Error in getRoutes
    const failAdapter = new SfBartTransitAdapter((async () => ({ ok: false, status: 500 })) as any);
    await expect(failAdapter.getRoutes()).rejects.toThrow(/Failed to fetch BART routes/);

    // 4. Error in getAllStations
    await expect(failAdapter.getStops('1')).rejects.toThrow(/Failed to fetch BART stations/);
  });

  it('should test getStops single station string, missing station coords, and error', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) {
        return {
          ok: true,
          json: async () => ({
            root: { stations: { station: [{ abbr: 'STN1', name: 'Station 1' }] } },
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
                  config: { station: 'STN1' }, // string, not array
                },
              },
            },
          }),
        };
      }
      throw new Error(url);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const stops = await adapter.getStops('ROUTE 12');
    expect(stops).toHaveLength(1);
    expect(stops[0].id).toBe('STN1');
    expect(stops[0].latitude).toBeUndefined();

    // Missing station config in routeinfo
    const missingStationAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return { ok: true, json: async () => ({ root: { routes: { route: { config: {} } } } }) };
    }) as any);
    expect(await missingStationAdapter.getStops('1')).toEqual([]);

    // Station abbr not in stnMap (falls back to abbr name)
    const unknownAbbrAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: {} }) }; // empty stns tests line 84
      return { ok: true, json: async () => ({ root: { routes: { route: { config: { station: 'XYZ' } } } } }) };
    }) as any);
    const unknownStops = await unknownAbbrAdapter.getStops('1');
    expect(unknownStops[0].name).toBe('XYZ');

    // Empty routeList tests line 102
    const emptyRoutesAdapter = new SfBartTransitAdapter((async () => ({ ok: true, json: async () => ({ root: {} }) })) as any);
    expect(await emptyRoutesAdapter.getRoutes()).toEqual([]);

    // Error in routeinfo

    const failInfoAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return { ok: false, status: 404 };
    }) as any);
    await expect(failInfoAdapter.getStops('1')).rejects.toThrow(/Failed to fetch BART stops/);
  });


  it('should test getDepartures station matching, cancelled, delayed, leaving, and sorting', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) {
        return {
          ok: true,
          json: async () => ({
            root: {
              stations: {
                station: [
                  { abbr: 'EMBR', name: 'Embarcadero' },
                  { abbr: 'POWL', name: 'Powell St.' },
                ],
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
              station: { // Single object stationData, not array
                name: 'Embarcadero',
                abbr: 'EMBR',
                etd: { // Single object etd, not array
                  destination: 'Millbrae',
                  abbreviation: 'MLBR',
                  estimate: [
                    {
                      minutes: 'Leaving',
                      platform: '1',
                      direction: 'South',
                      color: '',
                      hexcolor: '',
                      cancelflag: '1',
                    },
                    {
                      minutes: '12',
                      platform: '1',
                      direction: 'South',
                      color: 'RED',
                      hexcolor: '#ff0000',
                      delay: '180',
                    },
                    {
                      minutes: 'TBD',
                      platform: '1',
                      direction: 'South',
                      color: 'RED',
                      hexcolor: '#ff0000',
                    },
                  ],
                },
              },
            },
          }),
        };
      }
      throw new Error(url);
    }) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    // Match by full lowercase name
    const depsByName = await adapter.getDepartures('embarcadero');
    expect(depsByName).toHaveLength(3);
    expect(depsByName[0].countdownMinutes).toBe(0);
    expect(depsByName[0].status).toBe('Cancelled');
    expect(depsByName[0].routeShortName).toBe('BART');

    expect(depsByName[1].countdownMinutes).toBe(12);
    expect(depsByName[1].status).toBe('Delayed 3 min');
    expect(depsByName[1].delaySeconds).toBe(180);

    expect(depsByName[2].countdownMinutes).toBe('TBD');
    expect(depsByName[2].status).toBe('On time');


    // Match by prefix/fuzzy
    await adapter.getDepartures('pow');

    // Unmatched station
    await adapter.getDepartures('UNKNOWN');

    // Single estimate object (not array) and missing etd in stationData
    const singleEstAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return {
        ok: true,
        json: async () => ({
          root: {
            station: [
              {
                name: 'Test Stn',
                abbr: 'TST',
                etd: [
                  {
                    destination: 'Dest 1',
                    estimate: { minutes: '5', platform: '1', direction: 'North', color: 'RED' }, // single object
                  },
                  {
                    destination: 'Dest 2',
                    // estimate is undefined
                  },
                ],
              },
            ],
          },
        }),
      };
    }) as any);
    const singleEstDeps = await singleEstAdapter.getDepartures('TST');
    expect(singleEstDeps).toHaveLength(1);
    expect(singleEstDeps[0].countdownMinutes).toBe(5);

    // Missing etd in stationData
    const missingEtdAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return { ok: true, json: async () => ({ root: { station: { name: 'Test', abbr: 'TST' } } }) };
    }) as any);
    expect(await missingEtdAdapter.getDepartures('TST')).toEqual([]);

    // Empty stationData
    const emptyAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return { ok: true, json: async () => ({ root: {} }) };
    }) as any);
    expect(await emptyAdapter.getDepartures('EMBR')).toEqual([]);

    // Error in etd
    const failEtdAdapter = new SfBartTransitAdapter((async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return { ok: false, status: 500 };
    }) as any);
    await expect(failEtdAdapter.getDepartures('EMBR')).rejects.toThrow(/Failed to fetch BART departures/);
  });

  it('should test getAlerts description formats, skipping no delays, severity types, and route filtering', async () => {
    const mockJson = {
      root: {
        bsa: [
          {
            // Skip no delays
            type: 'INFO',
            description: 'No delays reported systemwide.',
          },
          {
            // Skip no delays in sms
            type: 'INFO',
            sms_text: 'No delays reported on BART',
          },
          {
            // Emergency / major
            type: 'EMERGENCY',
            station: '12th St.',
            description: { text: 'Major medical emergency at 12th St.' },
            posted: 'Today',
          },
          {
            // Normal info with sms_text cdata and route filter match
            type: '',
            station: 'Richmond',
            sms_text: { '#cdata-section': 'Maintenance work near Richmond station' },
          },
          {
            // Empty desc
            type: 'INFO',
            description: '',
            sms_text: '',
          },
        ],
      },
    };

    const mockFetch = (async () => ({
      ok: true,
      json: async () => mockJson,
    })) as any;

    const adapter = new SfBartTransitAdapter(mockFetch);
    const allAlerts = await adapter.getAlerts();
    expect(allAlerts).toHaveLength(2);
    expect(allAlerts[0].severity).toBe('severe');
    expect(allAlerts[0].header).toBe('BART EMERGENCY: 12th St.');
    expect(allAlerts[1].severity).toBe('info');
    expect(allAlerts[1].header).toBe('BART Advisory: Richmond');

    // Route filter matching cleanDesc directly
    const medicalAlerts = await adapter.getAlerts('medical');
    expect(medicalAlerts).toHaveLength(1);

    // Route filter matching station
    const richmondAlerts = await adapter.getAlerts('Richmond');
    expect(richmondAlerts).toHaveLength(1);


    // Route filter unmatched
    const unmatchedAlerts = await adapter.getAlerts('Daly City');
    expect(unmatchedAlerts).toHaveLength(0);

    // Single BSA object (not array)
    const singleBsaFetch = (async () => ({
      ok: true,
      json: async () => ({
        root: {
          bsa: {
            type: 'DELAY',
            description: 'Single delay',
          },
        },
      }),
    })) as any;
    const singleAdapter = new SfBartTransitAdapter(singleBsaFetch);
    const singleAlerts = await singleAdapter.getAlerts();
    expect(singleAlerts).toHaveLength(1);
    expect(singleAlerts[0].severity).toBe('warning');

    // HTTP Error
    const failAdapter = new SfBartTransitAdapter((async () => ({ ok: false, status: 500 })) as any);
    await expect(failAdapter.getAlerts()).rejects.toThrow(/Failed to fetch BART alerts/);

    // Empty BSA list
    const emptyBsaAdapter = new SfBartTransitAdapter((async () => ({
      ok: true,
      json: async () => ({ root: {} }),
    })) as any);
    expect(await emptyBsaAdapter.getAlerts()).toEqual([]);

    // Alert with smsObj text and missing station
    const smsTextAdapter = new SfBartTransitAdapter((async () => ({
      ok: true,
      json: async () => ({
        root: {
          bsa: {
            description: '',
            sms_text: { text: 'Stationless notice text' },
          },
        },
      }),
    })) as any);
    const smsAlerts = await smsTextAdapter.getAlerts('unmatched');
    expect(smsAlerts).toHaveLength(0);

    const smsAlertsMatched = await smsTextAdapter.getAlerts('stationless');
    expect(smsAlertsMatched).toHaveLength(1);
    expect(smsAlertsMatched[0].header).toContain('Systemwide');
  });

  it('should fallback station name to origAbbr when stnEntry.name is missing', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return {
        ok: true,
        json: async () => ({
          root: {
            station: {
              abbr: 'TST',
              etd: {
                destination: 'Nowhere',
                estimate: [{ minutes: '5', color: 'RED' }],
              },
            },
          },
        }),
      };
    }) as any;
    const adapter = new SfBartTransitAdapter(mockFetch);
    const deps = await adapter.getDepartures('TST');
    expect(deps[0].stopName).toBe('TST');
  });

  it('should test sorting when minB is not a number and minA is not a number', async () => {
    const mockFetch = (async (url: string) => {
      if (url.includes('cmd=stns')) return { ok: true, json: async () => ({ root: { stations: { station: [] } } }) };
      return {
        ok: true,
        json: async () => ({
          root: {
            station: {
              abbr: 'TST',
              name: 'Test',
              etd: {
                destination: 'Nowhere',
                estimate: [
                  { minutes: 'TBD1', color: 'RED' },
                  { minutes: 'TBD2', color: 'RED' },
                ],
              },
            },
          },
        }),
      };
    }) as any;
    const adapter = new SfBartTransitAdapter(mockFetch);
    const deps = await adapter.getDepartures('TST');
    expect(deps).toHaveLength(2);
  });

  it('should initialize BART_API_KEY from environment or custom parameter', async () => {

    const original = process.env.BART_API_KEY;
    process.env.BART_API_KEY = 'env-bart-key';
    const envAdapter = new SfBartTransitAdapter();
    expect((envAdapter as any).apiKey).toBe('env-bart-key');
    process.env.BART_API_KEY = original;

    delete process.env.BART_API_KEY;
    const defaultAdapter = new SfBartTransitAdapter();
    expect((defaultAdapter as any).apiKey).toBe('MW9S-E7SL-26DU-VV8V');
    if (original !== undefined) {
      process.env.BART_API_KEY = original;
    }
  });
});

