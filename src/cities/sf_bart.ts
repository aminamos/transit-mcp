import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface BartStationDto {
  name: string;
  abbr: string;
  gtfs_latitude?: string;
  gtfs_longitude?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zipcode?: string;
}

interface BartRouteDto {
  name: string;
  abbr: string;
  routeID: string;
  number: string;
  hexcolor?: string;
  color?: string;
  direction?: string;
}

interface BartEstimateDto {
  minutes: string;
  platform: string;
  direction: string;
  length: string;
  color: string;
  hexcolor: string;
  delay?: string;
  bikeflag?: string;
  cancelflag?: string;
}

interface BartEtdDto {
  destination: string;
  abbreviation: string;
  estimate: BartEstimateDto[];
}

export class SfBartTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'sf_bart',
    name: 'San Francisco Bay Area',
    agency: 'BART (Bay Area Rapid Transit)',
    state: 'CA',
    modes: ['Rapid Transit / Heavy Rail', 'BART to OAK Automated Guideway Transit'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'BART open REST API (api.bart.gov) with universal key MW9S-E7SL-26DU-VV8V. Note: BART is a regional heavy rail operator; municipal Bay Area bus systems (SF Muni, AC Transit, VTA) are separate agencies not currently included.',
    aliases: ['sf', 'bayarea', 'bart', 'sanfrancisco', 'oakland', 'berkeley'],
  };

  private baseUrl = 'https://api.bart.gov/api';
  private apiKey: string;
  private stationCache: Map<string, BartStationDto> | null = null;

  constructor(
    private customFetch: typeof fetch = fetch,
    apiKey?: string
  ) {
    this.apiKey =
      apiKey ||
      process.env.BART_API_KEY ||
      'MW9S-E7SL-26DU-VV8V';
  }

  private async getAllStations(): Promise<Map<string, BartStationDto>> {
    if (this.stationCache) {
      return this.stationCache;
    }
    const url = `${this.baseUrl}/stn.aspx?cmd=stns&key=${this.apiKey}&json=y`;
    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch BART stations: HTTP ${res.status}`);
    }
    const json = (await res.json()) as any;
    const stations: BartStationDto[] = json?.root?.stations?.station || [];
    const map = new Map<string, BartStationDto>();
    for (const s of stations) {
      map.set(s.abbr.toUpperCase(), s);
      map.set(s.name.toLowerCase(), s);
    }
    this.stationCache = map;
    return map;
  }

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    const url = `${this.baseUrl}/route.aspx?cmd=routes&key=${this.apiKey}&json=y`;
    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch BART routes: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const routeList: BartRouteDto[] = json?.root?.routes?.route || [];

    let routes: TransitRoute[] = routeList.map((r) => ({
      id: r.number || r.routeID,
      shortName: r.abbr || `Route ${r.number}`,
      longName: r.name,
      agency: 'BART',
      type: 'subway',
      color: r.hexcolor,
      description: `${r.color || ''} Line: ${r.name} (${r.direction || ''})`.trim(),
    }));

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
    const stnMap = await this.getAllStations();

    // Clean route id e.g. "ROUTE 12" -> "12" or pass as is
    const cleanRouteNum = routeId.replace(/^route\s*/i, '').trim();
    const url = `${this.baseUrl}/route.aspx?cmd=routeinfo&route=${encodeURIComponent(cleanRouteNum)}&key=${this.apiKey}&json=y`;
    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch BART stops for route ${routeId}: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const rawStations = json?.root?.routes?.route?.config?.station;
    const stationAbbrs: string[] = Array.isArray(rawStations)
      ? rawStations
      : typeof rawStations === 'string'
      ? [rawStations]
      : [];

    return stationAbbrs.map((abbr) => {
      const stn = stnMap.get(abbr.toUpperCase());
      return {
        id: abbr.toUpperCase(),
        name: stn?.name || abbr,
        code: abbr.toUpperCase(),
        latitude: stn?.gtfs_latitude ? parseFloat(stn.gtfs_latitude) : undefined,
        longitude: stn?.gtfs_longitude ? parseFloat(stn.gtfs_longitude) : undefined,
      };
    });
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const raw = stopIdOrStation.trim();
    let origAbbr = raw.toUpperCase();

    // If full station name is passed (e.g. "embarcadero" or "powell"), resolve abbr
    const stnMap = await this.getAllStations();
    if (!stnMap.has(origAbbr) && stnMap.has(raw.toLowerCase())) {
      origAbbr = stnMap.get(raw.toLowerCase())!.abbr.toUpperCase();
    } else if (!stnMap.has(origAbbr)) {
      // Try prefix / fuzzy match
      for (const [key, val] of stnMap.entries()) {
        if (key.includes(raw.toLowerCase())) {
          origAbbr = val.abbr.toUpperCase();
          break;
        }
      }
    }

    const url = `${this.baseUrl}/etd.aspx?cmd=etd&orig=${encodeURIComponent(origAbbr)}&key=${this.apiKey}&json=y`;
    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch BART departures for station "${stopIdOrStation}": HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const stationData = json?.root?.station;
    const stnEntry = Array.isArray(stationData) ? stationData[0] : stationData;
    if (!stnEntry) {
      return [];
    }

    const stnName = stnEntry.name || origAbbr;
    const etds: BartEtdDto[] = Array.isArray(stnEntry.etd)
      ? stnEntry.etd
      : stnEntry.etd
      ? [stnEntry.etd]
      : [];

    const departures: TransitDeparture[] = [];
    const now = Date.now();

    for (const etd of etds) {
      const destination = etd.destination;
      const estimates: BartEstimateDto[] = Array.isArray(etd.estimate)
        ? etd.estimate
        : etd.estimate
        ? [etd.estimate]
        : [];

      for (const est of estimates) {
        let minutes: number | string = est.minutes;
        if (/leaving|now/i.test(est.minutes)) {
          minutes = 0;
        } else if (!isNaN(Number(est.minutes))) {
          minutes = Number(est.minutes);
        }

        const delaySec = est.delay ? parseInt(est.delay, 10) : 0;
        let status = 'On time';
        if (est.cancelflag === '1') {
          status = 'Cancelled';
        } else if (delaySec > 60) {
          status = `Delayed ${Math.round(delaySec / 60)} min`;
        }

        const depTime = typeof minutes === 'number'
          ? new Date(now + minutes * 60000).toISOString()
          : new Date().toISOString();

        departures.push({
          routeId: est.color || 'BART',
          routeShortName: est.color || 'BART',
          destination,
          departureTime: depTime,
          countdownMinutes: minutes,
          isRealtime: true,
          status,
          platform: est.platform,
          stopId: origAbbr,
          stopName: stnName,
          direction: est.direction,
          delaySeconds: delaySec > 0 ? delaySec : undefined,
        });
      }
    }

    // Sort by departure countdown
    departures.sort((a, b) => {
      const minA = typeof a.countdownMinutes === 'number' ? a.countdownMinutes : 999;
      const minB = typeof b.countdownMinutes === 'number' ? b.countdownMinutes : 999;
      return minA - minB;
    });

    return departures;
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    const url = `${this.baseUrl}/bsa.aspx?cmd=bsa&key=${this.apiKey}&json=y`;
    const res = await this.customFetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch BART alerts: HTTP ${res.status}`);
    }

    const json = (await res.json()) as any;
    const bsaList = json?.root?.bsa || [];
    const items = Array.isArray(bsaList) ? bsaList : [bsaList];

    const alerts: TransitAlert[] = [];
    for (const item of items) {
      const descObj = item.description;
      const desc =
        typeof descObj === 'string'
          ? descObj
          : descObj?.['#cdata-section'] || descObj?.text || '';

      const smsObj = item.sms_text;
      const sms =
        typeof smsObj === 'string'
          ? smsObj
          : smsObj?.['#cdata-section'] || smsObj?.text || '';

      // Skip "No delays reported"
      if (/no delays reported/i.test(desc) || /no delays reported/i.test(sms)) {
        continue;
      }

      const cleanDesc = (desc || sms).trim();
      if (!cleanDesc) continue;

      let severity: TransitAlert['severity'] = 'info';
      const type = (item.type || '').toUpperCase();
      if (type === 'DELAY') severity = 'warning';
      else if (type === 'EMERGENCY' || /major/i.test(cleanDesc)) severity = 'severe';

      if (routeFilter && routeFilter.trim()) {
        const rf = routeFilter.toLowerCase().trim();
        if (!cleanDesc.toLowerCase().includes(rf) && !(item.station || '').toLowerCase().includes(rf)) {
          continue;
        }
      }

      alerts.push({
        id: item['@id'] || `bart-${alerts.length + 1}`,
        header: `BART ${item.type || 'Advisory'}: ${item.station || 'Systemwide'}`,
        description: cleanDesc,
        severity,
        effect: item.type,
        updatedAt: item.posted,
      });
    }

    return alerts;
  }
}
