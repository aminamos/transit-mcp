import { Command } from 'commander';
import pc from 'picocolors';
import { TransitRegistry } from './registry.js';
import { runStdioServer } from './server.js';

export function createCli(registry: TransitRegistry = new TransitRegistry()): Command {
  const program = new Command();

  program
    .name('transit')
    .description('Multi-city US Public Transit MCP Server & CLI')
    .version('1.0.0');

  // transit cities
  program
    .command('cities')
    .description('List all supported US transit cities and feature capabilities')
    .action(() => {
      const cities = registry.listSupportedCities();
      console.log(pc.bold(pc.cyan('\nSupported US Transit Cities:')));
      console.log(pc.gray('─'.repeat(70)));

      for (const city of cities) {
        console.log(
          `${pc.bold(pc.green(city.name))} ${pc.yellow(`[${city.id}]`)} (${pc.dim(city.agency)})`
        );
        console.log(`  ${pc.bold('State:')} ${city.state}`);
        console.log(`  ${pc.bold('Modes:')} ${city.modes.join(', ')}`);
        console.log(
          `  ${pc.bold('Features:')} Real-time: ${city.features.realtimeDepartures ? pc.green('Yes') : pc.red('No')}, Stops: ${city.features.routeStops ? pc.green('Yes') : pc.red('No')}, Alerts: ${city.features.serviceAlerts ? pc.green('Yes') : pc.red('No')}`
        );
        console.log(`  ${pc.bold('Aliases:')} ${city.aliases.join(', ')}`);
        console.log(`  ${pc.dim(city.notes)}`);
        console.log(pc.gray('─'.repeat(70)));
      }
    });

  // transit routes --city <city> [query]
  program
    .command('routes [query]')
    .description('List transit routes for a specific city')
    .requiredOption('-c, --city <city>', 'City identifier (e.g. msp, boston, sf_bart, chicago, portland, dc, atl, mia, bna, sf_muni, ac_transit, ride_on, fairfax_connector)')
    .action(async (query: string | undefined, options: { city: string }) => {
      try {
        const adapter = registry.getAdapter(options.city);
        console.log(pc.cyan(`\nFetching routes for ${adapter.info.name} (${adapter.info.agency})...`));
        const routes = await adapter.getRoutes(query);

        if (routes.length === 0) {
          console.log(pc.yellow(`No routes found matching query: "${query || ''}"`));
          return;
        }

        console.log(pc.bold(pc.green(`\nFound ${routes.length} route(s):`)));
        console.log(pc.gray('─'.repeat(75)));
        console.log(
          `${pc.bold('ID'.padEnd(10))} ${pc.bold('Type'.padEnd(12))} ${pc.bold('Name / Description')}`
        );
        console.log(pc.gray('─'.repeat(75)));

        for (const r of routes.slice(0, 50)) {
          const typeStr = (r.type || 'transit').toUpperCase().padEnd(12);
          const nameStr = r.longName ? `${r.shortName} - ${r.longName}` : r.shortName;
          console.log(`${pc.cyan(r.id.padEnd(10))} ${pc.dim(typeStr)} ${nameStr}`);
        }

        if (routes.length > 50) {
          console.log(pc.dim(`\n... and ${routes.length - 50} more routes. Use query to filter.`));
        }
        console.log();
      } catch (err: any) {
        console.error(pc.red(`\nError: ${err.message}\n`));
        process.exitCode = 1;
      }
    });

  // transit departures --city <city> <stop>
  program
    .command('departures <stop>')
    .description('Get real-time departures and live countdowns for a stop or station')
    .requiredOption('-c, --city <city>', 'City identifier (e.g. msp, boston, sf_bart, chicago, portland, dc, atl, mia, bna, sf_muni, ac_transit, ride_on, fairfax_connector)')
    .action(async (stop: string, options: { city: string }) => {
      try {
        const adapter = registry.getAdapter(options.city);
        console.log(
          pc.cyan(`\nFetching real-time departures for "${stop}" in ${adapter.info.name}...`)
        );
        const deps = await adapter.getDepartures(stop);

        if (deps.length === 0) {
          console.log(pc.yellow(`No upcoming departures found for stop "${stop}".`));
          return;
        }

        console.log(pc.bold(pc.green(`\nDepartures for ${deps[0].stopName || stop}:`)));
        console.log(pc.gray('─'.repeat(80)));
        console.log(
          `${pc.bold('Route'.padEnd(14))} ${pc.bold('Destination'.padEnd(28))} ${pc.bold('Countdown'.padEnd(14))} ${pc.bold('Status')}`
        );
        console.log(pc.gray('─'.repeat(80)));

        for (const d of deps) {
          const countdown =
            typeof d.countdownMinutes === 'number'
              ? `${d.countdownMinutes} min`
              : String(d.countdownMinutes);
          const countdownColored =
            d.countdownMinutes === 0 || d.countdownMinutes === 'Due' || d.countdownMinutes === 'Approaching'
              ? pc.bold(pc.yellow(countdown.padEnd(14)))
              : pc.green(countdown.padEnd(14));

          const statusColored = d.status?.toLowerCase().includes('delayed')
            ? pc.red(d.status)
            : pc.dim(d.status || (d.isRealtime ? 'Live' : 'Scheduled'));

          console.log(
            `${pc.cyan(d.routeShortName.padEnd(14))} ${d.destination.slice(0, 26).padEnd(28)} ${countdownColored} ${statusColored}`
          );
        }
        console.log();
      } catch (err: any) {
        console.error(pc.red(`\nError: ${err.message}\n`));
        process.exitCode = 1;
      }
    });

  // transit alerts --city <city> [route]
  program
    .command('alerts [route]')
    .description('Get active transit service alerts, detours, and disruptions')
    .requiredOption('-c, --city <city>', 'City identifier (e.g. msp, boston, sf_bart, chicago, portland, dc, atl, mia, bna, sf_muni, ac_transit, ride_on, fairfax_connector)')
    .action(async (route: string | undefined, options: { city: string }) => {
      try {
        const adapter = registry.getAdapter(options.city);
        console.log(pc.cyan(`\nFetching service alerts for ${adapter.info.name}...`));
        const alerts = await adapter.getAlerts(route);

        if (alerts.length === 0) {
          console.log(pc.green(`No active service disruptions reported for ${adapter.info.name}.\n`));
          return;
        }

        console.log(pc.bold(pc.yellow(`\nFound ${alerts.length} active alert(s):`)));
        console.log(pc.gray('─'.repeat(80)));

        for (const a of alerts) {
          const badge =
            a.severity === 'severe'
              ? pc.bgRed(pc.white(' SEVERE '))
              : a.severity === 'warning'
              ? pc.bgYellow(pc.black(' WARNING '))
              : pc.bgCyan(pc.black(' INFO '));

          console.log(`${badge} ${pc.bold(a.header)}`);
          if (a.affectedRoutes && a.affectedRoutes.length > 0) {
            console.log(`  ${pc.bold('Affected Routes:')} ${pc.yellow(a.affectedRoutes.join(', '))}`);
          }
          console.log(`  ${a.description}`);
          if (a.url) {
            console.log(`  ${pc.dim('More info: ' + a.url)}`);
          }
          console.log(pc.gray('─'.repeat(80)));
        }
        console.log();
      } catch (err: any) {
        console.error(pc.red(`\nError: ${err.message}\n`));
        process.exitCode = 1;
      }
    });

  // transit mcp
  program
    .command('mcp')
    .description('Run as a Model Context Protocol (MCP) server over stdio')
    .action(async () => {
      await runStdioServer(registry);
    });

  return program;
}
