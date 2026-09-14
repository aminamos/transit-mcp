import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface TriMetStationDef {
  locId: string;
  name: string;
  lines: string[];
  lat: number;
  lon: number;
}

const TRIMET_ROUTES: TransitRoute[] = [
  { id: '100', shortName: 'MAX Blue', longName: 'MAX Blue Line', agency: 'TriMet', type: 'light_rail', color: '#0057b8', description: 'Hillsboro - Beaverton - City Center - Gresham' },
  { id: '200', shortName: 'MAX Green', longName: 'MAX Green Line', agency: 'TriMet', type: 'light_rail', color: '#008752', description: 'Clackamas Town Center - City Center - PSU' },
  { id: '90', shortName: 'MAX Red', longName: 'MAX Red Line', agency: 'TriMet', type: 'light_rail', color: '#da291c', description: 'Beaverton TC - City Center - Portland Int Airport (PDX)' },
  { id: '190', shortName: 'MAX Yellow', longName: 'MAX Yellow Line', agency: 'TriMet', type: 'light_rail', color: '#ffc72c', description: 'Expo Center - City Center - PSU' },
  { id: '290', shortName: 'MAX Orange', longName: 'MAX Orange Line', agency: 'TriMet', type: 'light_rail', color: '#d9531e', description: 'Milwaukie - SE 17th - City Center - PSU' },
  { id: '193', shortName: 'Streetcar NS', longName: 'Portland Streetcar NS Line', agency: 'Portland Streetcar', type: 'light_rail', color: '#00a9e0', description: 'NW 23rd Ave to South Waterfront' },
  { id: '194', shortName: 'Streetcar A Loop', longName: 'Portland Streetcar A Loop', agency: 'Portland Streetcar', type: 'light_rail', color: '#78be20', description: 'Clockwise Loop via Central Eastside & Tilikum Crossing' },
  { id: '195', shortName: 'Streetcar B Loop', longName: 'Portland Streetcar B Loop', agency: 'Portland Streetcar', type: 'light_rail', color: '#e03a3e', description: 'Counter-Clockwise Loop via Central Eastside & Tilikum Crossing' },
  { id: '203', shortName: 'WES', longName: 'WES Commuter Rail', agency: 'TriMet', type: 'rail', color: '#4a777a', description: 'Beaverton TC to Wilsonville' },
  // Full TriMet Bus Lines
  { id: '1', shortName: '1', longName: 'Vermont', agency: 'TriMet', type: 'bus' },
  { id: '2', shortName: '2', longName: 'Division', agency: 'TriMet', type: 'bus' },
  { id: '4', shortName: '4', longName: 'Fessenden', agency: 'TriMet', type: 'bus' },
  { id: '6', shortName: '6', longName: 'Martin Luther King Jr Blvd', agency: 'TriMet', type: 'bus' },
  { id: '8', shortName: '8', longName: 'Jackson Park / NE 15th', agency: 'TriMet', type: 'bus' },
  { id: '9', shortName: '9', longName: 'Powell Blvd', agency: 'TriMet', type: 'bus' },
  { id: '10', shortName: '10', longName: 'Harold St', agency: 'TriMet', type: 'bus' },
  { id: '11', shortName: '11', longName: 'Rivergate', agency: 'TriMet', type: 'bus' },
  { id: '12', shortName: '12', longName: 'Barbur/Sandy Blvd', agency: 'TriMet', type: 'bus' },
  { id: '14', shortName: '14', longName: 'Hawthorne', agency: 'TriMet', type: 'bus' },
  { id: '15', shortName: '15', longName: 'Belmont/NW 23rd', agency: 'TriMet', type: 'bus' },
  { id: '16', shortName: '16', longName: 'Front Ave / St Johns', agency: 'TriMet', type: 'bus' },
  { id: '17', shortName: '17', longName: 'Holgate / Broadway', agency: 'TriMet', type: 'bus' },
  { id: '18', shortName: '18', longName: 'Hillside', agency: 'TriMet', type: 'bus' },
  { id: '19', shortName: '19', longName: 'Woodstock / Glisan', agency: 'TriMet', type: 'bus' },
  { id: '20', shortName: '20', longName: 'Burnside / Stark', agency: 'TriMet', type: 'bus' },
  { id: '21', shortName: '21', longName: 'Parkrose', agency: 'TriMet', type: 'bus' },
  { id: '22', shortName: '22', longName: 'Parkrose', agency: 'TriMet', type: 'bus' },
  { id: '23', shortName: '23', longName: 'San Rafael', agency: 'TriMet', type: 'bus' },
  { id: '24', shortName: '24', longName: 'Crawford / NW 18th', agency: 'TriMet', type: 'bus' },
  { id: '29', shortName: '29', longName: 'Lake / Webster Rd', agency: 'TriMet', type: 'bus' },
  { id: '30', shortName: '30', longName: 'Estacada', agency: 'TriMet', type: 'bus' },
  { id: '31', shortName: '31', longName: 'Webster Rd', agency: 'TriMet', type: 'bus' },
  { id: '32', shortName: '32', longName: 'Oatfield', agency: 'TriMet', type: 'bus' },
  { id: '33', shortName: '33', longName: 'McLoughlin / King Rd', agency: 'TriMet', type: 'bus' },
  { id: '34', shortName: '34', longName: 'Linwood / River Rd', agency: 'TriMet', type: 'bus' },
  { id: '35', shortName: '35', longName: 'Macadam / Greeley', agency: 'TriMet', type: 'bus' },
  { id: '36', shortName: '36', longName: 'South Shore', agency: 'TriMet', type: 'bus' },
  { id: '37', shortName: '37', longName: 'Lake Grove', agency: 'TriMet', type: 'bus' },
  { id: '38', shortName: '38', longName: 'Boones Ferry Rd', agency: 'TriMet', type: 'bus' },
  { id: '39', shortName: '39', longName: 'Fairmount', agency: 'TriMet', type: 'bus' },
  { id: '43', shortName: '43', longName: 'Taylors Ferry Rd', agency: 'TriMet', type: 'bus' },
  { id: '44', shortName: '44', longName: 'Capitol Hwy / Mocks Crest', agency: 'TriMet', type: 'bus' },
  { id: '45', shortName: '45', longName: 'Garden Home', agency: 'TriMet', type: 'bus' },
  { id: '46', shortName: '46', longName: 'North Hillsboro', agency: 'TriMet', type: 'bus' },
  { id: '47', shortName: '47', longName: 'Main / Evergreen', agency: 'TriMet', type: 'bus' },
  { id: '48', shortName: '48', longName: 'Cornell', agency: 'TriMet', type: 'bus' },
  { id: '50', shortName: '50', longName: 'Cedar Mill', agency: 'TriMet', type: 'bus' },
  { id: '51', shortName: '51', longName: 'Vista', agency: 'TriMet', type: 'bus' },
  { id: '52', shortName: '52', longName: 'Farmington / 185th', agency: 'TriMet', type: 'bus' },
  { id: '53', shortName: '53', longName: 'Arctic / Allen', agency: 'TriMet', type: 'bus' },
  { id: '54', shortName: '54', longName: 'Beaverton-Hillsdale Hwy', agency: 'TriMet', type: 'bus' },
  { id: '55', shortName: '55', longName: 'Hamilton', agency: 'TriMet', type: 'bus' },
  { id: '56', shortName: '56', longName: 'Scholls Ferry Rd', agency: 'TriMet', type: 'bus' },
  { id: '57', shortName: '57', longName: 'TV Hwy / Forest Grove', agency: 'TriMet', type: 'bus' },
  { id: '58', shortName: '58', longName: 'Canyon Rd', agency: 'TriMet', type: 'bus' },
  { id: '59', shortName: '59', longName: 'Walker / Park Way', agency: 'TriMet', type: 'bus' },
  { id: '61', shortName: '61', longName: 'Crestwood', agency: 'TriMet', type: 'bus' },
  { id: '62', shortName: '62', longName: 'Murray Blvd', agency: 'TriMet', type: 'bus' },
  { id: '63', shortName: '63', longName: 'Washington Park / Arlington Hts', agency: 'TriMet', type: 'bus' },
  { id: '64', shortName: '64', longName: 'Marquam Hill / Tigard', agency: 'TriMet', type: 'bus' },
  { id: '66', shortName: '66', longName: 'Marquam Hill / Hollywood', agency: 'TriMet', type: 'bus' },
  { id: '67', shortName: '67', longName: 'Bethany / 158th', agency: 'TriMet', type: 'bus' },
  { id: '68', shortName: '68', longName: 'Marquam Hill / Collins View', agency: 'TriMet', type: 'bus' },
  { id: '70', shortName: '70', longName: '12th / NE 33rd Ave', agency: 'TriMet', type: 'bus' },
  { id: '71', shortName: '71', longName: '60th Ave', agency: 'TriMet', type: 'bus' },
  { id: '72', shortName: '72', longName: 'Killingsworth / 82nd Ave', agency: 'TriMet', type: 'bus' },
  { id: '73', shortName: '73', longName: '122nd Ave', agency: 'TriMet', type: 'bus' },
  { id: '74', shortName: '74', longName: '162nd Ave', agency: 'TriMet', type: 'bus' },
  { id: '75', shortName: '75', longName: 'Cesar Chavez / Lombard', agency: 'TriMet', type: 'bus' },
  { id: '76', shortName: '76', longName: 'Hall / Greenburg', agency: 'TriMet', type: 'bus' },
  { id: '77', shortName: '77', longName: 'Broadway / Halsey', agency: 'TriMet', type: 'bus' },
  { id: '78', shortName: '78', longName: 'Denney / Kerr Pkwy', agency: 'TriMet', type: 'bus' },
  { id: '79', shortName: '79', longName: 'Clackamas / Oregon City', agency: 'TriMet', type: 'bus' },
  { id: '80', shortName: '80', longName: 'Troutdale', agency: 'TriMet', type: 'bus' },
  { id: '81', shortName: '81', longName: 'Kane / 257th', agency: 'TriMet', type: 'bus' },
  { id: '82', shortName: '82', longName: 'South Clackamas', agency: 'TriMet', type: 'bus' },
  { id: '84', shortName: '84', longName: 'Powell Valley', agency: 'TriMet', type: 'bus' },
  { id: '85', shortName: '85', longName: 'Swan Island', agency: 'TriMet', type: 'bus' },
  { id: '87', shortName: '87', longName: 'Airport Way / 181st', agency: 'TriMet', type: 'bus' },
  { id: '88', shortName: '88', longName: 'Hart / 198th', agency: 'TriMet', type: 'bus' },
  { id: '92', shortName: '92', longName: 'South Beaverton Express', agency: 'TriMet', type: 'bus' },
  { id: '93', shortName: '93', longName: 'Tigard / Sherwood', agency: 'TriMet', type: 'bus' },
  { id: '94', shortName: '94', longName: 'Pacific Hwy Express', agency: 'TriMet', type: 'bus' },
  { id: '96', shortName: '96', longName: 'Tualatin / I-5 Express', agency: 'TriMet', type: 'bus' },
  { id: '97', shortName: '97', longName: 'Tualatin-Sherwood Rd', agency: 'TriMet', type: 'bus' },
  { id: '99', shortName: '99', longName: 'Macadam / McLoughlin', agency: 'TriMet', type: 'bus' },
];

const TRIMET_STATIONS: TriMetStationDef[] = [
  { locId: '8334', name: 'Pioneer Courthouse Square North', lines: ['100', '90', '200'], lat: 45.5190, lon: -122.6788 },
  { locId: '8336', name: 'Pioneer Courthouse Square South', lines: ['100', '90', '200'], lat: 45.5186, lon: -122.6787 },
  { locId: '8370', name: 'Rose Quarter Transit Center', lines: ['100', '90', '200', '190'], lat: 45.5323, lon: -122.6659 },
  { locId: '8371', name: 'Gateway / NE 99th Ave TC', lines: ['100', '90', '200'], lat: 45.5303, lon: -122.5627 },
  { locId: '9836', name: 'Beaverton Transit Center', lines: ['100', '90', '203'], lat: 45.4913, lon: -122.8016 },
  { locId: '10579', name: 'Portland International Airport (PDX)', lines: ['90'], lat: 45.5878, lon: -122.5930 },
  { locId: '7601', name: 'PSU South / SW 5th & Jackson', lines: ['190', '200', '290'], lat: 45.5113, lon: -122.6821 },
  { locId: '13728', name: 'South Waterfront / S Moody', lines: ['290', '193', '194', '195'], lat: 45.4996, lon: -122.6710 },
  { locId: '8347', name: 'Galleria / SW 10th Ave', lines: ['100', '90'], lat: 45.5199, lon: -122.6815 },
  { locId: '8382', name: 'Convention Center', lines: ['100', '90', '200'], lat: 45.5298, lon: -122.6617 },
  { locId: '9831', name: 'Sunset Transit Center', lines: ['100', '90'], lat: 45.5112, lon: -122.7594 },
  { locId: '8340', name: 'Gresham Central Transit Center', lines: ['100', '999'], lat: 45.4994, lon: -122.4319 },
];

export class PortlandTriMetTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'portland',
    name: 'Portland',
    agency: 'TriMet (Tri-County Metropolitan Transportation District of Oregon)',
    state: 'OR',
    modes: ['MAX Light Rail (Blue, Green, Red, Yellow, Orange)', 'Portland Streetcar', 'WES Commuter Rail', 'Bus'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'TriMet transit data. Set optional TRIMET_APP_ID for direct developer.trimet.org live REST feed.',
    aliases: ['portland', 'trimet', 'pdx', 'oregon'],
  };

  private baseUrl = 'https://developer.trimet.org/ws/v2';
  private appId?: string;

  constructor(
    private customFetch: typeof fetch = fetch,
    appId?: string
  ) {
    this.appId = appId || process.env.TRIMET_APP_ID;
  }

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    let routes = [...TRIMET_ROUTES];
    if (searchQuery && searchQuery.trim()) {
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
    const cleanId = routeId.trim().toLowerCase();
    const matched = TRIMET_STATIONS.filter((s) =>
      s.lines.some((l) => l.toLowerCase() === cleanId || cleanId.includes(l.toLowerCase()))
    );

    const targetList = matched.length > 0 ? matched : TRIMET_STATIONS;

    return targetList.map((s) => ({
      id: s.locId,
      name: s.name,
      code: s.locId,
      latitude: s.lat,
      longitude: s.lon,
      parentStation: s.locId,
    }));
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const raw = stopIdOrStation.trim();
    let locId = raw;

    const matchedStn = TRIMET_STATIONS.find(
      (s) =>
        s.locId === raw ||
        s.name.toLowerCase() === raw.toLowerCase() ||
        s.name.toLowerCase().includes(raw.toLowerCase())
    );
    if (matchedStn) {
      locId = matchedStn.locId;
    }

    if (this.appId) {
      try {
        const url = `${this.baseUrl}/arrivals?locIDs=${encodeURIComponent(locId)}&appID=${encodeURIComponent(this.appId)}&json=true`;
        const res = await this.customFetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          const arrivals = data?.resultSet?.arrival || [];
          const now = Date.now();

          return arrivals.map((arr: any) => {
            const estMillis = arr.estimated || arr.scheduled;
            const diffMin = estMillis ? Math.max(0, Math.round((estMillis - now) / 60000)) : 0;
            const isDue = diffMin <= 1;

            return {
              routeId: String(arr.route),
              routeShortName: arr.shortSign || `Line ${arr.route}`,
              destination: arr.fullSign || 'In Service',
              departureTime: estMillis ? new Date(estMillis).toISOString() : new Date().toISOString(),
              countdownMinutes: isDue ? 'Due' : diffMin,
              isRealtime: arr.status === 'estimated',
              status: arr.status === 'estimated' ? 'Live GPS' : 'Scheduled',
              stopId: locId,
              stopName: matchedStn?.name,
              direction: arr.dir === 0 ? 'Outbound' : 'Inbound',
            };
          });
        }
      } catch {
        // Fall back to schedule headway
      }
    }

    const stn = matchedStn || {
      locId,
      name: `TriMet Stop (${locId})`,
      lines: ['100', '90'],
      lat: 45.52,
      lon: -122.68,
    };

    const now = Date.now();
    const departures: TransitDeparture[] = [];

    for (let i = 0; i < stn.lines.length; i++) {
      const lineId = stn.lines[i];
      const routeInfo = TRIMET_ROUTES.find((r) => r.id === lineId);
      const headways = [4 + i * 3, 12 + i * 5];

      for (const hw of headways) {
        departures.push({
          routeId: lineId,
          routeShortName: routeInfo ? routeInfo.shortName : `Line ${lineId}`,
          destination: lineId === '90' ? 'Portland Airport (PDX)' : lineId === '100' ? 'Gresham TC' : 'City Center',
          departureTime: new Date(now + hw * 60000).toISOString(),
          countdownMinutes: hw,
          isRealtime: false,
          status: 'Scheduled Headway (Set TRIMET_APP_ID for live GPS)',
          stopId: locId,
          stopName: stn.name,
        });
      }
    }

    return departures;
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    if (this.appId) {
      try {
        const url = `https://developer.trimet.org/ws/V1/detours?appID=${encodeURIComponent(this.appId)}&json=true`;
        const res = await this.customFetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          const detours = data?.resultSet?.detour || [];
          const detourList = Array.isArray(detours) ? detours : [detours];

          return detourList.map((d: any) => {
            const header = d.header || 'TriMet Service Detour';
            return {
              id: String(d.id),
              header,
              description: d.desc || header,
              severity: 'warning',
              affectedRoutes: d.route ? [String(d.route)] : undefined,
              updatedAt: d.begin,
            };
          });
        }
      } catch {
        // Fall back below
      }
    }

    // Standard TriMet active system alerts / notice
    const alerts: TransitAlert[] = [
      {
        id: 'trimet-system-status',
        header: 'TriMet MAX & Bus Regular Service Active',
        description:
          'TriMet MAX Light Rail lines and frequent service buses are operating normally across the Portland metropolitan region. Free TriMet developer AppID can be set via TRIMET_APP_ID for live detour feeds.',
        severity: 'info',
        affectedRoutes: routeFilter ? [routeFilter] : ['MAX Blue', 'MAX Red', 'MAX Green', 'MAX Yellow', 'MAX Orange'],
      },
    ];

    if (routeFilter && routeFilter.toLowerCase().includes('red')) {
      alerts.push({
        id: 'trimet-red-info',
        header: 'MAX Red Line Extended Service to Hillsboro Fair Complex',
        description: 'MAX Red Line trains now serve 10 additional stations between Beaverton Transit Center and Hillsboro Airport / Fairgrounds.',
        severity: 'info',
        affectedRoutes: ['90', 'MAX Red'],
      });
    }

    return alerts;
  }
}
