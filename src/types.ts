export type CityId = 'msp' | 'boston' | 'sf_bart' | 'chicago' | 'portland' | 'dc' | 'atl' | 'mia' | 'bna';

export const SUPPORTED_CITY_IDS: readonly CityId[] = ['msp', 'boston', 'sf_bart', 'chicago', 'portland', 'dc', 'atl', 'mia', 'bna'] as const;

export interface SupportedCityInfo {
  id: CityId;
  name: string;
  agency: string;
  state: string;
  modes: string[];
  features: {
    realtimeDepartures: boolean;
    routeStops: boolean;
    serviceAlerts: boolean;
    requiresApiKey: boolean;
  };
  notes: string;
  aliases: string[];
}

export interface TransitRoute {
  id: string;
  shortName: string;
  longName: string;
  agency: string;
  type?: 'subway' | 'light_rail' | 'bus' | 'rail' | 'cable_car' | 'ferry' | 'other';
  color?: string;
  description?: string;
}

export interface TransitStop {
  id: string;
  name: string;
  code?: string;
  latitude?: number;
  longitude?: number;
  direction?: string | number;
  parentStation?: string;
  placeCode?: string;
}

export interface TransitDeparture {
  routeId: string;
  routeShortName: string;
  destination: string;
  departureTime: string;
  countdownMinutes: number | string;
  isRealtime: boolean;
  status?: string;
  platform?: string;
  stopId: string;
  stopName?: string;
  direction?: string;
  delaySeconds?: number;
}

export interface TransitAlert {
  id: string;
  header: string;
  description: string;
  severity?: 'info' | 'warning' | 'severe' | 'unknown';
  effect?: string;
  affectedRoutes?: string[];
  url?: string;
  updatedAt?: string;
}

export interface CityTransitAdapter {
  readonly info: SupportedCityInfo;
  getRoutes(searchQuery?: string): Promise<TransitRoute[]>;
  getStops(routeId: string, direction?: string | number): Promise<TransitStop[]>;
  getDepartures(stopIdOrStation: string): Promise<TransitDeparture[]>;
  getAlerts(routeFilter?: string): Promise<TransitAlert[]>;
}
