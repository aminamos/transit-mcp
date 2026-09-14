import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TransitRegistry } from './registry.js';

export function createTransitMcpServer(customRegistry?: TransitRegistry): McpServer {
  const registry = customRegistry || new TransitRegistry();
  const server = new McpServer({
    name: 'transit-mcp',
    version: '1.0.0',
  });

  // 1. list_supported_cities
  server.tool(
    'list_supported_cities',
    'Lists all supported US transit cities, transit agencies, modes, and feature capabilities.',
    {},
    async () => {
      try {
        const cities = registry.listSupportedCities();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cities, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing cities: ${error.message}` }],
        };
      }
    }
  );

  // 2. list_routes
  server.tool(
    'list_routes',
    'Lists public transit routes/lines for a supported city with optional search filtering.',
    {
      city: z.string().describe("City identifier or alias (e.g. 'msp', 'boston', 'sf_bart', 'chicago', 'portland')"),
      query: z.string().optional().describe("Optional search query (e.g. 'Red', 'Blue', 'Green', '66')"),
    },
    async ({ city, query }) => {
      try {
        const adapter = registry.getAdapter(city);
        const routes = await adapter.getRoutes(query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  city: adapter.info.name,
                  agency: adapter.info.agency,
                  total: routes.length,
                  routes,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error fetching routes for ${city}: ${error.message}` }],
        };
      }
    }
  );

  // 3. get_route_stops
  server.tool(
    'get_route_stops',
    'Retrieves stops and stations along a specific transit route in a supported city.',
    {
      city: z.string().describe("City identifier or alias (e.g. 'msp', 'boston', 'sf_bart', 'chicago', 'portland')"),
      route_id: z.string().describe("Route or line identifier (e.g. '901', 'Red', '12')"),
      direction: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional direction (e.g. '0', '1', 'Northbound', 'Inbound')"),
    },
    async ({ city, route_id, direction }) => {
      try {
        const adapter = registry.getAdapter(city);
        const stops = await adapter.getStops(route_id, direction);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  city: adapter.info.name,
                  routeId: route_id,
                  direction: direction ?? 'default',
                  total: stops.length,
                  stops,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error fetching stops for route ${route_id} in ${city}: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // 4. get_departures
  server.tool(
    'get_departures',
    'Gets real-time departures, live countdown minutes, platform, delay, and status for a stop or station.',
    {
      city: z.string().describe("City identifier or alias (e.g. 'msp', 'boston', 'sf_bart', 'chicago', 'portland')"),
      stop_id: z
        .string()
        .describe(
          "Stop ID, place code, or station name (e.g. '51405' / 'MAAM' for MSP, 'place-sstat' / 'Alewife' for Boston, 'EMBR' / 'Embarcadero' for BART, '40380' / 'Clark/Lake' for CTA, '8334' / 'Pioneer Courthouse Square' for TriMet)"
        ),
    },
    async ({ city, stop_id }) => {
      try {
        const adapter = registry.getAdapter(city);
        const departures = await adapter.getDepartures(stop_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  city: adapter.info.name,
                  agency: adapter.info.agency,
                  stopId: stop_id,
                  total: departures.length,
                  departures,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error fetching departures for stop ${stop_id} in ${city}: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  // 5. get_service_alerts
  server.tool(
    'get_service_alerts',
    'Retrieves real-time transit service alerts, disruptions, construction advisories, and delays.',
    {
      city: z.string().describe("City identifier or alias (e.g. 'msp', 'boston', 'sf_bart', 'chicago', 'portland')"),
      route_id: z.string().optional().describe("Optional route or line to filter alerts (e.g. '901', 'Red', 'Blue')"),
    },
    async ({ city, route_id }) => {
      try {
        const adapter = registry.getAdapter(city);
        const alerts = await adapter.getAlerts(route_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  city: adapter.info.name,
                  agency: adapter.info.agency,
                  filterRoute: route_id || 'all',
                  total: alerts.length,
                  alerts,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error fetching service alerts for ${city}: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

export async function runStdioServer(registry?: TransitRegistry): Promise<void> {
  const server = createTransitMcpServer(registry);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Transit MCP Server running on stdio');
}
