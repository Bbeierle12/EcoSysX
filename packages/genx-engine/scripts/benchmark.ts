// Performance Benchmark Script for Genesis Engine Providers
import { GenesisEngine } from '../src/engine.js';
import { EngineConfigV1 } from '../src/types.js';

const PROVIDER = process.env.PROVIDER || 'mesa';
const POPULATION_SIZE = parseInt(process.env.POPULATION_SIZE || '100');
const PROVIDER_IMAGE = process.env.PROVIDER_IMAGE || 'genx-test-sidecar:latest';
const BENCHMARK_STEPS = 50;

interface BenchmarkResult {
  provider: string;
  populationSize: number;
  totalSteps: number;
  totalTime: number;
  stepTimes: number[];
  averageStepTime: number;
  minStepTime: number;
  maxStepTime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  throughput: {
    stepsPerSecond: number;
    agentStepsPerSecond: number;
  };
}

function createBenchmarkConfig(populationSize: number): EngineConfigV1 {
  return {
    schema: "GENX_CFG_V1",
    simulation: {
      populationSize,
      worldSize: Math.ceil(Math.sqrt(populationSize) * 2), // Scale world with population
      maxSteps: BENCHMARK_STEPS,
      enableDisease: true,
      enableReproduction: false,
      enableEnvironment: true
    },
    agents: {
      initialEnergy: { min: 50, max: 100 },
      energyConsumption: { min: 1, max: 3 },
      reproductionThreshold: 80,
      deathThreshold: 0,
      movementSpeed: { min: 0.5, max: 2.0 }
    },
    disease: {
      initialInfectionRate: 0.1,
      transmissionRate: 0.15,
      recoveryTime: 20,
      contactRadius: 2.0
    },
    environment: {
      resourceDensity: 0.3,
      resourceRegenRate: 0.05,
      enableSeasons: false,
      enableWeather: false
    },
    rng: {
      masterSeed: "benchmark-seed-2024",
      streams: {
        movement: true,
        disease: true,
        births: true,
        mutation: true,
        llm: false
      }
    }
  };
}

async function runBenchmark(): Promise<BenchmarkResult> {
  const config = createBenchmarkConfig(POPULATION_SIZE);
  const engine = new GenesisEngine();
  const stepTimes: number[] = [];
  
  try {
    console.log(`Starting benchmark for ${PROVIDER} with ${POPULATION_SIZE} agents...`);
    
    // Initialize timing
    const initStart = Date.now();
    await engine.start(config, {
      provider: PROVIDER as any,
      sidecarImages: { [PROVIDER]: PROVIDER_IMAGE }
    });
    const initTime = Date.now() - initStart;
    console.log(`Initialization took ${initTime}ms`);
    
    // Warmup - run a few steps to stabilize performance
    console.log('Running warmup steps...');
    for (let i = 0; i < 5; i++) {
      await engine.step();
    }
    
    // Main benchmark
    console.log(`Running ${BENCHMARK_STEPS} benchmark steps...`);
    const benchmarkStart = Date.now();
    
    for (let step = 0; step < BENCHMARK_STEPS; step++) {
      const stepStart = process.hrtime.bigint();
      await engine.step();
      const stepEnd = process.hrtime.bigint();
      
      const stepTimeMs = Number(stepEnd - stepStart) / 1000000; // Convert nanoseconds to milliseconds
      stepTimes.push(stepTimeMs);
      
      if ((step + 1) % 10 === 0) {
        console.log(`Completed ${step + 1}/${BENCHMARK_STEPS} steps`);
      }
    }
    
    const benchmarkEnd = Date.now();
    const totalTime = benchmarkEnd - benchmarkStart;
    
    // Collect memory usage
    const memUsage = process.memoryUsage();
    
    // Calculate statistics
    const averageStepTime = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
    const minStepTime = Math.min(...stepTimes);
    const maxStepTime = Math.max(...stepTimes);
    
    const stepsPerSecond = 1000 / averageStepTime;
    const agentStepsPerSecond = stepsPerSecond * POPULATION_SIZE;
    
    const result: BenchmarkResult = {
      provider: PROVIDER,
      populationSize: POPULATION_SIZE,
      totalSteps: BENCHMARK_STEPS,
      totalTime,
      stepTimes,
      averageStepTime,
      minStepTime,
      maxStepTime,
      memoryUsage: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      throughput: {
        stepsPerSecond,
        agentStepsPerSecond
      }
    };
    
    return result;
    
  } finally {
    await engine.stop();
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function printResults(result: BenchmarkResult): void {
  console.log('\n=== BENCHMARK RESULTS ===');
  console.log(`Provider: ${result.provider}`);
  console.log(`Population Size: ${result.populationSize}`);
  console.log(`Total Steps: ${result.totalSteps}`);
  console.log(`Total Time: ${result.totalTime}ms`);
  console.log(`\nStep Performance:`);
  console.log(`  Average Step Time: ${result.averageStepTime.toFixed(2)}ms`);
  console.log(`  Min Step Time: ${result.minStepTime.toFixed(2)}ms`);
  console.log(`  Max Step Time: ${result.maxStepTime.toFixed(2)}ms`);
  console.log(`\nThroughput:`);
  console.log(`  Steps/Second: ${result.throughput.stepsPerSecond.toFixed(2)}`);
  console.log(`  Agent-Steps/Second: ${result.throughput.agentStepsPerSecond.toFixed(0)}`);
  console.log(`\nMemory Usage:`);
  console.log(`  RSS: ${formatBytes(result.memoryUsage.rss)}`);
  console.log(`  Heap Used: ${formatBytes(result.memoryUsage.heapUsed)}`);
  console.log(`  Heap Total: ${formatBytes(result.memoryUsage.heapTotal)}`);
  console.log(`  External: ${formatBytes(result.memoryUsage.external)}`);
  
  // Calculate percentiles
  const sortedTimes = [...result.stepTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  console.log(`\nStep Time Percentiles:`);
  console.log(`  P50: ${p50.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
}

async function main(): Promise<void> {
  try {
    const result = await runBenchmark();
    printResults(result);
    
    // Write results to file
    const outputFile = 'benchmark-results.json';
    const fs = await import('fs');
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\nResults written to ${outputFile}`);
    
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run benchmark if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runBenchmark, BenchmarkResult };