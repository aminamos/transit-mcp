import { BostonMbtaTransitAdapter } from './cities/boston.js';
import { ChicagoCtaTransitAdapter } from './cities/chicago.js';
import { MspTransitAdapter } from './cities/msp.js';
import { PortlandTriMetTransitAdapter } from './cities/portland.js';
import { SfBartTransitAdapter } from './cities/sf_bart.js';
import { CityTransitAdapter, SupportedCityInfo } from './types.js';

export class TransitRegistry {
  private adapters: Map<string, CityTransitAdapter> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    this.register(new MspTransitAdapter());
    this.register(new BostonMbtaTransitAdapter());
    this.register(new SfBartTransitAdapter());
    this.register(new ChicagoCtaTransitAdapter());
    this.register(new PortlandTriMetTransitAdapter());
  }

  register(adapter: CityTransitAdapter): void {
    const id = adapter.info.id.toLowerCase();
    this.adapters.set(id, adapter);
    this.aliasMap.set(id.replace(/[\s\-_]+/g, ''), id);

    for (const alias of adapter.info.aliases) {
      this.aliasMap.set(alias.toLowerCase().replace(/[\s\-_]+/g, ''), id);
    }
  }

  getAdapter(cityQuery: string): CityTransitAdapter {
    const normalized = cityQuery.trim().toLowerCase().replace(/[\s\-_]+/g, '');
    let matchedId = this.aliasMap.get(normalized);

    if (!matchedId) {
      // Try prefix match or substring match if query length is meaningful (>= 3)
      for (const [alias, id] of this.aliasMap.entries()) {
        if (alias.startsWith(normalized) || (normalized.length >= 3 && alias.includes(normalized))) {
          matchedId = id;
          break;
        }
      }
    }

    if (!matchedId || !this.adapters.has(matchedId)) {
      const supported = Array.from(this.adapters.values())
        .map((a) => `"${a.info.id}" (${a.info.name})`)
        .join(', ');
      throw new Error(`Unsupported city "${cityQuery}". Supported cities are: ${supported}`);
    }

    return this.adapters.get(matchedId)!;
  }

  listSupportedCities(): SupportedCityInfo[] {
    return Array.from(this.adapters.values()).map((a) => a.info);
  }
}
