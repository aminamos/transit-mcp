import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface MbtaRouteDto {
  id: string;
  type: string;
  attributes: {
    color?: string;
    description?: string;
    direction_destinations?: string[];
    direction_names?: string[];
    long_name?: string;
    short_name?: string;
    type?: number;
  };
}

interface MbtaStopDto {
  id: string;
  type: string;
  attributes: {
    name: string;
    latitude?: number;
    longitude?: number;
    platform_code?: string;
    platform_name?: string;
  };
}

interface MbtaPredictionDto {
  id: string;
  type: string;
  attributes: {
    arrival_time: string | null;
    departure_time: string | null;
    direction_id: number;
    schedule_relationship: string | null;
    status: string | null;
  };
  relationships?: {
    route?: { data?: { id: string } };
    stop?: { data?: { id: string } };
    trip?: { data?: { id: string } };
  };
}

interface MbtaTripDto {
  id: string;
  type: string;
  attributes?: {
    headsign?: string;
    name?: string;
  };
}

interface MbtaAlertDto {
  id: string;
  type: string;
  attributes: {
    header: string;
    description?: string;
    effect?: string;
    severity?: number;
    service_effect?: string;
    url?: string | null;
    updated_at?: string;
    informed_entity?: Array<{
      route?: string;
      stop?: string;
    }>;
  };
}

export class BostonMbtaTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'boston',
    name: 'Boston',
    agency: 'MBTA (Massachusetts Bay Transportation Authority)',
    state: 'MA',
    modes: ['Subway (Red, Orange, Blue)', 'Light Rail (Green Line, Mattapan)', 'Commuter Rail', 'Bus', 'Ferry'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'MBTA v3 REST API (api-v3.mbta.com). Fully open; optional MBTA_API_KEY for higher rate limits.',
    aliases: ['boston', 'mbta', 'massachusetts', 't'],
  };

  private baseUrl = 'https://api-v3.mbta.com';

  constructor(
    private customFetch: typeof fetch = fetch,
    private apiKey?: string
  ) {
    this.apiKey = apiKey || process.env.MBTA_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.api+json',
    };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    const url = `${this.baseUrl}/routes`;
    const res = await this.customFetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch MBTA routes: HTTP ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as { data: MbtaRouteDto[] };
    let routes: TransitRoute[] = (json.data || []).map((r) => {
      let type: TransitRoute['type'] = 'bus';
      if (r.attributes.type === 0) type = 'light_rail';
      else if (r.attributes.type === 1) type = 'subway';
      else if (r.attributes.type === 2) type = 'rail';
      else if (r.attributes.type === 4) type = 'ferry';

      const shortName = r.attributes.short_name || r.id;
      const longName = r.attributes.long_name || r.id;

      return {
        id: r.id,
        shortName,
        longName,
        agency: 'MBTA',
        type,
        color: r.attributes.color ? `#${r.attributes.color}` : undefined,
        description: r.attributes.description || longName,
      };
    });

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

  async getStops(routeId: string, direction?: string | number): Promise<TransitStop[]> {
    let url = `${this.baseUrl}/stops?filter[route]=${encodeURIComponent(routeId)}`;
    if (direction !== undefined && direction !== null && direction !== '') {
      url += `&filter[direction_id]=${encodeURIComponent(String(direction))}`;
    }

    const res = await this.customFetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch MBTA stops for route ${routeId}: HTTP ${res.status}`);
    }

    const json = (await res.json()) as { data: MbtaStopDto[] };
    return (json.data || []).map((s) => ({
      id: s.id,
      name: s.attributes.name,
      code: s.attributes.platform_code || s.id,
      latitude: s.attributes.latitude,
      longitude: s.attributes.longitude,
      parentStation: s.id.startsWith('place-') ? s.id : undefined,
    }));
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const stopParam = encodeURIComponent(stopIdOrStation.trim());
    const url = `${this.baseUrl}/predictions?filter[stop]=${stopParam}&include=route,trip&sort=departure_time`;
    const res = await this.customFetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch MBTA predictions for stop "${stopIdOrStation}": HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      data: MbtaPredictionDto[];
      included?: Array<MbtaTripDto | MbtaRouteDto>;
    };

    const tripHeadsignMap = new Map<string, string>();
    if (json.included) {
      for (const item of json.included) {
        if (item.type === 'trip') {
          const trip = item as MbtaTripDto;
          if (trip.attributes?.headsign) {
            tripHeadsignMap.set(trip.id, trip.attributes.headsign);
          }
        }
      }
    }

    const now = Date.now();
    return (json.data || []).map((pred) => {
      const targetTimeStr = pred.attributes.departure_time || pred.attributes.arrival_time;
      let countdown: number | string = 'Unknown';
      let delaySec: number | undefined;

      if (targetTimeStr) {
        const targetMillis = new Date(targetTimeStr).getTime();
        const diffMinutes = Math.round((targetMillis - now) / 60000);
        countdown = diffMinutes <= 0 ? 'Approaching' : diffMinutes;
      }

      const routeId = pred.relationships?.route?.data?.id || 'Unknown';
      const tripId = pred.relationships?.trip?.data?.id;
      const destination = (tripId && tripHeadsignMap.get(tripId)) || routeId;

      const isRealtime = pred.attributes.status !== 'CANCELLED' && Boolean(targetTimeStr);
      let status = pred.attributes.status || (isRealtime ? 'On time' : 'Scheduled');
      if (pred.attributes.schedule_relationship === 'CANCELLED') {
        status = 'Cancelled';
      }

      return {
        routeId,
        routeShortName: routeId,
        destination,
        departureTime: targetTimeStr || new Date().toISOString(),
        countdownMinutes: countdown,
        isRealtime,
        status,
        stopId: stopIdOrStation,
        direction: pred.attributes.direction_id === 0 ? 'Outbound' : 'Inbound',
        delaySeconds: delaySec,
      };
    });
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    let url = `${this.baseUrl}/alerts?page[limit]=30`;
    if (routeFilter && routeFilter.trim()) {
      url += `&filter[route]=${encodeURIComponent(routeFilter.trim())}`;
    }

    const res = await this.customFetch(url, { headers: this.getHeaders() });
    if (!res.ok) {
      throw new Error(`Failed to fetch MBTA alerts: HTTP ${res.status}`);
    }

    const json = (await res.json()) as { data: MbtaAlertDto[] };
    return (json.data || []).map((a) => {
      let severity: TransitAlert['severity'] = 'info';
      if (a.attributes.severity && a.attributes.severity >= 7) {
        severity = 'severe';
      } else if (a.attributes.severity && a.attributes.severity >= 4) {
        severity = 'warning';
      }

      const affected = (a.attributes.informed_entity || [])
        .map((e) => e.route)
        .filter((r): r is string => Boolean(r));

      return {
        id: a.id,
        header: a.attributes.header,
        description: a.attributes.description || a.attributes.header,
        severity,
        effect: a.attributes.effect || a.attributes.service_effect,
        affectedRoutes: affected.length > 0 ? Array.from(new Set(affected)) : undefined,
        url: a.attributes.url || undefined,
        updatedAt: a.attributes.updated_at,
      };
    });
  }
}
