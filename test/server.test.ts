import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createTransitMcpServer } from '../src/server.js';

describe('Transit MCP Server', () => {
  it('should expose all 5 required transit tools over MCP protocol', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((t) => t.name);

    expect(toolNames).toContain('list_supported_cities');
    expect(toolNames).toContain('list_routes');
    expect(toolNames).toContain('get_route_stops');
    expect(toolNames).toContain('get_departures');
    expect(toolNames).toContain('get_service_alerts');

    await client.close();
    await server.close();
  });

  it('should execute list_supported_cities tool', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({ name: 'list_supported_cities', arguments: {} });
    expect(res.isError).toBeFalsy();
    const text = (res.content[0] as any).text;
    const cities = JSON.parse(text);
    expect(cities).toHaveLength(5);
    expect(cities.map((c: any) => c.id)).toEqual(['msp', 'boston', 'sf_bart', 'chicago', 'portland']);

    await client.close();
    await server.close();
  });

  it('should execute list_routes tool for Chicago and filter', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: 'list_routes',
      arguments: { city: 'chicago', query: 'red' },
    });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.city).toBe('Chicago');
    expect(data.routes.some((r: any) => r.id === 'Red')).toBe(true);

    await client.close();
    await server.close();
  });

  it('should execute get_route_stops tool for Portland', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: 'get_route_stops',
      arguments: { city: 'portland', route_id: '100' },
    });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.total).toBeGreaterThan(0);

    await client.close();
    await server.close();
  });

  it('should execute get_departures tool for Chicago stop', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: 'get_departures',
      arguments: { city: 'chicago', stop_id: '40380' },
    });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.departures.length).toBeGreaterThan(0);

    await client.close();
    await server.close();
  });

  it('should execute get_service_alerts tool for Portland', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: 'get_service_alerts',
      arguments: { city: 'portland' },
    });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.alerts.length).toBeGreaterThan(0);

    await client.close();
    await server.close();
  });

  it('should return informative tool error on unknown city', async () => {
    const server = createTransitMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const res = await client.callTool({
      name: 'list_routes',
      arguments: { city: 'nowhere_city' },
    });
    expect(res.isError).toBe(true);
    expect((res.content[0] as any).text).toContain('Unsupported city "nowhere_city"');

    await client.close();
    await server.close();
  });
});
