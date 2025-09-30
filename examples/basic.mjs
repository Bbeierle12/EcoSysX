import { GenesisEngine, createDefaultConfig } from '../packages/genx-engine/dist/index.js';

/**
 * Basic Genesis Engine Example
 * 
 * Demonstrates running a simple ecosystem simulation with different providers
 */
async function basicExample() {
    const engine = new GenesisEngine();
    
    // Create configuration
    const config = createDefaultConfig();
    config.simulation.populationSize = 200;
    config.simulation.worldSize = 50;
    config.disease.initialInfectionRate = 0.1;
    
    // Event monitoring
    engine.on('started', ({ provider }) => {
        console.log(`✅ Started simulation with ${provider} provider`);
    });
    
    engine.on('stepped', ({ newTick }) => {
        if (newTick % 10 === 0) {
            console.log(`⏱️  Step ${newTick} completed`);
        }
    });
    
    engine.on('error', ({ phase, error }) => {
        console.error(`❌ Error during ${phase}:`, error.message);
    });
    
    try {
        // Try Mesa provider first
        console.log('🔬 Attempting to start Mesa provider...');
        await engine.start(config, { provider: 'mesa' });
        
        // Run simulation
        for (let i = 0; i < 50; i++) {
            await engine.step(1);
            
            // Take snapshot every 10 steps
            if (i % 10 === 0) {
                const snapshot = await engine.snapshot('metrics');
                const { pop, sir, energyMean } = snapshot.metrics;
                console.log(`📊 Tick ${snapshot.tick}: ${pop} agents, SIR(${sir.S},${sir.I},${sir.R}), Energy: ${energyMean.toFixed(1)}`);
            }
        }
        
        // Final snapshot
        const finalSnapshot = await engine.snapshot('full');
        console.log('🎯 Final state:', {
            tick: finalSnapshot.tick,
            population: finalSnapshot.metrics.pop,
            sir: finalSnapshot.metrics.sir,
            buildHash: finalSnapshot.buildHash,
            simDigest: finalSnapshot.simDigest.substring(0, 8) + '...'
        });
        
        await engine.stop();
        console.log('✅ Simulation completed successfully');
        
    } catch (error) {
        console.log('⚠️  Mesa provider not available, trying Agents.jl...');
        
        try {
            await engine.start(config, { provider: 'agentsjl' });
            console.log('✅ Agents.jl provider started successfully');
            await engine.stop();
        } catch (error2) {
            console.log('⚠️  Agents.jl provider not available, trying MASON...');
            
            try {
                await engine.start(config, { provider: 'mason' });
                console.log('✅ MASON provider started successfully');
                await engine.stop();
            } catch (error3) {
                console.log('ℹ️  No providers available (requires Docker containers)');
                console.log('   This is expected in development environment');
                console.log('   Build sidecar containers to test providers');
            }
        }
    }
}

/**
 * Provider Comparison Example
 * 
 * Shows differences between simulation providers
 */
function providerComparison() {
    console.log('\n🔍 Provider Comparison:');
    
    const providers = GenesisEngine.getAvailableProviders();
    console.log('Available providers:', providers);
    
    const comparison = GenesisEngine.getProviderComparison();
    
    for (const [name, info] of Object.entries(comparison)) {
        console.log(`\n${name.toUpperCase()}:`);
        console.log(`  Language: ${info.language}`);
        console.log(`  Strengths: ${info.strengths.join(', ')}`);
        console.log(`  Limitations: ${info.limitations.join(', ')}`);
        console.log(`  Capabilities: ${info.capabilities.join(', ')}`);
    }
}

/**
 * Configuration Example
 * 
 * Shows different configuration options
 */
function configurationExample() {
    console.log('\n⚙️  Configuration Examples:');
    
    // Default configuration
    const defaultConfig = createDefaultConfig();
    console.log('Default config population:', defaultConfig.simulation.populationSize);
    console.log('Default config world size:', defaultConfig.simulation.worldSize);
    
    // Custom configuration for large-scale simulation
    const largeConfig = createDefaultConfig();
    largeConfig.simulation.populationSize = 1000;
    largeConfig.simulation.worldSize = 100;
    largeConfig.disease.initialInfectionRate = 0.02;
    largeConfig.rng.masterSeed = 'large-simulation-seed';
    
    console.log('Large-scale config:');
    console.log('  Population:', largeConfig.simulation.populationSize);
    console.log('  World size:', largeConfig.simulation.worldSize);
    console.log('  Initial infection rate:', largeConfig.disease.initialInfectionRate);
    
    // Performance-optimized configuration
    const fastConfig = createDefaultConfig();
    fastConfig.simulation.populationSize = 100;
    fastConfig.simulation.worldSize = 30;
    fastConfig.disease.initialInfectionRate = 0.15;
    fastConfig.agents.energyConsumption = { min: 1.0, max: 2.0 }; // Faster simulation
    
    console.log('Fast config:');
    console.log('  Population:', fastConfig.simulation.populationSize);
    console.log('  World size:', fastConfig.simulation.worldSize);
    console.log('  Energy consumption:', fastConfig.agents.energyConsumption);
}

// Main execution
async function main() {
    console.log('🚀 Genesis Engine SDK Examples\n');
    
    // Show configuration options
    configurationExample();
    
    // Show provider comparison
    providerComparison();
    
    // Run basic simulation example
    console.log('\n🧪 Running Basic Simulation Example:');
    await basicExample();
    
    console.log('\n✨ Examples completed!');
    console.log('\nNext steps:');
    console.log('1. Build sidecar containers: cd services/mesa-sidecar && docker build -t genx-mesa-sidecar:latest .');
    console.log('2. Run with real providers: node examples/basic.js');
    console.log('3. Check out more examples in the examples/ directory');
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { basicExample, providerComparison, configurationExample };