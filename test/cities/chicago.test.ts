import { describe, expect, it } from 'vitest';
import { ChicagoCtaTransitAdapter } from '../../src/cities/chicago.js';

describe('ChicagoCtaTransitAdapter', () => {
  it('should list Chicago L lines and buses', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const routes = await adapter.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(130);
    const redLine = routes.find((r) => r.id === 'Red');
    expect(redLine).toBeDefined();
    expect(redLine?.type).toBe('subway');

    const bus66 = routes.find((r) => r.id === '66');
    expect(bus66).toBeDefined();
    expect(bus66?.type).toBe('bus');

    const filtered = await adapter.getRoutes('blue');
    expect(filtered.some((r) => r.id === 'Blue')).toBe(true);
  });

  it('should return stops for a line', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const stops = await adapter.getStops('Blue');
    expect(stops.length).toBeGreaterThan(0);
    const ohare = stops.find((s) => s.name === "O'Hare");
    expect(ohare).toBeDefined();
  });

  it('should provide scheduled departures when no train key is provided', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const deps = await adapter.getDepartures('40380');
    expect(deps.length).toBeGreaterThan(0);
    expect(deps[0].stopName).toBe('Clark/Lake');
  });

  it('should parse real live CTA XML alerts', async () => {
    const mockXml = `<?xml version="1.0" encoding="utf-8"?>
<CTAAlerts>
  <Alert>
    <AlertId>117336</AlertId>
    <Headline>Elevator at Lake Temporarily Out-of-Service</Headline>
    <ShortDescription>The elevator to/from platform at Lake is out of service.</ShortDescription>
    <SeverityScore>25</SeverityScore>
    <Impact>Service Disruption</Impact>
    <ImpactedService>
      <Service>
        <ServiceName>Red Line</ServiceName>
      </Service>
    </ImpactedService>
  </Alert>
</CTAAlerts>`;

    const mockFetch = (async () => ({
      ok: true,
      text: async () => mockXml,
    })) as any;

    const adapter = new ChicagoCtaTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('117336');
    expect(alerts[0].header).toContain('Elevator at Lake');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].affectedRoutes).toContain('Red Line');
  });

  it('should test getRoutes search filtering matching longName, description, and empty match', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const byDesc = await adapter.getRoutes('dan ryan');
    expect(byDesc.some((r) => r.id === 'Red')).toBe(true);

    const empty = await adapter.getRoutes('nonexistent route');
    expect(empty).toHaveLength(0);
  });

  it('should fallback to all stations when routeId is not matched in getStops', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const stops = await adapter.getStops('UnknownLine');
    expect(stops.length).toBeGreaterThan(10);
  });

  it('should get departures by station name and unknown station id with destinations', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    // By station name
    const depsByName = await adapter.getDepartures('clark/lake');
    expect(depsByName.length).toBeGreaterThan(0);
    expect(depsByName.some((d) => d.destination === "O'Hare")).toBe(true);
    expect(depsByName.some((d) => d.destination === 'Loop')).toBe(true);

    const depsRed = await adapter.getDepartures('Jackson (Red)');
    expect(depsRed.some((d) => d.destination === 'Howard')).toBe(true);

    // Unknown station id (simulated fallback)
    const depsUnknown = await adapter.getDepartures('99999');
    expect(depsUnknown.length).toBeGreaterThan(0);
    expect(depsUnknown[0].stopName).toBe('CTA Station (99999)');
  });

  it('should fetch live train tracker departures when trainApiKey is configured', async () => {
    const mockJson = {
      ctatt: {
        eta: [
          {
            rt: 'Red',
            destNm: 'Howard',
            arrT: new Date(Date.now() + 120000).toISOString(),
            isApp: '1',
            isSch: '0',
            isDly: '1',
            staId: '40560',
            staNm: 'Jackson',
            trDr: '1',
          },
          {
            rt: 'Blue',
            destNm: "O'Hare",
            arrT: null,
            isApp: '0',
            isDue: '1',
            isSch: '1',
            isDly: '0',
            staId: '40070',
            trDr: '5',
          },
          {
            rt: 'Brn',
            destNm: 'Kimball',
            arrT: new Date(Date.now() + 300000).toISOString(),
            isApp: '0',
            isDue: '0',
            isSch: '0',
            isDly: '0',
            staId: '40380',
            staNm: 'Clark/Lake',
            trDr: '1',
          },
        ],
      },
    };

    const mockFetch = (async (url: string) => {
      if (url.includes('fail-http')) return { ok: false, status: 500 };
      if (url.includes('throw-err')) throw new Error('Network crash');
      return {
        ok: true,
        json: async () => mockJson,
      };
    }) as any;

    const adapter = new ChicagoCtaTransitAdapter(mockFetch, 'cta-test-key');
    const deps = await adapter.getDepartures('Jackson');
    expect(deps).toHaveLength(3);
    expect(deps[0].status).toBe('Delayed');
    expect(deps[0].countdownMinutes).toBe('Due');
    expect(deps[0].isRealtime).toBe(true);

    expect(deps[1].status).toBe('Approaching');
    expect(deps[1].countdownMinutes).toBe('Due');
    expect(deps[1].isRealtime).toBe(false);

    expect(deps[2].status).toBe('On time');
    expect(deps[2].countdownMinutes).toBeGreaterThan(0);

    // Single object eta
    const singleObjFetch = (async () => ({
      ok: true,
      json: async () => ({
        ctatt: {
          eta: {
            rt: 'Red',
            destNm: 'Howard',
            arrT: new Date().toISOString(),
            isApp: '0',
            isDue: '0',
            isSch: '0',
            isDly: '0',
            staId: '40560',
            trDr: '1',
          },
        },
      }),
    })) as any;
    const singleAdapter = new ChicagoCtaTransitAdapter(singleObjFetch, 'cta-test-key');
    const singleDeps = await singleAdapter.getDepartures('Jackson');
    expect(singleDeps).toHaveLength(1);

    // Fallback when HTTP fails
    const failAdapter = new ChicagoCtaTransitAdapter(mockFetch, 'cta-test-key');
    const fallbackDeps = await failAdapter.getDepartures('fail-http');
    expect(fallbackDeps.length).toBeGreaterThan(0);

    // Fallback when network throws
    const throwAdapter = new ChicagoCtaTransitAdapter(mockFetch, 'cta-test-key');
    const throwDeps = await throwAdapter.getDepartures('throw-err');
    expect(throwDeps.length).toBeGreaterThan(0);
  });

  it('should test getAlerts with routeFilter, severe/info severities, and error conditions', async () => {
    let capturedUrl = '';
    const mockFetch = (async (url: string) => {
      capturedUrl = url;
      if (url.includes('fail')) return { ok: false, status: 500 };
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<CTAAlerts>
  <Alert>
    <AlertId>1</AlertId>
    <MajorAlert>1</MajorAlert>
    <SeverityScore>50</SeverityScore>
    <ShortDescription></ShortDescription>
    <FullDescription>Track work full description</FullDescription>
    <AlertURL>https://transitchicago.com/alert/1</AlertURL>
    <EventStart>2026-09-13</EventStart>
    <ImpactedService>
      <Service>
        <ServiceId>Blue</ServiceId>
      </Service>
      <Service>
        <ServiceName>Red</ServiceName>
      </Service>
    </ImpactedService>
  </Alert>
  <Alert>
    <AlertId>2</AlertId>
    <MajorAlert>0</MajorAlert>
    <SeverityScore>10</SeverityScore>
    <Headline>Notice Headline</Headline>
  </Alert>
</CTAAlerts>`;
      return {
        ok: true,
        text: async () => xml,
      };
    }) as any;

    const adapter = new ChicagoCtaTransitAdapter(mockFetch);
    const alerts = await adapter.getAlerts('red');
    expect(capturedUrl).toContain('routeid=red');
    expect(alerts).toHaveLength(2);
    expect(alerts[0].severity).toBe('severe');
    expect(alerts[0].header).toBe('CTA Service Advisory');
    expect(alerts[0].description).toBe('Track work full description');
    expect(alerts[0].affectedRoutes).toEqual(['Blue', 'Red']);
    expect(alerts[0].url).toBe('https://transitchicago.com/alert/1');

    expect(alerts[1].severity).toBe('info');
    expect(alerts[1].header).toBe('Notice Headline');
    expect(alerts[1].description).toBe('Notice Headline');
    expect(alerts[1].affectedRoutes).toBeUndefined();

    // Error HTTP
    const failAdapter = new ChicagoCtaTransitAdapter((async () => ({ ok: false, status: 500 })) as any);
    await expect(failAdapter.getAlerts()).rejects.toThrow(/Failed to fetch CTA alerts/);

    // Empty XML
    const emptyAdapter = new ChicagoCtaTransitAdapter((async () => ({
      ok: true,
      text: async () => '<CTAAlerts></CTAAlerts>',
    })) as any);
    const emptyAlerts = await emptyAdapter.getAlerts();
    expect(emptyAlerts).toEqual([]);

    // Single alert and single service in XML
    const singleXmlAdapter = new ChicagoCtaTransitAdapter((async () => ({
      ok: true,
      text: async () => `<CTAAlerts>
        <Alert>
          <AlertId>98</AlertId>
          <Headline>Single Service</Headline>
          <ImpactedService>
            <Service>
              <ServiceName>Pink</ServiceName>
            </Service>
          </ImpactedService>
        </Alert>
        <Alert>
          <AlertId>99</AlertId>
          <Headline>Single Alert</Headline>
          <ImpactedService>
            <Service>
              <ServiceName>Brown</ServiceName>
            </Service>
            <Service>
            </Service>
          </ImpactedService>
        </Alert>
        <Alert>
          <AlertId>100</AlertId>
          <Headline>No Services Alert</Headline>
          <ImpactedService></ImpactedService>
        </Alert>
      </CTAAlerts>`,
    })) as any);
    const singleAlerts = await singleXmlAdapter.getAlerts();
    expect(singleAlerts).toHaveLength(3);
    expect(singleAlerts[0].affectedRoutes).toEqual(['Pink']);
    expect(singleAlerts[1].affectedRoutes).toEqual(['Brown']);
    expect(singleAlerts[2].affectedRoutes).toBeUndefined();
  });


  it('should handle ctatt with no eta property', async () => {
    const mockFetch = (async () => ({
      ok: true,
      json: async () => ({ ctatt: {} }),
    })) as any;
    const adapter = new ChicagoCtaTransitAdapter(mockFetch, 'cta-test-key');
    const deps = await adapter.getDepartures('Jackson');
    expect(deps).toEqual([]);
  });

  it('should initialize CTA_TRAIN_API_KEY from process.env', async () => {
    const original = process.env.CTA_TRAIN_API_KEY;
    process.env.CTA_TRAIN_API_KEY = 'env-key-cta';
    const adapter = new ChicagoCtaTransitAdapter();
    expect((adapter as any).trainApiKey).toBe('env-key-cta');
    process.env.CTA_TRAIN_API_KEY = original;
  });
});

