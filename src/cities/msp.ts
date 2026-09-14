import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface MspRouteDto {
  route_id: string;
  agency_id: number;
  route_label: string;
}

interface MspDirectionDto {
  direction_id: number;
  direction_name: string;
}

interface MspStopDto {
  place_code: string;
  description: string;
}

interface MspDepartureDto {
  actual: boolean;
  trip_id: string;
  stop_id: number;
  departure_text: string;
  departure_time: number;
  description: string;
  route_id: string;
  route_short_name: string;
  direction_id: number;
  direction_text: string;
  agency_id: number;
  schedule_relationship: string;
}

interface MspDepartureResponseDto {
  stops?: Array<{
    stop_id: number;
    latitude: number;
    longitude: number;
    description: string;
  }>;
  departures?: MspDepartureDto[];
  alerts?: Array<{
    stop_closed: boolean;
    alert_text: string;
  }>;
}

export class MspTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'msp',
    name: 'Minneapolis-St. Paul',
    agency: 'Metro Transit',
    state: 'MN',
    modes: ['Light Rail (METRO Blue & Green Lines)', 'Bus', 'BRT (Orange, Red, A, C, D Lines)', 'Northstar Commuter Rail'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'Real-time NexTrip REST API provided by Metro Transit (svc.metrotransit.org). No API key required.',
    aliases: ['minneapolis', 'stpaul', 'twin-cities', 'metrotransit', 'msp'],
  };

  private baseUrl = 'https://svc.metrotransit.org/nextripv2';

  constructor(private customFetch: typeof fetch = fetch) {}

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    const res = await this.customFetch(`${this.baseUrl}/routes`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch MSP routes: HTTP ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as MspRouteDto[];

    let routes: TransitRoute[] = data.map((r) => {
      let type: TransitRoute['type'] = 'bus';
      const label = r.route_label.toLowerCase();
      if (label.includes('light rail') || label.includes('blue line') || label.includes('green line')) {
        type = 'light_rail';
      } else if (label.includes('northstar') || label.includes('rail')) {
        type = 'rail';
      }

      return {
        id: r.route_id,
        shortName: r.route_id,
        longName: r.route_label,
        agency: 'Metro Transit',
        type,
        description: r.route_label,
      };
    });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      routes = routes.filter(
        (r) => r.id.toLowerCase().includes(q) || r.shortName.toLowerCase().includes(q) || r.longName.toLowerCase().includes(q)
      );
    }

    return routes;
  }

  async getStops(routeId: string, direction?: string | number): Promise<TransitStop[]> {
    // 1. Fetch directions
    const dirRes = await this.customFetch(`${this.baseUrl}/directions/${encodeURIComponent(routeId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!dirRes.ok) {
      throw new Error(`Failed to fetch directions for MSP route ${routeId}: HTTP ${dirRes.status}`);
    }
    const directions = (await dirRes.json()) as MspDirectionDto[];
    if (!directions || directions.length === 0) {
      return [];
    }

    let targetDirId = directions[0].direction_id;
    if (direction !== undefined && direction !== null) {
      const dirStr = String(direction).toLowerCase().trim();
      const matched = directions.find(
        (d) =>
          String(d.direction_id) === dirStr ||
          d.direction_name.toLowerCase().includes(dirStr) ||
          (dirStr === 'nb' && d.direction_name.toLowerCase().includes('north')) ||
          (dirStr === 'sb' && d.direction_name.toLowerCase().includes('south')) ||
          (dirStr === 'eb' && d.direction_name.toLowerCase().includes('east')) ||
          (dirStr === 'wb' && d.direction_name.toLowerCase().includes('west'))
      );
      if (matched) {
        targetDirId = matched.direction_id;
      }
    }

    // 2. Fetch stops for route & direction
    const stopsRes = await this.customFetch(`${this.baseUrl}/stops/${encodeURIComponent(routeId)}/${targetDirId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!stopsRes.ok) {
      throw new Error(`Failed to fetch stops for MSP route ${routeId} direction ${targetDirId}: HTTP ${stopsRes.status}`);
    }
    const data = (await stopsRes.json()) as MspStopDto[];

    return data.map((s) => ({
      id: s.place_code,
      name: s.description,
      code: s.place_code,
      placeCode: s.place_code,
      direction: targetDirId,
    }));
  }

  async getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]> {
    const raw = stopIdOrStation.trim();
    let url = `${this.baseUrl}/${encodeURIComponent(raw)}`;

    // If input is formatted like "901/0/MAAM", handle it directly
    if (raw.includes('/')) {
      const parts = raw.split('/').map((p) => p.trim());
      if (parts.length >= 3) {
        url = `${this.baseUrl}/${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }

    const res = await this.customFetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch departures for stop "${stopIdOrStation}": HTTP ${res.status}`);
    }

    const data = (await res.json()) as MspDepartureResponseDto;
    const departures = data.departures || [];
    const stopDesc = data.stops && data.stops[0] ? data.stops[0].description : undefined;

    return departures.map((dep) => {
      let countdown: number | string = dep.departure_text;
      const minMatch = dep.departure_text.match(/(\d+)\s*Min/i);
      if (minMatch) {
        countdown = parseInt(minMatch[1], 10);
      } else if (/due|now/i.test(dep.departure_text)) {
        countdown = 0;
      }

      // Departure time is unix timestamp in seconds
      const departureTimeIso = dep.departure_time
        ? new Date(dep.departure_time * 1000).toISOString()
        : new Date().toISOString();

      return {
        routeId: dep.route_id,
        routeShortName: dep.route_short_name || dep.route_id,
        destination: dep.description,
        departureTime: departureTimeIso,
        countdownMinutes: countdown,
        isRealtime: Boolean(dep.actual),
        status: dep.actual ? `Live (${dep.departure_text})` : (dep.schedule_relationship || 'Scheduled'),
        stopId: String(dep.stop_id),
        stopName: stopDesc,
        direction: dep.direction_text,
      };
    });
  }

  async getAlerts(routeFilter?: string): Promise<TransitAlert[]> {
    const alertsMap = new Map<string, TransitAlert>();

    // If route specified, check departures for a stop on that route
    if (routeFilter && routeFilter.trim()) {
      const cleanRoute = routeFilter.trim();
      try {
        const dirsRes = await this.customFetch(`${this.baseUrl}/directions/${encodeURIComponent(cleanRoute)}`, {
          headers: { Accept: 'application/json' },
        });
        if (dirsRes.ok) {
          const dirs = (await dirsRes.json()) as MspDirectionDto[];
          if (dirs.length > 0) {
            const stopsRes = await this.customFetch(`${this.baseUrl}/stops/${encodeURIComponent(cleanRoute)}/${dirs[0].direction_id}`, {
              headers: { Accept: 'application/json' },
            });
            if (stopsRes.ok) {
              const stops = (await stopsRes.json()) as MspStopDto[];
              if (stops.length > 0) {
                const depRes = await this.customFetch(`${this.baseUrl}/${encodeURIComponent(cleanRoute)}/${dirs[0].direction_id}/${stops[0].place_code}`, {
                  headers: { Accept: 'application/json' },
                });
                if (depRes.ok) {
                  const data = (await depRes.json()) as MspDepartureResponseDto;
                  for (const a of data.alerts || []) {
                    alertsMap.set(a.alert_text, {
                      id: `msp-${Math.abs(hashString(a.alert_text))}`,
                      header: a.stop_closed ? 'Stop Closed' : 'Service Advisory',
                      description: a.alert_text,
                      severity: a.stop_closed ? 'warning' : 'info',
                      affectedRoutes: [cleanRoute],
                    });
                  }
                }
              }
            }
          }
        }
      } catch {
        // Fall back gracefully
      }
    } else {
      // Check popular lines for system alerts
      const trunkRoutes = ['901', '902'];
      for (const r of trunkRoutes) {
        try {
          const stopsRes = await this.customFetch(`${this.baseUrl}/stops/${r}/0`, {
            headers: { Accept: 'application/json' },
          });
          if (stopsRes.ok) {
            const stops = (await stopsRes.json()) as MspStopDto[];
            if (stops.length > 0) {
              const depRes = await this.customFetch(`${this.baseUrl}/${r}/0/${stops[0].place_code}`, {
                headers: { Accept: 'application/json' },
              });
              if (depRes.ok) {
                const data = (await depRes.json()) as MspDepartureResponseDto;
                for (const a of data.alerts || []) {
                  if (!alertsMap.has(a.alert_text)) {
                    alertsMap.set(a.alert_text, {
                      id: `msp-${Math.abs(hashString(a.alert_text))}`,
                      header: a.stop_closed ? 'Stop Closed' : 'Metro Transit Advisory',
                      description: a.alert_text,
                      severity: a.stop_closed ? 'warning' : 'info',
                      affectedRoutes: [r],
                    });
                  }
                }
              }
            }
          }
        } catch {
          // ignore error on background sample
        }
      }
    }

    return Array.from(alertsMap.values());
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
