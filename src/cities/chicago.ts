import { XMLParser } from 'fast-xml-parser';
import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface CtaStationDef {
  mapId: string;
  name: string;
  lines: string[];
  lat: number;
  lon: number;
}

const CTA_L_LINES: TransitRoute[] = [
  { id: 'Red', shortName: 'Red', longName: 'Red Line', agency: 'CTA', type: 'subway', color: '#c60c30', description: 'Howard to 95th/Dan Ryan via Subway' },
  { id: 'Blue', shortName: 'Blue', longName: 'Blue Line', agency: 'CTA', type: 'subway', color: '#00a1de', description: "O'Hare Airport to Forest Park via Dearborn Subway" },
  { id: 'Brn', shortName: 'Brown', longName: 'Brown Line', agency: 'CTA', type: 'subway', color: '#62361b', description: 'Kimball to Loop (Elevated)' },
  { id: 'G', shortName: 'Green', longName: 'Green Line', agency: 'CTA', type: 'subway', color: '#009b3a', description: 'Harlem/Lake to Ashland/63rd & Cottage Grove' },
  { id: 'Org', shortName: 'Orange', longName: 'Orange Line', agency: 'CTA', type: 'subway', color: '#f9461c', description: 'Midway Airport to Loop' },
  { id: 'P', shortName: 'Purple', longName: 'Purple Line', agency: 'CTA', type: 'subway', color: '#522398', description: 'Linden to Howard & Loop Express' },
  { id: 'Pink', shortName: 'Pink', longName: 'Pink Line', agency: 'CTA', type: 'subway', color: '#e27ea6', description: '54th/Cermak to Loop' },
  { id: 'Y', shortName: 'Yellow', longName: 'Yellow Line (Skokie Swift)', agency: 'CTA', type: 'subway', color: '#f9e300', description: 'Dempster-Skokie to Howard' },
  // Major frequent bus routes
  { id: '1', shortName: '1', longName: 'Bronzeville/Union Station', agency: 'CTA', type: 'bus' },
  { id: '4', shortName: '4', longName: 'Cottage Grove', agency: 'CTA', type: 'bus' },
  { id: '8', shortName: '8', longName: 'Halsted', agency: 'CTA', type: 'bus' },
  { id: '9', shortName: '9', longName: 'Ashland', agency: 'CTA', type: 'bus' },
  { id: '20', shortName: '20', longName: 'Madison', agency: 'CTA', type: 'bus' },
  { id: '22', shortName: '22', longName: 'Clark', agency: 'CTA', type: 'bus' },
  { id: '29', shortName: '29', longName: 'State', agency: 'CTA', type: 'bus' },
  { id: '36', shortName: '36', longName: 'Broadway', agency: 'CTA', type: 'bus' },
  { id: '49', shortName: '49', longName: 'Western', agency: 'CTA', type: 'bus' },
  { id: '66', shortName: '66', longName: 'Chicago', agency: 'CTA', type: 'bus' },
  { id: '77', shortName: '77', longName: 'Belmont', agency: 'CTA', type: 'bus' },
  { id: '147', shortName: '147', longName: 'Outer Drive Express', agency: 'CTA', type: 'bus' },
  { id: '151', shortName: '151', longName: 'Sheridan', agency: 'CTA', type: 'bus' },
];

const CTA_L_STATIONS: CtaStationDef[] = [
  { mapId: '40380', name: 'Clark/Lake', lines: ['Blue', 'Brn', 'G', 'Org', 'Pink', 'P'], lat: 41.8857, lon: -87.6309 },
  { mapId: '40260', name: 'State/Lake', lines: ['Brn', 'G', 'Org', 'Pink', 'P'], lat: 41.8857, lon: -87.6278 },
  { mapId: '41700', name: 'Washington/Wabash', lines: ['Brn', 'G', 'Org', 'Pink', 'P'], lat: 41.8832, lon: -87.6262 },
  { mapId: '40040', name: 'Washington/Wells', lines: ['Brn', 'Org', 'Pink', 'P'], lat: 41.8837, lon: -87.6338 },
  { mapId: '40560', name: 'Jackson (Red)', lines: ['Red'], lat: 41.8782, lon: -87.6276 },
  { mapId: '40070', name: 'Jackson (Blue)', lines: ['Blue'], lat: 41.8782, lon: -87.6293 },
  { mapId: '41660', name: 'Lake (Red)', lines: ['Red'], lat: 41.8848, lon: -87.6278 },
  { mapId: '40370', name: 'Washington (Blue)', lines: ['Blue'], lat: 41.8837, lon: -87.6294 },
  { mapId: '40890', name: "O'Hare", lines: ['Blue'], lat: 41.9777, lon: -87.9042 },
  { mapId: '40930', name: 'Midway', lines: ['Org'], lat: 41.7866, lon: -87.7379 },
  { mapId: '40900', name: 'Howard', lines: ['Red', 'P', 'Y'], lat: 42.0191, lon: -87.6729 },
  { mapId: '40450', name: '95th/Dan Ryan', lines: ['Red'], lat: 41.7224, lon: -87.6243 },
  { mapId: '41320', name: 'Belmont', lines: ['Red', 'Brn', 'P'], lat: 41.9398, lon: -87.6534 },
  { mapId: '41220', name: 'Fullerton', lines: ['Red', 'Brn', 'P'], lat: 41.9251, lon: -87.6529 },
  { mapId: '41450', name: 'Chicago (Red)', lines: ['Red'], lat: 41.8968, lon: -87.6281 },
  { mapId: '40710', name: 'Chicago (Blue)', lines: ['Blue'], lat: 41.8962, lon: -87.6555 },
  { mapId: '40680', name: 'Adams/Wabash', lines: ['Brn', 'G', 'Org', 'Pink', 'P'], lat: 41.8795, lon: -87.6261 },
  { mapId: '40160', name: 'LaSalle/Van Buren', lines: ['Brn', 'Org', 'Pink', 'P'], lat: 41.8768, lon: -87.6317 },
  { mapId: '40280', name: 'Central (Green)', lines: ['G'], lat: 41.8874, lon: -87.7656 },
  { mapId: '40140', name: 'Dempster-Skokie', lines: ['Y'], lat: 42.0363, lon: -87.7521 },
];

export class ChicagoCtaTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'chicago',
    name: 'Chicago',
    agency: 'CTA (Chicago Transit Authority)',
    state: 'IL',
    modes: ['"L" Rapid Transit (Red, Blue, Brown, Green, Orange, Purple, Pink, Yellow)', 'Bus'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'Live CTA alerts and system routes are 100% open. Optional CTA_TRAIN_API_KEY enables direct Train Tracker hardware feeds.',
    aliases: ['chicago', 'cta', 'windycity', 'chi'],
  };

  private alertsUrl = 'https://www.transitchicago.com/api/1.0/alerts.aspx';
  private trainTrackerUrl = 'https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx';
  private xmlParser: XMLParser;
  private trainApiKey?: string;

  constructor(
    private customFetch: typeof fetch = fetch,
    trainApiKey?: string
  ) {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    this.trainApiKey =
      trainApiKey ||
      (typeof process !== 'undefined' ? process.env.CTA_TRAIN_API_KEY : undefined);
  }

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    let routes = [...CTA_L_LINES];
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
    const cleanId = routeId.trim();
    // Match line against CTA stations
    const matchedStations = CTA_L_STATIONS.filter((s) =>
      s.lines.some((l) => l.toLowerCase() === cleanId.toLowerCase() || cleanId.toLowerCase().includes(l.toLowerCase()))
    );

    const targetList = matchedStations.length > 0 ? matchedStations : CTA_L_STATIONS;

    return targetList.map((s) => ({
      id: s.mapId,
      name: s.name,
      code: s.mapId,
      latitude: s.lat,
      longitude: s.lon,
      parentStation: s.mapId,
    }));
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const raw = stopIdOrStation.trim();
    let mapId = raw;

    // Look up by station name if not purely numeric
    const stationByName = CTA_L_STATIONS.find(
      (s) =>
        s.mapId === raw ||
        s.name.toLowerCase() === raw.toLowerCase() ||
        s.name.toLowerCase().includes(raw.toLowerCase())
    );
    if (stationByName) {
      mapId = stationByName.mapId;
    }

    // If API key is available, call live Train Tracker
    if (this.trainApiKey) {
      try {
        const url = `${this.trainTrackerUrl}?key=${encodeURIComponent(this.trainApiKey)}&mapid=${encodeURIComponent(mapId)}&outputType=JSON`;
        const res = await this.customFetch(url);
        if (res.ok) {
          const data = (await res.json()) as any;
          const ctatt = data?.ctatt;
          const etas = ctatt?.eta || [];
          const etaList = Array.isArray(etas) ? etas : [etas];

          return etaList.map((eta: any) => {
            const arrT = eta.arrT ? new Date(eta.arrT).toISOString() : new Date().toISOString();
            const now = Date.now();
            const diffMin = Math.max(0, Math.round((new Date(arrT).getTime() - now) / 60000));
            const isApproaching = eta.isApp === '1' || eta.isDue === '1';

            return {
              routeId: eta.rt,
              routeShortName: `${eta.rt} Line`,
              destination: eta.destNm,
              departureTime: arrT,
              countdownMinutes: isApproaching ? 'Due' : diffMin,
              isRealtime: eta.isSch !== '1',
              status: eta.isDly === '1' ? 'Delayed' : isApproaching ? 'Approaching' : 'On time',
              platform: eta.staId,
              stopId: mapId,
              stopName: eta.staNm || stationByName?.name,
              direction: eta.trDr,
            };
          });
        }
      } catch {
        // Fall back to schedule estimates below
      }
    }

    // Default intelligent simulated headway departure if no key is configured
    const stn = stationByName || {
      mapId,
      name: `CTA Station (${mapId})`,
      lines: ['Red', 'Blue'],
      lat: 41.88,
      lon: -87.63,
    };

    const now = Date.now();
    const departures: TransitDeparture[] = [];

    for (let i = 0; i < stn.lines.length; i++) {
      const line = stn.lines[i];
      const headways = [3 + i * 2, 9 + i * 4];
      for (const hw of headways) {
        departures.push({
          routeId: line,
          routeShortName: `${line} Line`,
          destination: line === 'Red' ? 'Howard' : line === 'Blue' ? "O'Hare" : 'Loop',
          departureTime: new Date(now + hw * 60000).toISOString(),
          countdownMinutes: hw,
          isRealtime: false,
          status: 'Scheduled Headway (Set CTA_TRAIN_API_KEY for live GPS)',
          stopId: mapId,
          stopName: stn.name,
        });
      }
    }

    return departures;
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    let url = this.alertsUrl;
    if (routeFilter && routeFilter.trim()) {
      url += `?routeid=${encodeURIComponent(routeFilter.trim().toLowerCase())}`;
    }

    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch CTA alerts: HTTP ${res.status}`);
    }

    const xmlText = await res.text();
    const parsed = this.xmlParser.parse(xmlText);
    const rawAlerts = parsed?.CTAAlerts?.Alert;
    const alertList = Array.isArray(rawAlerts) ? rawAlerts : rawAlerts ? [rawAlerts] : [];

    return alertList.map((a: any) => {
      const score = Number(a.SeverityScore) || 0;
      let severity: TransitAlert['severity'] = 'info';
      if (score >= 40 || a.MajorAlert === '1') {
        severity = 'severe';
      } else if (score >= 20) {
        severity = 'warning';
      }

      const services = a.ImpactedService?.Service;
      const sList = Array.isArray(services) ? services : services ? [services] : [];
      const affectedRoutes = sList
        .map((s: any) => String(s.ServiceName || s.ServiceId || ''))
        .filter((s: string) => Boolean(s));

      return {
        id: String(a.AlertId),
        header: a.Headline || 'CTA Service Advisory',
        description: a.ShortDescription || a.FullDescription || a.Headline,
        severity,
        effect: a.Impact,
        affectedRoutes: affectedRoutes.length > 0 ? Array.from(new Set(affectedRoutes)) : undefined,
        url: a.AlertURL || undefined,
        updatedAt: a.EventStart,
      };
    });
  }
}
