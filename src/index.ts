#!/usr/bin/env node

import { createCli } from './cli.js';
import { runStdioServer } from './server.js';

export * from './types.js';
export * from './registry.js';
export * from './server.js';
export * from './cli.js';
export * from './cities/msp.js';
export * from './cities/boston.js';
export * from './cities/sf_bart.js';
export * from './cities/chicago.js';
export * from './cities/portland.js';

async function main() {
  const args = process.argv.slice(2);
  const isBinaryMcp = process.argv[1] && process.argv[1].endsWith('transit-mcp');
  const wantsMcp = args.length === 0 && (!process.stdin.isTTY || isBinaryMcp);

  if (wantsMcp) {
    await runStdioServer();
    return;
  }

  const cli = createCli();
  await cli.parseAsync(process.argv);
}

// Only execute main if this file is run as the direct script
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('dist/index.js') ||
  process.argv[1]?.includes('dist\\index.js')
) {
  main().catch((err) => {
    console.error('Transit MCP error:', err);
    process.exit(1);
  });
}
