# 🚀 Quick Start Guide - EcoSysX Genesis Engine Integration

## Prerequisites

- Node.js 18+ installed
- npm installed
- For Qt GUI: Qt 6.9.3+ and CMake 3.16+

## Installation

```powershell
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd EcoSysX

# 2. Install root dependencies
npm install

# 3. Install engine dependencies
cd packages/genx-engine
npm install
cd ../..
```

## Running the System

### Option 1: Everything Together (Recommended)

```powershell
# Start engine server + web UI in one command
npm run dev
```

This will start:
- Genesis Engine Server on `http://localhost:3001` (HTTP) and `ws://localhost:8765` (WebSocket)
- React Web UI on `http://localhost:5173`

Open your browser to `http://localhost:5173` to see the web UI.

### Option 2: Individual Components

#### Start Engine Server Only
```powershell
npm run dev:engine
```

#### Start Web UI Only (requires engine running)
```powershell
npm run dev:web
```

#### Start Qt GUI (requires engine running)
```powershell
# First time setup
cd qt-gui
cmake -B build
cmake --build build

# Run
.\build\bin\ecosysx-gui.exe
```

## Quick Test

### 1. Test Engine Health

```powershell
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 12.34,
  "timestamp": 1697548800000,
  "engine": {
    "state": "idle",
    "tick": 0,
    "clients": 0
  }
}
```

### 2. Test Web UI

1. Open `http://localhost:5173`
2. You should see "🟢 Connected" status
3. Click "▶️ Start" button
4. Watch the simulation tick counter increase
5. Click "⏹️ Stop" to pause

### 3. Test Qt GUI

1. Run `.\qt-gui\build\bin\ecosysx-gui.exe`
2. GUI should automatically connect to `ws://localhost:8765`
3. Check connection status in status bar
4. Use controls to start/stop/step simulation
5. Both UIs should show the same tick number!

## Integration Example - React

```jsx
import { useEngine } from './hooks/useEngine';

function MyComponent() {
  const { connected, running, tick, startSimulation } = useEngine();
  
  const config = {
    schema: "GENX_CFG_V1",
    simulation: { populationSize: 100, worldSize: 50, /* ... */ },
    // ... rest of config
  };
  
  return (
    <div>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Tick: {tick}</p>
      <button onClick={() => startSimulation(config)}>
        Start
      </button>
    </div>
  );
}
```

## Integration Example - Qt

```cpp
#include "core/EngineInterface.h"

// In your Qt class
EngineInterface* m_engine = new EngineInterface(this);

// Connect signals
connect(m_engine, &EngineInterface::connected,
        this, &MyClass::onConnected);
connect(m_engine, &EngineInterface::simulationStepped,
        this, &MyClass::onStepped);

// Connect to engine
m_engine->connectToEngine("ws://localhost:8765");

// Start simulation
QJsonObject config = createConfig();
m_engine->startSimulation(config);
```

## Common Issues

### Port Already in Use

```powershell
# Check what's using the port
netstat -ano | findstr "3001"
netstat -ano | findstr "8765"

# Kill the process
taskkill /PID <pid> /F
```

### WebSocket Connection Fails

1. Make sure engine server is running: `npm run dev:engine`
2. Check firewall settings
3. Verify URL is `ws://localhost:8765` (not `http://`)
4. Check browser console for errors

### Qt GUI Won't Build

```powershell
# Make sure Qt is installed and in PATH
qmake --version

# Clean build
cd qt-gui
rm -rf build
cmake -B build
cmake --build build
```

## Running Tests

```powershell
# Integration tests
npm test -- test/integration/engine-server.test.js

# All tests
npm test
```

## Useful Commands

```powershell
# Check engine status
curl http://localhost:3001/api/v1/status

# Get simulation snapshot
curl http://localhost:3001/api/v1/snapshot?kind=metrics

# Build for production
npm run build:all

# Clean everything
rm -rf node_modules packages/genx-engine/node_modules
npm install
cd packages/genx-engine && npm install
```

## Architecture at a Glance

```
┌─────────────────┐
│ Genesis Engine  │ ← WebSocket Server (8765)
│     Server      │ ← HTTP API (3001)
└────────┬────────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌────────┐  ┌────────┐
│  React │  │   Qt   │
│  Web   │  │  GUI   │
│  :5173 │  │ Native │
└────────┘  └────────┘
```

## Next Steps

1. **Read Full Documentation**: See `ENGINE_INTEGRATION_COMPLETE.md`
2. **Review Examples**: Check `src/components/SimulationControlPanel.jsx`
3. **Explore API**: Look at `packages/genx-engine/src/server.ts`
4. **Write Tests**: See `test/integration/engine-server.test.js`
5. **Contribute**: Follow guidelines in `AGENTS.md`

## Need Help?

- 📖 Full Integration Guide: `ENGINE_INTEGRATION_COMPLETE.md`
- 🏗️ Architecture Details: `INTEGRATION_IMPLEMENTATION_COMPLETE.md`
- 🤖 Coding Standards: `AGENTS.md`
- 🐛 Issues: Check troubleshooting section in docs

---

**Happy Simulating! 🌟**
