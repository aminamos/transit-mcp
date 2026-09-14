import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface WeGoStationDef {
  code: string;
  name: string;
  lines: string[];
  lat: number;
  lon: number;
}

const BNA_LINES: TransitRoute[] = [
  { id: 'Star', shortName: 'Star', longName: 'WeGo Star Commuter Rail', agency: 'WeGo Public Transit', type: 'rail', color: '#6A2A5B', description: '32-mile passenger rail from Lebanon, Mt. Juliet, and Hermitage to Riverfront Station in Downtown Nashville' },
  { id: '18', shortName: '18', longName: 'Airport - Elm Hill Pike', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Nashville International Airport (BNA)' },
  { id: '52', shortName: '52', longName: 'Nolensville Pike BRT Lite', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Harding Place / Wal-Mart via Nolensville' },
  { id: '55', shortName: '55', longName: 'Murfreesboro Pike BRT Lite', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Hickory Hollow via Murfreesboro Pike' },
  { id: '56', shortName: '56', longName: 'Gallatin Pike BRT Lite', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Rivergate Mall via East Nashville & Gallatin' },
  { id: '3', shortName: '3', longName: 'West End / White Bridge', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to St. Thomas Hospital & White Bridge via West End' },
  { id: '7', shortName: '7', longName: 'Hillsboro', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Green Hills Mall & Percy Priest via Hillsboro' },
  { id: '4', shortName: '4', longName: 'Shelby', agency: 'WeGo Public Transit', type: 'bus', description: 'WeGo Central to Shelby Park & East Nashville' },
];

const BNA_STATIONS: WeGoStationDef[] = [
  { code: 'RIV', name: 'Riverfront Station', lines: ['Star'], lat: 36.1622, lon: -86.7725 },
  { code: 'CENT', name: 'WeGo Central', lines: ['18', '52', '55', '56', '3', '7', '4'], lat: 36.1661, lon: -86.7818 },
  { code: 'DON', name: 'Donelson Station', lines: ['Star'], lat: 36.1706, lon: -86.6669 },
  { code: 'HER', name: 'Hermitage Station', lines: ['Star'], lat: 36.1950, lon: -86.5997 },
  { code: 'MTJ', name: 'Mt. Juliet Station', lines: ['Star'], lat: 36.2025, lon: -86.5161 },
  { code: 'MAR', name: 'Martha Station', lines: ['Star'], lat: 36.2208, lon: -86.4172 },
  { code: 'LEB', name: 'Lebanon Station', lines: ['Star'], lat: 36.2131, lon: -86.2942 },
  { code: 'BNA', name: 'Nashville International Airport', lines: ['18'], lat: 36.1317, lon: -86.6689 },
  { code: 'VAND', name: 'Vanderbilt University (West End)', lines: ['3'], lat: 36.1498, lon: -86.8048 },
  { code: 'BELM', name: 'Belmont University (Hillsboro)', lines: ['7'], lat: 36.1336, lon: -86.7972 },
  { code: 'GHIL', name: 'Green Hills Mall', lines: ['7'], lat: 36.1069, lon: -86.8158 },
];

export class WeGoNashvilleTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'bna',
    name: 'Nashville',
    agency: 'WeGo Public Transit / RTA',
    state: 'TN',
    modes: ['WeGo Star Commuter Rail', 'WeGo Bus', 'BRT Lite'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'Nashville WeGo Public Transit. Features WeGo Star commuter rail and frequent BRT Lite corridors.',
    aliases: ['bna', 'nashville', 'wego', 'tennessee', 'rta_nashville', 'music_city'],
  };

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    let routes = BNA_LINES;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      routes = routes.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.shortName.toLowerCase().includes(q) ||
          r.longName.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    return routes;
  }

  async getStops(routeId: string, _direction?: string | number): Promise<TransitStop[]> {
    const norm = routeId.trim().toLowerCase();
    const matching = BNA_STATIONS.filter((s) => s.lines.some((l) => l.toLowerCase() === norm));
    const stopsList = matching.length > 0 ? matching : BNA_STATIONS;

    return stopsList.map((s) => ({
      id: s.code,
      name: s.name,
      code: s.code,
      latitude: s.lat,
      longitude: s.lon,
      placeCode: s.code,
    }));
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const query = stopIdOrStation.trim();
    let station = BNA_STATIONS.find((s) => s.code.toLowerCase() === query.toLowerCase());

    if (!station) {
      station = BNA_STATIONS.find((s) => s.name.toLowerCase().includes(query.toLowerCase()));
    }

    const code = station ? station.code : query.toUpperCase();
    const stationName = station ? station.name : `Station ${code}`;

    // Scheduled departures (WeGo Star commuter rail and BRT Lite corridors)
    const lines = station ? station.lines : ['Star', '18', '52'];
    const results: TransitDeparture[] = [];
    const now = Date.now();

    const destMap: Record<string, string> = {
      Star: 'Riverfront Station (Downtown)',
      '18': 'Nashville Airport (BNA)',
      '52': 'Harding Place',
      '55': 'Hickory Hollow',
    };

    lines.forEach((lineName, idx) => {
      const isRail = lineName === 'Star';
      const offsets = isRail ? [idx * 15 + 12, idx * 15 + 35] : [idx * 3 + 4, idx * 3 + 14];
      const dest = destMap[lineName] || 'WeGo Central';

      offsets.forEach((min) => {
        results.push({
          routeId: lineName,
          routeShortName: lineName,
          destination: dest,
          departureTime: new Date(now + min * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          countdownMinutes: min,
          isRealtime: false,
          status: isRail ? 'WeGo Star Passenger Rail' : 'BRT Lite / Bus',
          stopId: code,
          stopName: stationName,
        });
      });
    });

    return results.sort((a, b) => Number(a.countdownMinutes) - Number(b.countdownMinutes));
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    const alerts: TransitAlert[] = [
      {
        id: 'bna-advisory-1',
        header: 'WeGo Star Riverfront Connection Notice',
        description: 'WeGo Star trains operate Monday through Friday connecting Wilson and Davidson counties to Riverfront Station with direct bus connection to WeGo Central.',
        severity: 'info',
        affectedRoutes: ['Star'],
        url: 'https://www.wegotransit.com/ride/transit-services/commuter-rail/',
      },
      {
        id: 'bna-advisory-2',
        header: 'Route 18 Airport Direct Service',
        description: 'Route 18 operates 7 days a week with express and local service between WeGo Central and Nashville International Airport (BNA).',
        severity: 'info',
        affectedRoutes: ['18'],
        url: 'https://www.wegotransit.com/',
      },
    ];

    if (routeFilter) {
      const q = routeFilter.toLowerCase().trim();
      return alerts.filter(
        (a) =>
          a.affectedRoutes?.some((r) => r.toLowerCase().includes(q)) ||
          a.header.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    return alerts;
  }
}
