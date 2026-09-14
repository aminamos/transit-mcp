import { describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';

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
});
