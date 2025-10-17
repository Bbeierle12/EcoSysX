# Genesis Engine GUI Sidecar

JSON-RPC bridge service that connects the Qt GUI to the Genesis Engine.

## Overview

This sidecar service acts as a communication bridge between:
- **Qt GUI** (C++) - Frontend desktop application
- **Genesis Engine** (TypeScript/JavaScript) - Core simulation engine

Communication happens via **JSON-RPC over stdin/stdout** with line-delimited JSON messages.

## Architecture

```
┌─────────────┐   JSON-RPC    ┌──────────────┐   Provider    ┌─────────────┐
│   Qt GUI    │◄──── stdio ───►│    Engine    │◄──── API ────►│   Mesa/     │
│   (C++)     │                │   Sidecar    │               │   MASON/    │
│             │                │  (Node.js)   │               │  Agents.jl  │
└─────────────┘                └──────────────┘               └─────────────┘
```

## Installation

```bash
cd services/engine-sidecar
npm install
```

## Usage

### From Command Line (Testing)
```bash
npm start
```

Then send JSON-RPC commands via stdin:
```json
{"op":"ping"}
{"op":"init","data":{"provider":"mesa"}}
{"op":"step","data":{"steps":10}}
{"op":"snapshot","data":{"kind":"metrics"}}
{"op":"stop"}
```

### From Qt GUI

The Qt GUI automatically launches this sidecar as a subprocess and communicates via stdin/stdout.

## JSON-RPC Protocol

### Request Format
```json
{
  "op": "operation_name",
  "data": { /* optional parameters */ }
}
```

### Response Format
```json
{
  "success": true,
  "op": "operation_name",
  "data": { /* response data */ }
}
```

### Error Format
```json
{
  "success": false,
  "error": "Error message",
  "stack": "Stack trace (in development)"
}
```

## Supported Operations

### 1. ping
Health check to verify sidecar is running.

**Request:**
```json
{"op":"ping"}
```

**Response:**
```json
{
  "success": true,
  "op": "ping",
  "data": {
    "status": "idle",
    "tick": 0,
    "version": "1.0.0"
  }
}
```

---

### 2. init
Initialize a new simulation with configuration.

**Request:**
```json
{
  "op": "init",
  "data": {
    "provider": "mesa",
    "config": {
      "schema": "GENX_CFG_V1",
      "simulation": {
        "populationSize": 500,
        "worldSize": 100,
        "maxSteps": 1000
      },
      "agents": {
        "startingEnergy": 50.0,
        "movementCost": 0.5
      },
      "disease": {
        "infectionRadius": 2.0,
        "infectionProbability": 0.6,
        "recoveryTime": 168,
        "initialInfectionRate": 0.05
      },
      "environment": {
        "resourceDistribution": "uniform",
        "resourceAbundance": 0.3,
        "resourceRegen": 0.01
      },
      "rng": {
        "masterSeed": "test-seed-123"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "op": "init",
  "data": {
    "tick": 0,
    "metrics": {
      "pop": 500,
      "sir": { "S": 475, "I": 25, "R": 0 },
      "dead": 0,
      "energyMean": 50.0
    },
    "provider": {
      "name": "mesa",
      "version": "2.0.0",
      "language": "Python"
    }
  }
}
```

---

### 3. step
Advance simulation by N steps.

**Request:**
```json
{
  "op": "step",
  "data": {
    "steps": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "op": "step",
  "data": {
    "tick": 10,
    "metrics": {
      "pop": 498,
      "sir": { "S": 450, "I": 35, "R": 13 },
      "dead": 2,
      "energyMean": 48.3
    }
  }
}
```

---

### 4. snapshot
Get current simulation state.

**Request (Metrics Only):**
```json
{
  "op": "snapshot",
  "data": {
    "kind": "metrics"
  }
}
```

**Request (Full State):**
```json
{
  "op": "snapshot",
  "data": {
    "kind": "full"
  }
}
```

**Response (Metrics):**
```json
{
  "success": true,
  "op": "snapshot",
  "data": {
    "snapshot": {
      "schema": "GENX_SNAP_V1",
      "tick": 10,
      "metrics": {
        "pop": 498,
        "sir": { "S": 450, "I": 35, "R": 13 },
        "dead": 2,
        "energyMean": 48.3
      },
      "providerInfo": {
        "name": "mesa",
        "version": "2.0.0"
      },
      "buildHash": "abc123...",
      "simDigest": "def456..."
    },
    "kind": "metrics"
  }
}
```

**Response (Full):**
```json
{
  "success": true,
  "op": "snapshot",
  "data": {
    "snapshot": {
      "schema": "GENX_SNAP_V1",
      "tick": 10,
      "metrics": { /* ... */ },
      "state": {
        "agents": [
          {
            "id": "agent_0",
            "x": 45.3,
            "y": 67.2,
            "energy": 52.1,
            "infected": false,
            "recovered": false,
            "age": 10
          }
          // ... more agents
        ],
        "environment": {
          "grid": [[0.3, 0.5, ...], ...],
          "worldSize": 100
        },
        "tick": 10
      },
      "providerInfo": { /* ... */ },
      "buildHash": "abc123...",
      "simDigest": "def456..."
    },
    "kind": "full"
  }
}
```

---

### 5. stop
Stop the simulation and clean up resources.

**Request:**
```json
{"op":"stop"}
```

**Response:**
```json
{
  "success": true,
  "op": "stop",
  "data": {
    "message": "Simulation stopped successfully"
  }
}
```

## Provider Options

The `init` operation supports multiple simulation providers:

- **`mesa`** - Python Mesa framework (default)
- **`agentsjl`** - Julia Agents.jl framework
- **`mason`** - Java MASON framework

Each provider requires its respective sidecar container to be running.

## Configuration

### Default Configuration

If no configuration is provided, the sidecar creates a default configuration with:
- Population: 500 agents
- World size: 100×100 grid
- Initial infection rate: 5%
- Infection probability: 60%
- Recovery time: 168 steps (1 week in TIME_V1)

### Custom Configuration

Provide a full `EngineConfigV1` object in the `init` request. See the Genesis Engine documentation for the complete schema.

## Error Handling

All errors return a response with `success: false`:

```json
{
  "success": false,
  "error": "Simulation not running. Call init first.",
  "stack": "Error: Simulation not running...\n    at ..."
}
```

Common errors:
- "Simulation already running" - Called `init` when already running
- "Simulation not running" - Called `step`/`snapshot` without `init`
- "Unknown operation" - Invalid operation name
- "Step count must be positive" - Invalid step count

## Logging

The sidecar logs diagnostic messages to **stderr** (not stdout) to avoid interfering with JSON-RPC communication:

```
[INFO] 2025-10-17T14:30:00.000Z - GUI Sidecar started, waiting for commands...
[INFO] 2025-10-17T14:30:05.123Z - Initializing with mesa provider...
[INFO] 2025-10-17T14:30:06.456Z - Engine started with mesa provider at tick 0
[ERROR] 2025-10-17T14:30:10.789Z - Step failed: Simulation crashed
```

## Testing

### Manual Testing
```bash
npm start
```

Then type commands:
```
{"op":"ping"}
{"op":"init","data":{"provider":"mesa"}}
{"op":"step","data":{"steps":1}}
{"op":"stop"}
```

Press `Ctrl+D` (EOF) to exit gracefully.

### Automated Testing
```bash
npm test
```

## Qt GUI Integration

The Qt `EngineClient` class automatically:
1. Launches this sidecar as a subprocess: `node services/engine-sidecar/main.js`
2. Connects to its stdin/stdout
3. Sends JSON-RPC commands
4. Parses line-delimited JSON responses
5. Emits Qt signals for UI updates
6. Terminates the process on application exit

No additional configuration needed - it just works! 🎉

## Development

### Watch Mode
```bash
npm run dev
```

### Debugging
Set environment variable:
```bash
NODE_ENV=development npm start
```

## Requirements

- Node.js 18+ (ES modules support)
- Genesis Engine package (`@ecosysx/genx-engine`)
- Provider sidecar containers (Mesa/MASON/Agents.jl)

## Troubleshooting

### "Cannot find module '@ecosysx/genx-engine'"
Run `npm install` in the engine-sidecar directory.

### "Sidecar script not found" in Qt GUI
Ensure the sidecar is at `services/engine-sidecar/main.js` relative to the workspace root.

### Provider errors
Ensure the corresponding provider sidecar container is built and running:
```bash
cd services/mesa-sidecar
docker build -t genx-mesa-sidecar .
docker run genx-mesa-sidecar
```

## License

MIT
