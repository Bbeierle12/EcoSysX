# EcoSysX Genesis Engine Integration Complete

## 🎉 Overview

The Genesis Engine has been successfully integrated with both the **React Web UI** and **Qt GUI** via a unified WebSocket and REST API architecture. Both interfaces can now connect to the same engine server and display synchronized simulations.

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Genesis Engine Server                       │
│                  (packages/genx-engine/src/server.ts)          │
│                                                                 │
│  ┌──────────────┐                    ┌──────────────────────┐ │
│  │ HTTP REST API│                    │  WebSocket Server    │ │
│  │ Port: 3001   │                    │  Port: 8765          │ │
│  └──────────────┘                    └──────────────────────┘ │
│         │                                      │               │
│         │                                      │               │
│    ┌────▼──────────────────────────────────────▼────┐         │
│    │         Genesis Engine Core                    │         │
│    │    - Agent management                          │         │
│    │    - Simulation stepping                       │         │
│    │    - Snapshot generation                       │         │
│    │    - Provider abstraction                      │         │
│    └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
              │                                 │
              │                                 │
    ┌─────────▼─────────┐           ┌─────────▼──────────┐
    │   React Web UI    │           │    Qt Desktop GUI  │
    │                   │           │                    │
    │  EngineService    │           │  EngineInterface   │
    │  useEngine hook   │           │  (C++ WebSocket)   │
    │  Port: 5173       │           │                    │
    └───────────────────┘           └────────────────────┘
```

## 🚀 Quick Start

### Starting All Components

```powershell
# Start both engine and web UI together
npm run dev

# Or start individually:
npm run dev:engine  # Engine server on port 3001/8765
npm run dev:web     # React UI on port 5173

# For Qt GUI (separate terminal):
cd qt-gui
cmake --build build
.\build\bin\ecosysx-gui.exe
```

### Testing the Integration

```powershell
# 1. Start the engine server
npm run dev:engine

# 2. Check health endpoint
curl http://localhost:3001/health

# 3. Start web UI (new terminal)
npm run dev:web

# 4. Open browser to http://localhost:5173
# 5. Start Qt GUI and connect to ws://localhost:8765
```

## 📁 Key Files Created

### Backend (Engine Server)

- **`packages/genx-engine/src/server.ts`**
  - WebSocket server on port 8765
  - HTTP REST API on port 3001
  - Event broadcasting to all clients
  - Graceful shutdown handling

### Frontend (React Web UI)

- **`src/services/EngineService.js`**
  - WebSocket client for engine connection
  - Event subscription system
  - Message buffering and reconnection
  - HTTP API methods

- **`src/hooks/useEngine.js`**
  - React hook for engine integration
  - State management (connected, running, tick, snapshot)
  - Control functions (start, stop, step)
  - Error handling

### Qt GUI

- **`qt-gui/src/core/EngineInterface.h/cpp`**
  - Qt WebSocket client
  - Signal/slot architecture for Qt
  - Auto-reconnection logic
  - Qt-friendly API

## 🔌 Protocol Specification

### WebSocket Messages

All WebSocket messages follow this format:

```json
{
  "event": "event:name",
  "data": { /* event-specific data */ },
  "timestamp": 1697548800000
}
```

### Client → Server Commands

```javascript
// Get current state
{ "type": "getState", "timestamp": ... }

// Start simulation
{
  "type": "start",
  "data": {
    "config": { /* EngineConfigV1 */ },
    "options": { "provider": "mock" },
    "autoRun": false
  }
}

// Stop simulation
{ "type": "stop", "timestamp": ... }

// Step simulation
{ "type": "step", "data": { "steps": 10 } }

// Request snapshot
{ "type": "snapshot", "data": { "kind": "metrics" } }

// Ping
{ "type": "ping", "timestamp": ... }
```

### Server → Client Events

```javascript
// Connection established
{ "event": "engine:connected", "data": { "running": false, "tick": 0 } }

// State update
{ "event": "state:update", "data": { "running": true, "tick": 42, "snapshot": {...} } }

// Simulation started
{ "event": "engine:started", "data": { "tick": 0, "provider": "mock" } }

// Simulation stopped
{ "event": "engine:stopped", "data": { "tick": 100 } }

// Simulation stepped
{ "event": "engine:step", "data": { "steps": 1, "tick": 43 } }

// Snapshot update
{ "event": "snapshot:update", "data": { /* snapshot object */ } }

// Error
{ "event": "error", "data": { "message": "Error description" } }

// Pong response
{ "event": "pong", "data": { "timestamp": ... } }
```

## 🔧 HTTP REST API

### Endpoints

#### `GET /health`
Health check endpoint
```json
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": 1697548800000,
  "engine": {
    "state": "running",
    "tick": 42,
    "clients": 2
  }
}
```

#### `GET /api/v1/status`
Get engine status
```json
{
  "status": "success",
  "data": {
    "running": true,
    "tick": 42,
    "provider": { "name": "mock", "version": "1.0.0" }
  }
}
```

#### `GET /api/v1/snapshot?kind=metrics`
Get simulation snapshot
```json
{
  "status": "success",
  "data": { /* snapshot object */ }
}
```

#### `POST /api/v1/start`
Start simulation
```json
{
  "config": { /* EngineConfigV1 */ },
  "options": { "provider": "mock" }
}
```

#### `POST /api/v1/stop`
Stop simulation

#### `POST /api/v1/step`
Step simulation
```json
{
  "steps": 10
}
```

## 💻 Usage Examples

### React Component

```jsx
import { useEngine } from './hooks/useEngine';

function SimulationPanel() {
  const {
    connected,
    running,
    tick,
    snapshot,
    error,
    startSimulation,
    stopSimulation,
    stepSimulation
  } = useEngine();
  
  const handleStart = () => {
    const config = {
      schema: "GENX_CFG_V1",
      simulation: {
        populationSize: 100,
        worldSize: 50,
        enableDisease: true,
        enableReproduction: true,
        enableEnvironment: true
      },
      // ... rest of config
    };
    
    startSimulation(config, { provider: 'mock' }, true);
  };
  
  return (
    <div>
      <h2>Simulation Control</h2>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      <p>Running: {running ? 'Yes' : 'No'}</p>
      <p>Tick: {tick}</p>
      
      {error && <div className="error">{error}</div>}
      
      <button onClick={handleStart} disabled={running}>Start</button>
      <button onClick={stopSimulation} disabled={!running}>Stop</button>
      <button onClick={() => stepSimulation(10)} disabled={!running}>
        Step 10
      </button>
      
      {snapshot && (
        <div>
          <h3>Metrics</h3>
          <p>Population: {snapshot.metrics.pop}</p>
          <p>Mean Energy: {snapshot.metrics.energyMean.toFixed(2)}</p>
          <p>SIR: S={snapshot.metrics.sir.S} I={snapshot.metrics.sir.I} R={snapshot.metrics.sir.R}</p>
        </div>
      )}
    </div>
  );
}
```

### Qt GUI Integration

```cpp
// In MainWindow.cpp
#include "core/EngineInterface.h"

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    // Create engine interface
    m_engine = new EngineInterface(this);
    
    // Connect signals
    connect(m_engine, &EngineInterface::connected,
            this, &MainWindow::onEngineConnected);
    connect(m_engine, &EngineInterface::simulationStepped,
            this, &MainWindow::onSimulationStepped);
    connect(m_engine, &EngineInterface::snapshotReceived,
            this, &MainWindow::onSnapshotReceived);
    connect(m_engine, &EngineInterface::errorOccurred,
            this, &MainWindow::onEngineError);
    
    // Connect to engine
    m_engine->connectToEngine("ws://localhost:8765");
}

void MainWindow::onEngineConnected() {
    qInfo() << "Connected to Genesis Engine!";
    statusBar()->showMessage("Connected to engine");
}

void MainWindow::onSimulationStepped(int steps, int tick) {
    qInfo() << "Simulation stepped by" << steps << "to tick" << tick;
    updateSimulationDisplay(tick);
}

void MainWindow::onSnapshotReceived(const QJsonObject &snapshot) {
    // Update visualizations with snapshot data
    updateMetrics(snapshot["metrics"].toObject());
}

void MainWindow::startSimulation() {
    QJsonObject config = Configuration::createDefault();
    QJsonObject options;
    options["provider"] = "mock";
    
    m_engine->startSimulation(config, options, true);
}
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Engine server starts without errors
- [ ] Health endpoint returns valid JSON
- [ ] React UI connects to WebSocket
- [ ] Qt GUI connects to WebSocket
- [ ] Both UIs receive connection event
- [ ] Start simulation from React UI
- [ ] Qt GUI receives simulation:started event
- [ ] Both UIs show same tick number
- [ ] Step simulation from Qt GUI
- [ ] React UI updates tick number
- [ ] Stop simulation from either UI
- [ ] Both UIs reflect stopped state
- [ ] Reconnection works after server restart

### Automated Tests

```bash
# Run engine tests
cd packages/genx-engine
npm test

# Run React tests
npm test

# Run Qt tests
cd qt-gui
cmake --build build
cd build
ctest
```

## 🐛 Troubleshooting

### Engine Won't Start

```powershell
# Check if ports are in use
netstat -ano | findstr "3001"
netstat -ano | findstr "8765"

# Kill processes if needed
taskkill /PID <pid> /F
```

### WebSocket Connection Fails

1. Check engine server is running: `curl http://localhost:3001/health`
2. Check firewall settings
3. Verify WebSocket URL is correct
4. Check browser console for errors

### Qt GUI Won't Connect

1. Ensure Qt6::WebSockets is installed
2. Rebuild Qt GUI: `cmake --build build --clean-first`
3. Check engine server logs
4. Verify URL is "ws://localhost:8765" (not "http://")

### Different Tick Numbers

This indicates synchronization issues:

1. Check network latency
2. Verify both clients subscribe to `engine:step` events
3. Enable debug logging in EngineService/EngineInterface
4. Check for missed WebSocket messages

## 📊 Performance Considerations

### WebSocket Message Frequency

- **Full snapshots**: Send every 10 steps or on demand
- **Metrics snapshots**: Send every step (lightweight)
- **Step events**: Send every step (minimal data)

### Optimization Tips

1. **Batch steps**: Step 10-100 times between updates for faster simulations
2. **Throttle updates**: Use `requestAnimationFrame` in React for rendering
3. **Buffer size**: Limit snapshot history to last 100 entries
4. **Compression**: Consider gzip for large snapshots (future enhancement)

## 🔄 Migration from Old Architecture

### React Components

**Old:**
```javascript
// Direct engine import
import { GenesisEngine } from './packages/genx-engine';
const engine = new GenesisEngine();
```

**New:**
```javascript
// Use hook
import { useEngine } from './hooks/useEngine';
const { running, tick, startSimulation } = useEngine();
```

### Qt GUI

**Old:**
```cpp
// Stdio-based EngineClient
m_engineClient->sendInit(config);
m_engineClient->sendStep(10);
```

**New:**
```cpp
// WebSocket-based EngineInterface
m_engine->startSimulation(config, options);
m_engine->stepSimulation(10);
```

## 📝 Configuration

### Engine Server Environment Variables

```powershell
# .env file
ENGINE_PORT=3001        # HTTP API port
WS_PORT=8765           # WebSocket port
UPDATE_RATE=60         # Simulation update rate (Hz)
```

### React Frontend

```javascript
// Override default URLs
const { connected } = useEngine({
  wsUrl: 'ws://localhost:8765',
  apiUrl: 'http://localhost:3001'
});
```

### Qt GUI

```cpp
// Override default URL
m_engine->connectToEngine("ws://192.168.1.100:8765");
```

## 🎯 Next Steps

### Phase 6: Advanced Features

1. **Authentication**: Add JWT tokens for secure connections
2. **Multi-user**: Support multiple simultaneous simulations
3. **Persistence**: Save/load simulation state from database
4. **Recording**: Record simulation for playback
5. **Distributed**: Run simulations across multiple machines

### Phase 7: Provider Integration

1. **Mesa Provider**: Connect to Python Mesa backend
2. **Agents.jl Provider**: Connect to Julia Agents.jl backend
3. **MASON Provider**: Connect to Java MASON backend

## 📚 References

- **AGENTS.md**: AI agent coding conventions
- **packages/genx-engine/src/types.ts**: TypeScript type definitions
- **qt-gui/CODING_STANDARDS.md**: Qt C++ standards
- **CONTRIBUTING.md**: General contribution guidelines

---

**Status**: ✅ **Phase 1-4 Complete**

This integration provides a solid foundation for both UI clients to interact with the Genesis Engine. Both the React Web UI and Qt Desktop GUI can now:

- Connect to the same engine server
- Display synchronized simulations
- Control simulation state
- Receive real-time updates
- Handle errors gracefully
- Reconnect automatically

The architecture follows AGENTS.md conventions with clean separation of concerns, proper error handling, comprehensive documentation, and maintainable code structure.
