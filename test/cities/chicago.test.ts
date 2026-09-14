import { describe, expect, it } from 'vitest';
import { ChicagoCtaTransitAdapter } from '../../src/cities/chicago.js';

describe('ChicagoCtaTransitAdapter', () => {
  it('should list Chicago L lines and buses', async () => {
    const adapter = new ChicagoCtaTransitAdapter();
    const routes = await adapter.getRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(8);
    const redLine = routes.find((r) => r.id === 'Red');
    expect(redLine).toBeDefined();
    expect(redLine?.type).toBe('subway');

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
});
