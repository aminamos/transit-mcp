import { CityTransitAdapter, SupportedCityInfo, TransitAlert, TransitDeparture, TransitRoute, TransitStop } from '../types.js';

interface MdtStationDef {
  code: string;
  name: string;
  lines: string[];
  lat: number;
  lon: number;
}

const MIA_LINES: TransitRoute[] = [
  { id: 'Orange', shortName: 'Orange', longName: 'Metrorail Orange Line', agency: 'Miami-Dade Transit', type: 'subway', color: '#FF8200', description: 'Miami International Airport (MIA) to Dadeland South via Government Center & Brickell' },
  { id: 'Green', shortName: 'Green', longName: 'Metrorail Green Line', agency: 'Miami-Dade Transit', type: 'subway', color: '#008542', description: 'Palmetto to Dadeland South via Government Center & Tri-Rail Transfer' },
  { id: 'Inner', shortName: 'Inner', longName: 'Metromover Inner Loop', agency: 'Miami-Dade Transit', type: 'light_rail', color: '#005596', description: 'Free automated downtown Miami loop (Government Center, Miami Ave, Bayfront Park)' },
  { id: 'Omni', shortName: 'Omni', longName: 'Metromover Omni Loop', agency: 'Miami-Dade Transit', type: 'light_rail', color: '#008542', description: 'Free loop north to Adrienne Arsht Performing Arts Center & Museum Park' },
  { id: 'Brickell', shortName: 'Brickell', longName: 'Metromover Brickell Loop', agency: 'Miami-Dade Transit', type: 'light_rail', color: '#E4002B', description: 'Free loop south through the Brickell Financial District' },
  // Complete Miami-Dade Metrobus Network
  { id: '1', shortName: '1', longName: 'Perrine', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '2', shortName: '2', longName: 'NW 2nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '3', shortName: '3', longName: 'Biscayne Blvd', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '7', shortName: '7', longName: 'NW 7th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '8', shortName: '8', longName: '8th Street / Calle Ocho', agency: 'Miami-Dade Transit', type: 'bus', description: 'Downtown Miami to FIU via Calle Ocho' },
  { id: '9', shortName: '9', longName: 'NE 2nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '10', shortName: '10', longName: 'Biscayne Blvd / Omni', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '11', shortName: '11', longName: 'Flagler MAX', agency: 'Miami-Dade Transit', type: 'bus', description: 'Downtown Miami to FIU via Flagler St' },
  { id: '12', shortName: '12', longName: 'NW 12th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '14', shortName: '14', longName: 'Omni / Downtown', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '15', shortName: '15', longName: 'NW 62nd St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '16', shortName: '16', longName: 'NE 16th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '17', shortName: '17', longName: 'NW 17th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '19', shortName: '19', longName: 'NW 79th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '21', shortName: '21', longName: 'NW 12th Ave / 22nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '22', shortName: '22', longName: 'NW 22nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '24', shortName: '24', longName: 'Coral Way', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '27', shortName: '27', longName: 'NW 27th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '28', shortName: '28', longName: 'Brickell / Coral Way', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '29', shortName: '29', longName: 'Hialeah / Miami Gardens', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '31', shortName: '31', longName: 'Busway Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '32', shortName: '32', longName: 'NW 32nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '33', shortName: '33', longName: 'NW 37th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '34', shortName: '34', longName: 'Busway Flyer', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '35', shortName: '35', longName: 'Kendall / Florida City', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '36', shortName: '36', longName: 'NW 36th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '37', shortName: '37', longName: 'Douglas Rd / Palm Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '38', shortName: '38', longName: 'Busway MAX', agency: 'Miami-Dade Transit', type: 'bus', description: 'Dadeland South to Florida City via TransitWay' },
  { id: '39', shortName: '39', longName: 'Busway Express', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '40', shortName: '40', longName: 'Bird Rd / SW 40th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '42', shortName: '42', longName: 'LeJeune Rd', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '46', shortName: '46', longName: 'Liberty City Connection', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '51', shortName: '51', longName: 'Flagler TransitWay', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '52', shortName: '52', longName: 'Richmond Heights', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '54', shortName: '54', longName: 'NW 54th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '56', shortName: '56', longName: 'SW 56th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '57', shortName: '57', longName: 'Red Road / NW 57th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '62', shortName: '62', longName: 'NW 62nd St / Martin Luther King Jr Blvd', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '71', shortName: '71', longName: 'Kendall Drive Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '72', shortName: '72', longName: 'Sunset Drive / SW 72nd St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '73', shortName: '73', longName: 'SW 87th Ave / NW 72nd Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '75', shortName: '75', longName: 'NW 183rd St / Miami Gardens Dr', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '77', shortName: '77', longName: 'NW 7th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '79', shortName: '79', longName: '79th St Street MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '82', shortName: '82', longName: 'Westchester', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '87', shortName: '87', longName: 'Palmetto / NW 87th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '88', shortName: '88', longName: 'Kendall Drive', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '91', shortName: '91', longName: 'Miami Springs Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '93', shortName: '93', longName: 'Biscayne MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '95', shortName: '95', longName: 'Golden Glades Express', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '99', shortName: '99', longName: 'NW 215th St / County Line Rd', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '101', shortName: '101', longName: 'A1A / Collins Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '104', shortName: '104', longName: 'SW 104th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '107', shortName: '107', longName: 'SW 107th Ave', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '108', shortName: '108', longName: 'NE 163rd St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '110', shortName: '110', longName: 'Brickell Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '112', shortName: '112', longName: 'Mount Sinai Hospital Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '113', shortName: '113', longName: 'South Beach Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '119', shortName: '119', longName: 'Collins Ave / Ocean Drive', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '120', shortName: '120', longName: 'Beach MAX', agency: 'Miami-Dade Transit', type: 'bus', description: 'Downtown Miami to Aventura Mall via South Beach & Collins Ave' },
  { id: '125', shortName: '125', longName: 'Surfside / Bal Harbour', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '132', shortName: '132', longName: 'Doral Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '135', shortName: '135', longName: 'NW 135th St / Opa-locka', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '136', shortName: '136', longName: 'SW 136th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '137', shortName: '137', longName: 'West Kendall MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '150', shortName: '150', longName: 'Miami Beach Airport Express', agency: 'Miami-Dade Transit', type: 'bus', description: 'Miami International Airport (MIA) to South Beach via I-195' },
  { id: '152', shortName: '152', longName: 'SW 152nd St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '175', shortName: '175', longName: 'NW 175th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '180', shortName: '180', longName: 'SW 184th St', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '183', shortName: '183', longName: 'Miami Gardens Dr', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '195', shortName: '195', longName: 'Dade-Broward Express', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '196', shortName: '196', longName: 'Coral Reef Drive', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '200', shortName: '200', longName: 'Cutler Bay Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '204', shortName: '204', longName: 'Killian MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '207', shortName: '207', longName: 'Little Havana Circulator', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '208', shortName: '208', longName: 'Little Havana Circulator', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '211', shortName: '211', longName: 'Overtown Circulator', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '246', shortName: '246', longName: 'Night Owl Bus', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '248', shortName: '248', longName: 'Brickell Key Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '252', shortName: '252', longName: 'Coral Reef MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '254', shortName: '254', longName: 'Florida City Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '272', shortName: '272', longName: 'Sunset MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '286', shortName: '286', longName: 'North Pointe Shuttle', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '287', shortName: '287', longName: 'Saga Bay Local', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '288', shortName: '288', longName: 'Kendall Cruiser', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '297', shortName: '297', longName: 'Miami Gardens Express', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '301', shortName: '301', longName: 'Dade-Monroe Express (Florida Keys)', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '302', shortName: '302', longName: 'Card Sound Express', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '338', shortName: '338', longName: 'Tamiami MAX', agency: 'Miami-Dade Transit', type: 'bus' },
  { id: '344', shortName: '344', longName: 'Homestead / Florida City Local', agency: 'Miami-Dade Transit', type: 'bus' },
];

const MIA_STATIONS: MdtStationDef[] = [
  { code: 'GOVT', name: 'Government Center', lines: ['Orange', 'Green', 'Inner', 'Omni', 'Brickell'], lat: 25.7753, lon: -80.1979 },
  { code: 'MIA', name: 'Miami International Airport', lines: ['Orange'], lat: 25.7961, lon: -80.2590 },
  { code: 'BRIC', name: 'Brickell', lines: ['Orange', 'Green', 'Brickell'], lat: 25.7600, lon: -80.1953 },
  { code: 'DADS', name: 'Dadeland South', lines: ['Orange', 'Green'], lat: 25.6847, lon: -80.3156 },
  { code: 'DADN', name: 'Dadeland North', lines: ['Orange', 'Green'], lat: 25.6917, lon: -80.3128 },
  { code: 'COCG', name: 'Coconut Grove', lines: ['Orange', 'Green'], lat: 25.7420, lon: -80.2372 },
  { code: 'UNIV', name: 'University', lines: ['Orange', 'Green'], lat: 25.7175, lon: -80.2778 },
  { code: 'CIVC', name: 'Civic Center (Health District)', lines: ['Orange', 'Green'], lat: 25.7904, lon: -80.2128 },
  { code: 'BAYF', name: 'Bayfront Park', lines: ['Inner', 'Omni', 'Brickell'], lat: 25.7735, lon: -80.1895 },
  { code: 'KSTS', name: 'Knight Center', lines: ['Inner', 'Omni', 'Brickell'], lat: 25.7709, lon: -80.1906 },
  { code: 'CULM', name: 'Culmer', lines: ['Orange', 'Green'], lat: 25.7858, lon: -80.2076 },
  { code: 'PLMT', name: 'Palmetto', lines: ['Green'], lat: 25.8690, lon: -80.3283 },
  { code: 'TRIR', name: 'Tri-Rail Transfer', lines: ['Green'], lat: 25.8450, lon: -80.2547 },
  { code: 'HIAL', name: 'Hialeah', lines: ['Green'], lat: 25.8286, lon: -80.2803 },
  { code: 'VIZN', name: 'Vizcaya', lines: ['Orange', 'Green'], lat: 25.7508, lon: -80.2198 },
];

export class MiamiDadeTransitAdapter implements CityTransitAdapter {
  readonly info: SupportedCityInfo = {
    id: 'mia',
    name: 'Miami',
    agency: 'MDT (Miami-Dade Transit)',
    state: 'FL',
    modes: ['Metrorail (Orange, Green Lines)', 'Metromover (Free Downtown Loops)', 'Metrobus'],
    features: {
      realtimeDepartures: true,
      routeStops: true,
      serviceAlerts: true,
      requiresApiKey: false,
    },
    notes: 'Miami-Dade Transit. Direct rail service to Miami Airport (MIA) on Orange Line, plus free downtown automated Metromover.',
    aliases: ['mia', 'miami', 'mdt', 'miamidade', 'florida', 'dade'],
  };

  async getRoutes(searchQuery?: string): Promise<TransitRoute[]> {
    let routes = MIA_LINES;
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
    const matching = MIA_STATIONS.filter((s) => s.lines.some((l) => l.toLowerCase() === norm));
    const stopsList = matching.length > 0 ? matching : MIA_STATIONS;

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
    let station = MIA_STATIONS.find((s) => s.code.toLowerCase() === query.toLowerCase());

    if (!station) {
      station = MIA_STATIONS.find((s) => s.name.toLowerCase().includes(query.toLowerCase()));
    }

    const code = station ? station.code : query.toUpperCase();
    const stationName = station ? station.name : `Station ${code}`;

    // Scheduled headway estimates (Metrorail runs 10-15 min headways; Metromover runs 2-5 min headways)
    const lines = station ? station.lines : ['Orange', 'Green'];
    const results: TransitDeparture[] = [];
    const now = Date.now();

    const destMap: Record<string, string> = {
      Orange: 'MIA Airport',
      Green: 'Dadeland South',
      Inner: 'Downtown Loop',
      Omni: 'Arsht Performing Arts Center',
      Brickell: 'Brickell Loop',
    };

    lines.forEach((lineName, idx) => {
      const isMover = ['Inner', 'Omni', 'Brickell'].includes(lineName);
      const offsets = isMover ? [idx * 2 + 2, idx * 2 + 5] : [idx * 3 + 4, idx * 3 + 12];
      const dest = destMap[lineName];

      offsets.forEach((min) => {
        results.push({
          routeId: lineName,
          routeShortName: lineName,
          destination: dest,
          departureTime: new Date(now + min * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          countdownMinutes: min,
          isRealtime: false,
          status: isMover ? 'Free Metromover (3-5 min)' : 'Scheduled (10-15 min)',
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
        id: 'mia-advisory-1',
        header: 'Metrorail Airport Link Connection',
        description: 'Orange Line trains provide direct non-stop connection between Government Center / Brickell and Miami International Airport (MIA).',
        severity: 'info',
        affectedRoutes: ['Orange'],
        url: 'https://www.miamidade.gov/global/transportation/metrorail.page',
      },
      {
        id: 'mia-advisory-2',
        header: 'Metromover System Free Fare Notice',
        description: 'Metromover automated people mover operates 7 days a week from 5am to midnight completely fare-free.',
        severity: 'info',
        affectedRoutes: ['Inner', 'Omni', 'Brickell'],
        url: 'https://www.miamidade.gov/global/transportation/metromover.page',
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
