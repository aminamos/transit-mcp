import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as indexExports from '../src/index.js';
import * as serverModule from '../src/server.js';
import * as cliModule from '../src/cli.js';

describe('src/index.ts', () => {
  const originalArgv = [...process.argv];
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });

  it('should export all public modules, types, adapters, and functions', () => {
    expect(indexExports.TransitRegistry).toBeDefined();
    expect(indexExports.createTransitMcpServer).toBeDefined();
    expect(indexExports.runStdioServer).toBeDefined();
    expect(indexExports.createCli).toBeDefined();
    expect(indexExports.MspTransitAdapter).toBeDefined();
    expect(indexExports.BostonMbtaTransitAdapter).toBeDefined();
    expect(indexExports.SfBartTransitAdapter).toBeDefined();
    expect(indexExports.ChicagoCtaTransitAdapter).toBeDefined();
    expect(indexExports.PortlandTriMetTransitAdapter).toBeDefined();
    expect(indexExports.SUPPORTED_CITY_IDS).toBeDefined();
    expect(indexExports.main).toBeDefined();
  });

  it('should invoke runStdioServer when wantsMcp is true (!isTTY)', async () => {
    process.argv = ['node', 'transit'];
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    const stdioSpy = vi.spyOn(serverModule, 'runStdioServer').mockResolvedValue(undefined);

    await indexExports.main();

    expect(stdioSpy).toHaveBeenCalled();
  });

  it('should invoke runStdioServer when binary name ends with transit-mcp', async () => {
    process.argv = ['node', '/usr/local/bin/transit-mcp'];
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    const stdioSpy = vi.spyOn(serverModule, 'runStdioServer').mockResolvedValue(undefined);

    await indexExports.main();

    expect(stdioSpy).toHaveBeenCalled();
  });

  it('should parse CLI options when CLI arguments are passed', async () => {
    process.argv = ['node', 'transit', 'cities'];
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    const mockCli = {
      parseAsync: vi.fn().mockResolvedValue(undefined),
    };
    const cliSpy = vi.spyOn(cliModule, 'createCli').mockReturnValue(mockCli as any);

    await indexExports.main();

    expect(cliSpy).toHaveBeenCalled();
    expect(mockCli.parseAsync).toHaveBeenCalledWith(process.argv);
  });

  it('should handle falsy process.argv[1]', async () => {
    process.argv = ['node'];
    (process.argv as any)[1] = undefined;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    const mockCli = {
      parseAsync: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(cliModule, 'createCli').mockReturnValue(mockCli as any);

    await indexExports.main();
    expect(mockCli.parseAsync).toHaveBeenCalled();
  });

  it('should propagate errors from main', async () => {
    process.argv = ['node', 'transit'];
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    vi.spyOn(serverModule, 'runStdioServer').mockRejectedValue(new Error('Test server failure'));

    await expect(indexExports.main()).rejects.toThrow('Test server failure');
  });
});
