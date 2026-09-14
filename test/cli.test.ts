import { describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';
import { TransitRegistry } from '../src/registry.js';

describe('Transit CLI', () => {
  it('should configure all required CLI commands', () => {
    const cli = createCli();
    const commandNames = cli.commands.map((c) => c.name());

    expect(commandNames).toContain('cities');
    expect(commandNames).toContain('routes');
    expect(commandNames).toContain('departures');
    expect(commandNames).toContain('alerts');
    expect(commandNames).toContain('mcp');
  });

  it('should run transit cities without error', async () => {
    const cli = createCli();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 'transit', 'cities']);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should run transit routes --city chicago', async () => {
    const cli = createCli();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 'transit', 'routes', '--city', 'chicago', 'Red']);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should run transit departures --city portland 8334', async () => {
    const cli = createCli();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 'transit', 'departures', '--city', 'portland', '8334']);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should run transit alerts --city portland', async () => {
    const cli = createCli();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 'transit', 'alerts', '--city', 'portland']);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle routes with no matches, truncated list, and errors', async () => {
    const customRegistry = new TransitRegistry();
    const mockAdapter = {
      info: {
        id: 'testcity',
        name: 'Test City',
        agency: 'Test Agency',
        state: 'TC',
        modes: ['Bus'],
        features: { realtimeDepartures: true, routeStops: true, serviceAlerts: true, requiresApiKey: false },
        notes: 'Testing',
        aliases: ['tc'],
      },
      getRoutes: vi.fn(),
      getStops: vi.fn(),
      getDepartures: vi.fn(),
      getAlerts: vi.fn(),
    };
    customRegistry.register(mockAdapter as any);

    const cli = createCli(customRegistry);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. No routes found with query
    mockAdapter.getRoutes.mockResolvedValueOnce([]);
    await cli.parseAsync(['node', 'transit', 'routes', '--city', 'testcity', 'GhostRoute']);
    expect(consoleSpy).toHaveBeenCalled();

    // 1b. No routes found without query
    mockAdapter.getRoutes.mockResolvedValueOnce([]);
    await cli.parseAsync(['node', 'transit', 'routes', '--city', 'testcity']);
    expect(consoleSpy).toHaveBeenCalled();

    // 2. More than 50 routes, with varied type and longName
    const lotsOfRoutes: any[] = [];
    for (let i = 0; i < 55; i++) {
      lotsOfRoutes.push({
        id: `R${i}`,
        shortName: `Route ${i}`,
        longName: i % 2 === 0 ? `Long ${i}` : undefined,
        type: i % 3 === 0 ? undefined : 'bus',
        agency: 'Test',
      });
    }
    mockAdapter.getRoutes.mockResolvedValueOnce(lotsOfRoutes);
    await cli.parseAsync(['node', 'transit', 'routes', '--city', 'testcity']);
    expect(consoleSpy).toHaveBeenCalled();

    // 3. Error branch in routes
    mockAdapter.getRoutes.mockRejectedValueOnce(new Error('Routes failed'));
    const prevExitCode = process.exitCode;
    await cli.parseAsync(['node', 'transit', 'routes', '--city', 'testcity']);
    expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Routes failed'));
    process.exitCode = prevExitCode;

    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();
  });

  it('should print No for false features in transit cities', async () => {
    const customRegistry = new TransitRegistry();
    const mockAdapter = {
      info: {
        id: 'barecity',
        name: 'Bare City',
        agency: 'Bare Agency',
        state: 'BC',
        modes: ['Bus'],
        features: { realtimeDepartures: false, routeStops: false, serviceAlerts: false, requiresApiKey: false },
        notes: 'Testing features',
        aliases: ['bc'],
      },
      getRoutes: vi.fn(),
      getStops: vi.fn(),
      getDepartures: vi.fn(),
      getAlerts: vi.fn(),
    };
    customRegistry.register(mockAdapter as any);
    const cli = createCli(customRegistry);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await cli.parseAsync(['node', 'transit', 'cities']);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle departures with empty list, diverse statuses/countdowns, and error', async () => {
    const customRegistry = new TransitRegistry();
    const mockAdapter = {
      info: {
        id: 'depcity',
        name: 'Dep City',
        agency: 'Dep Agency',
        state: 'DC',
        modes: ['Train'],
        features: { realtimeDepartures: true, routeStops: true, serviceAlerts: true, requiresApiKey: false },
        notes: 'Testing',
        aliases: ['dc'],
      },
      getRoutes: vi.fn(),
      getStops: vi.fn(),
      getDepartures: vi.fn(),
      getAlerts: vi.fn(),
    };
    customRegistry.register(mockAdapter as any);

    const cli = createCli(customRegistry);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. Empty departures
    mockAdapter.getDepartures.mockResolvedValueOnce([]);
    await cli.parseAsync(['node', 'transit', 'departures', '--city', 'depcity', 'Stop1']);
    expect(consoleSpy).toHaveBeenCalled();

    // 2. Departures where first stopName is undefined (tests deps[0].stopName || stop)
    mockAdapter.getDepartures.mockResolvedValueOnce([
      {
        routeId: '1',
        routeShortName: 'R1',
        destination: 'North Terminal Destination Very Long Indeed',
        departureTime: '2026-09-13T20:00:00Z',
        countdownMinutes: 0,
        isRealtime: true,
        status: 'Delayed 10m',
        stopId: 'Stop1',
        stopName: undefined,
      },
      {
        routeId: '2',
        routeShortName: 'R2',
        destination: 'South Terminal',
        departureTime: '2026-09-13T20:05:00Z',
        countdownMinutes: 'Due',
        isRealtime: true,
        status: undefined, // fallback to 'Live'
        stopId: 'Stop1',
      },
      {
        routeId: '3',
        routeShortName: 'R3',
        destination: 'East Terminal',
        departureTime: '2026-09-13T20:10:00Z',
        countdownMinutes: 'Approaching',
        isRealtime: false,
        status: undefined, // fallback to 'Scheduled'
        stopId: 'Stop1',
      },
      {
        routeId: '4',
        routeShortName: 'R4',
        destination: 'West Terminal',
        departureTime: '2026-09-13T20:15:00Z',
        countdownMinutes: 15,
        isRealtime: true,
        status: 'On time',
        stopId: 'Stop1',
      },
    ]);
    await cli.parseAsync(['node', 'transit', 'departures', '--city', 'depcity', 'Stop1']);
    expect(consoleSpy).toHaveBeenCalled();


    // 3. Error branch in departures
    mockAdapter.getDepartures.mockRejectedValueOnce(new Error('Departures exploded'));
    const prevExitCode = process.exitCode;
    await cli.parseAsync(['node', 'transit', 'departures', '--city', 'depcity', 'Stop1']);
    expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Departures exploded'));
    process.exitCode = prevExitCode;

    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();
  });

  it('should handle alerts with empty list, diverse severities, urls, and error', async () => {
    const customRegistry = new TransitRegistry();
    const mockAdapter = {
      info: {
        id: 'alertcity',
        name: 'Alert City',
        agency: 'Alert Agency',
        state: 'AC',
        modes: ['Bus'],
        features: { realtimeDepartures: true, routeStops: true, serviceAlerts: true, requiresApiKey: false },
        notes: 'Testing',
        aliases: ['ac'],
      },
      getRoutes: vi.fn(),
      getStops: vi.fn(),
      getDepartures: vi.fn(),
      getAlerts: vi.fn(),
    };
    customRegistry.register(mockAdapter as any);

    const cli = createCli(customRegistry);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. Empty alerts
    mockAdapter.getAlerts.mockResolvedValueOnce([]);
    await cli.parseAsync(['node', 'transit', 'alerts', '--city', 'alertcity']);
    expect(consoleSpy).toHaveBeenCalled();

    // 2. Alerts with severe, warning, info, urls, affectedRoutes
    mockAdapter.getAlerts.mockResolvedValueOnce([
      {
        id: 'A1',
        header: 'Major Collision',
        description: 'Track closed',
        severity: 'severe',
        affectedRoutes: ['R1', 'R2'],
        url: 'https://example.com/alert1',
      },
      {
        id: 'A2',
        header: 'Moderate Delay',
        description: 'Signal problem',
        severity: 'warning',
        affectedRoutes: [],
      },
      {
        id: 'A3',
        header: 'Elevator Maintenance',
        description: 'Use escalator',
        severity: 'info',
      },
      {
        id: 'A4',
        header: 'Other notice',
        description: 'Info notice',
        severity: 'unknown',
      },
    ]);
    await cli.parseAsync(['node', 'transit', 'alerts', '--city', 'alertcity', 'R1']);
    expect(consoleSpy).toHaveBeenCalled();

    // 3. Error branch in alerts
    mockAdapter.getAlerts.mockRejectedValueOnce(new Error('Alerts failed'));
    const prevExitCode = process.exitCode;
    await cli.parseAsync(['node', 'transit', 'alerts', '--city', 'alertcity']);
    expect(consoleErrSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Alerts failed'));
    process.exitCode = prevExitCode;

    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();
  });

  it('should run transit mcp command', async () => {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
    const connectSpy = vi.spyOn(McpServer.prototype, 'connect').mockResolvedValue(undefined);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const cli = createCli();
    await cli.parseAsync(['node', 'transit', 'mcp']);

    expect(connectSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Transit MCP Server running on stdio');

    connectSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
