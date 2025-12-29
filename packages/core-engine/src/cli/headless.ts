#!/usr/bin/env node
/**
 * headless.ts - CLI for running simulations without rendering
 *
 * Usage:
 *   npx tsx src/cli/headless.ts [options]
 *
 * Options:
 *   --ticks <n>       Number of ticks to run (default: 1000)
 *   --seed <n>        Random seed for determinism
 *   --preset <name>   Use a preset configuration
 *   --population <n>  Initial population
 *   --json            Output results as JSON
 *   --verify          Run twice and verify determinism
 *   --quiet           Suppress progress output
 */

import {
  runHeadlessSync,
  verifyDeterminism,
  HeadlessProgress,
  HeadlessResult,
} from '../simulation/HeadlessRunner';
import { getPreset, listPresets, PresetName } from '../presets/SimulationPresets';

interface CLIOptions {
  ticks: number;
  seed?: number;
  preset: PresetName;
  population?: number;
  json: boolean;
  verify: boolean;
  quiet: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    ticks: 1000,
    preset: 'medium',
    json: false,
    verify: false,
    quiet: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--ticks':
      case '-t':
        options.ticks = parseInt(args[++i], 10);
        break;
      case '--seed':
      case '-s':
        options.seed = parseInt(args[++i], 10);
        break;
      case '--preset':
      case '-p':
        options.preset = args[++i] as PresetName;
        break;
      case '--population':
      case '-n':
        options.population = parseInt(args[++i], 10);
        break;
      case '--json':
      case '-j':
        options.json = true;
        break;
      case '--verify':
      case '-v':
        options.verify = true;
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      case '--list-presets':
        console.log('Available presets:', listPresets().join(', '));
        process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
GenesisX Headless Simulation Runner

Usage:
  npx tsx src/cli/headless.ts [options]

Options:
  -t, --ticks <n>       Number of ticks to run (default: 1000)
  -s, --seed <n>        Random seed for deterministic execution
  -p, --preset <name>   Use a preset configuration (default: medium)
  -n, --population <n>  Initial population
  -j, --json            Output results as JSON
  -v, --verify          Run twice and verify determinism
  -q, --quiet           Suppress progress output
  --list-presets        List available presets
  -h, --help            Show this help message

Examples:
  npx tsx src/cli/headless.ts --ticks 5000 --preset survival
  npx tsx src/cli/headless.ts --seed 12345 --verify
  npx tsx src/cli/headless.ts --ticks 10000 --json > results.json
`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

function printProgress(progress: HeadlessProgress): void {
  const bar = '█'.repeat(Math.floor(progress.percentComplete / 2)) +
              '░'.repeat(50 - Math.floor(progress.percentComplete / 2));

  process.stdout.write(
    `\r[${bar}] ${progress.percentComplete.toFixed(1)}% | ` +
    `Tick ${progress.currentTick}/${progress.maxTicks} | ` +
    `Pop: ${progress.population} | ` +
    `${progress.ticksPerSecond.toFixed(0)} TPS | ` +
    `${formatDuration(progress.elapsedMs)}`
  );
}

function printResult(result: HeadlessResult, options: CLIOptions): void {
  if (options.json) {
    console.log(JSON.stringify({
      ticksCompleted: result.ticksCompleted,
      elapsedMs: result.elapsedMs,
      averageTicksPerSecond: result.averageTicksPerSecond,
      stopReason: result.stopReason,
      seed: result.seed,
      stateHash: result.stateHash,
      statistics: result.statistics,
    }, null, 2));
    return;
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  SIMULATION COMPLETE');
  console.log('═'.repeat(60));
  console.log();
  console.log(`  Ticks completed: ${result.ticksCompleted.toLocaleString()}`);
  console.log(`  Stop reason:     ${result.stopReason}`);
  console.log(`  Runtime:         ${formatDuration(result.elapsedMs)}`);
  console.log(`  Average TPS:     ${result.averageTicksPerSecond.toFixed(1)}`);
  console.log(`  Seed:            ${result.seed}`);
  console.log(`  State hash:      ${result.stateHash}`);
  console.log();
  console.log('─'.repeat(60));
  console.log('  STATISTICS');
  console.log('─'.repeat(60));
  const stats = result.statistics;
  console.log(`  Final population:   ${stats.currentTick > 0 ? 'See agent manager' : 0}`);
  console.log(`  Total births:       ${stats.totalBirths.toLocaleString()}`);
  console.log(`  Total deaths:       ${stats.totalDeaths.toLocaleString()}`);
  console.log(`  Food consumed:      ${stats.totalFoodConsumed.toLocaleString()}`);
  console.log();
  console.log('═'.repeat(60));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Get preset config
  let simulationConfig = getPreset(options.preset);

  // Apply overrides
  if (options.population !== undefined) {
    if (!simulationConfig.agents) simulationConfig.agents = {};
    simulationConfig.agents.initialPopulation = options.population;
  }

  if (!options.quiet) {
    console.log('GenesisX Headless Simulation');
    console.log('─'.repeat(40));
    console.log(`Preset:     ${options.preset}`);
    console.log(`Max ticks:  ${options.ticks.toLocaleString()}`);
    console.log(`Seed:       ${options.seed ?? 'random'}`);
    console.log();
  }

  if (options.verify) {
    // Run determinism verification
    if (!options.quiet) {
      console.log('Running determinism verification (2 runs)...');
    }

    const verification = await verifyDeterminism({
      simulation: simulationConfig,
      seed: options.seed ?? 12345,
      maxTicks: options.ticks,
      progressInterval: options.quiet ? 0 : 100,
    });

    if (options.json) {
      console.log(JSON.stringify({
        deterministic: verification.deterministic,
        differences: verification.differences,
        results: verification.results.map(r => ({
          ticksCompleted: r.ticksCompleted,
          stateHash: r.stateHash,
          stopReason: r.stopReason,
        })),
      }, null, 2));
    } else {
      console.log('\n');
      console.log('═'.repeat(60));
      console.log('  DETERMINISM VERIFICATION');
      console.log('═'.repeat(60));
      console.log();
      console.log(`  Result: ${verification.deterministic ? '✓ DETERMINISTIC' : '✗ NON-DETERMINISTIC'}`);
      console.log();

      if (verification.differences.length > 0) {
        console.log('  Differences found:');
        verification.differences.forEach(d => console.log(`    ${d}`));
      } else {
        console.log('  All runs produced identical results.');
        console.log(`  State hash: ${verification.results[0].stateHash}`);
      }
      console.log();
      console.log('═'.repeat(60));
    }

    process.exit(verification.deterministic ? 0 : 1);
  }

  // Run single simulation
  const result = runHeadlessSync(
    {
      simulation: simulationConfig,
      seed: options.seed,
      maxTicks: options.ticks,
      progressInterval: options.quiet ? 0 : 100,
    },
    options.quiet ? undefined : printProgress
  );

  printResult(result, options);

  if (result.error) {
    console.error('Error:', result.error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
