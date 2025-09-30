# Genesis Engine SDK

A unified TypeScript SDK for running ecosystem simulations across multiple simulation frameworks: **Mesa** (Python), **Agents.jl** (Julia), and **MASON** (Java).

## 🚀 Features

- **Multi-Provider Architecture**: Seamlessly switch between Mesa, Agents.jl, and MASON simulation engines
- **Deterministic Execution**: Reproducible simulations with cryptographic snapshot verification
- **Docker Sidecar Architecture**: Language-agnostic communication via JSON-RPC over stdio
- **TIME_V1 Temporal Model**: Standardized time semantics (1 step = 1 simulation hour)
- **Comprehensive Configuration**: Unified configuration schema across all providers
- **Event-Driven Monitoring**: Real-time progress tracking and error handling

## 📦 Installation

```bash
npm install @ecosysx/genx-engine
```

## 🏃‍♂️ Quick Start

```typescript
import { GenesisEngine, createDefaultConfig } from '@ecosysx/genx-engine';

const engine = new GenesisEngine();
const config = createDefaultConfig();

// Start simulation with Mesa provider
await engine.start(config, { provider: 'mesa' });

// Run for 100 steps
for (let i = 0; i < 100; i++) {
    await engine.step(1);
    
    if (i % 10 === 0) {
        const snapshot = await engine.snapshot();
        console.log(`Step ${snapshot.tick}: ${snapshot.metrics.pop} agents`);
    }
}

await engine.stop();
```

## 🏗️ Architecture

```
┌─────────────────┐    JSON-RPC     ┌──────────────────┐
│ Genesis Engine  │◄──── stdio ────►│ Python Mesa      │
│ (TypeScript)    │                 │ Sidecar          │
└─────────────────┘                 └──────────────────┘
        │                                    
        │           JSON-RPC     ┌──────────────────┐
        ├──────── stdio ────────►│ Julia Agents.jl  │
        │                        │ Sidecar          │
        │                        └──────────────────┘
        │                                    
        │           JSON-RPC     ┌──────────────────┐
        └──────── stdio ────────►│ Java MASON       │
                                 │ Sidecar          │
                                 └──────────────────┘
```

## 🔧 Provider Configuration

### Mesa (Python)
```typescript
await engine.start(config, {
    provider: 'mesa',
    sidecarImages: {
        mesa: 'genx-mesa-sidecar:latest'
    }
});
```

### Agents.jl (Julia)
```typescript
await engine.start(config, {
    provider: 'agentsjl',
    sidecarImages: {
        agentsjl: 'genx-agents-sidecar:latest'
    }
});
```

### MASON (Java)
```typescript
await engine.start(config, {
    provider: 'mason',
    sidecarImages: {
        mason: 'genx-mason-sidecar:latest'
    }
});
```

## 📋 Configuration Schema

```typescript
const config: EngineConfigV1 = {
    schema: "GENX_CFG_V1",
    simulation: {
        populationSize: 500,
        worldSize: 100,
        maxSteps: 1000,
        enableDisease: true,
        enableReproduction: true,
        enableEnvironment: true
    },
    agents: {
        initialEnergy: { min: 80, max: 120 },
        energyConsumption: { min: 0.5, max: 1.5 },
        reproductionThreshold: 150,
        deathThreshold: 0,
        movementSpeed: { min: 0.5, max: 2.0 }
    },
    disease: {
        initialInfectionRate: 0.05,
        transmissionRate: 0.1,
        recoveryTime: 14,
        contactRadius: 2.0
    },
    environment: {
        resourceRegenRate: 0.01,
        resourceDensity: 1.0,
        enableSeasons: false,
        enableWeather: false
    },
    rng: {
        masterSeed: "deterministic-seed-123",
        streams: {
            movement: true,
            disease: true,
            births: true,
            mutation: true,
            llm: false
        }
    }
};
```

## 🔍 Snapshots and Verification

```typescript
// Take a metrics snapshot (lightweight)
const metricsSnapshot = await engine.snapshot('metrics');
console.log(metricsSnapshot.metrics.sir); // { S: 450, I: 30, R: 20 }

// Take a full snapshot (includes all agent states)
const fullSnapshot = await engine.snapshot('full');
console.log(fullSnapshot.state?.agents.length); // Full agent array

// Verify determinism
console.log(fullSnapshot.simDigest); // SHA-256 hash for verification
```

## 🎯 Event Monitoring

```typescript
engine.on('starting', ({ provider, config }) => {
    console.log(`Starting ${provider} simulation...`);
});

engine.on('stepped', ({ steps, newTick }) => {
    console.log(`Stepped ${steps} times, now at tick ${newTick}`);
});

engine.on('error', ({ phase, error }) => {
    console.error(`Error during ${phase}:`, error);
});

engine.on('completed', ({ reason, tick }) => {
    console.log(`Simulation completed: ${reason} at tick ${tick}`);
});
```

## 🏗️ Building Sidecar Containers

### Mesa Sidecar
```bash
cd services/mesa-sidecar
docker build -t genx-mesa-sidecar:latest .
```

### Agents.jl Sidecar
```bash
cd services/agents-sidecar
docker build -t genx-agents-sidecar:latest .
```

### MASON Sidecar
```bash
cd services/mason-sidecar
docker build -t genx-mason-sidecar:latest .
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run provider integration tests (requires Docker)
npm run test:providers

# Build and validate
npm run build
npm run lint
```

## 📊 Provider Comparison

| Feature | Mesa | Agents.jl | MASON |
|---------|------|-----------|-------|
| **Language** | Python | Julia | Java |
| **Performance** | Medium | High | High |
| **Ease of Use** | High | Medium | Medium |
| **Spatial Model** | Grid | Grid/Continuous | Continuous |
| **Population Limit** | ~1K agents | ~10K agents | ~50K agents |
| **Startup Time** | Fast | Medium | Slow |
| **Memory Usage** | Medium | Low | Medium |

## 🔒 Determinism Guarantees

- **Reproducible RNG**: All providers use deterministic random number generation
- **Deterministic Scheduling**: Agents are processed in consistent order
- **Snapshot Verification**: SHA-256 hashes ensure state consistency
- **Cross-Platform**: Same results across different operating systems
- **Version Locked**: Build hashes prevent accidental version drift

## 🐳 Docker Requirements

All providers run in isolated Docker containers for:
- **Security**: No network access, limited resources
- **Reproducibility**: Consistent runtime environment
- **Isolation**: No interference between simulations
- **Portability**: Works on any Docker-enabled system

## 📚 API Reference

### GenesisEngine Class

#### Methods
- `start(config, options)` - Initialize simulation
- `step(n?)` - Advance simulation by N steps
- `snapshot(kind?)` - Take simulation snapshot
- `stop()` - Stop and cleanup simulation
- `run(steps, callback?)` - Run with progress monitoring

#### Properties
- `isRunning()` - Check if simulation is active
- `getCurrentTick()` - Get current simulation step

#### Static Methods
- `createDefaultConfig()` - Generate default configuration
- `getAvailableProviders()` - List supported providers
- `getProviderComparison()` - Compare provider capabilities

### Events
- `starting` - Simulation initialization beginning
- `started` - Simulation successfully started
- `stepping` - Before stepping simulation
- `stepped` - After stepping simulation
- `snapshotting` - Before taking snapshot
- `snapshotted` - After taking snapshot
- `stopping` - Before stopping simulation
- `stopped` - After stopping simulation
- `completed` - Simulation reached completion criteria
- `error` - Error occurred during operation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Mesa](https://mesa.readthedocs.io/) - Python agent-based modeling
- [Agents.jl](https://juliadynamics.github.io/Agents.jl/) - Julia agent-based modeling
- [MASON](https://cs.gmu.edu/~eclab/projects/mason/) - Java multi-agent simulation

## 🔗 Related Projects

- [EcoSysX](https://github.com/Bbeierle12/EcoSysX) - Main ecosystem simulation project
- [Genesis Engine Schemas](schemas/) - Configuration and snapshot schemas
- [Provider Examples](examples/) - Example simulations for each provider