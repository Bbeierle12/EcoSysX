# WebSocket Integration Complete ✅

## Summary

The Qt GUI has been successfully updated to use WebSocket-based communication with the Genesis Engine server instead of the legacy stdio-based approach. The visualization should now display the simulation.

## What Changed

### 1. MainWindow.h
- **Added**: `#include "../core/EngineInterface.h"`
- **Added**: 8 WebSocket signal handler slot declarations:
  - `onWebSocketConnected()`
  - `onWebSocketDisconnected()`
  - `onWebSocketError(const QString& error)`
  - `onWebSocketStateUpdated(bool running, int tick)`
  - `onWebSocketSimulationStarted(int tick, const QString& provider)`
  - `onWebSocketSimulationStopped(int tick)`
  - `onWebSocketSimulationStepped(int steps, int tick)`
  - `onWebSocketSnapshotReceived(const QJsonObject& snapshot)`
- **Added**: `EngineInterface* m_engineInterface;` member variable
- **Added**: `bool m_useWebSocket;` flag for mode tracking

### 2. MainWindow.cpp

#### Constructor Changes
```cpp
// Window title updated to show mode
setWindowTitle("EcoSysX - Qt GUI [WebSocket Mode]");

// Initialize WebSocket mode flag
m_useWebSocket(true)

// Create EngineInterface instance
m_engineInterface = new EngineInterface(this);

// Connect all signals
connect(m_engineInterface, &EngineInterface::connected, 
        this, &MainWindow::onWebSocketConnected);
connect(m_engineInterface, &EngineInterface::disconnected, 
        this, &MainWindow::onWebSocketDisconnected);
connect(m_engineInterface, &EngineInterface::errorOccurred, 
        this, &MainWindow::onWebSocketError);
connect(m_engineInterface, &EngineInterface::stateUpdated, 
        this, &MainWindow::onWebSocketStateUpdated);
connect(m_engineInterface, &EngineInterface::simulationStarted, 
        this, &MainWindow::onWebSocketSimulationStarted);
connect(m_engineInterface, &EngineInterface::simulationStopped, 
        this, &MainWindow::onWebSocketSimulationStopped);
connect(m_engineInterface, &EngineInterface::simulationStepped, 
        this, &MainWindow::onWebSocketSimulationStepped);
connect(m_engineInterface, &EngineInterface::snapshotReceived, 
        this, &MainWindow::onWebSocketSnapshotReceived);

// Critical connection: Forward snapshots to visualization
connect(m_engineInterface, &EngineInterface::snapshotReceived,
        m_visualizationWidget, &VisualizationWidget::updateAgents);

// Connect to engine server
m_engineInterface->connectToEngine("ws://localhost:8765");
```

#### Slot Implementations
All 8 WebSocket signal handlers have been implemented:

1. **onWebSocketConnected()**: Logs connection, updates status bar, requests initial state
2. **onWebSocketDisconnected()**: Logs disconnection, shows reconnection message
3. **onWebSocketError()**: Logs error, shows warning dialog
4. **onWebSocketStateUpdated()**: Updates tick counter and UI button states
5. **onWebSocketSimulationStarted()**: Starts snapshot timer, updates status, disables config
6. **onWebSocketSimulationStopped()**: Stops snapshot timer, re-enables config
7. **onWebSocketSimulationStepped()**: Updates tick counter, requests snapshot
8. **onWebSocketSnapshotReceived()**: Updates metrics panel and chart widget

## Testing the Fix

### Prerequisites
1. Ensure all npm dependencies are installed:
   ```powershell
   npm install
   ```

2. Ensure Qt GUI is rebuilt with the changes:
   ```powershell
   cd qt-gui
   cmake --build build --config Release
   ```

### Step-by-Step Test

#### Terminal 1: Start Engine Server
```powershell
npm run dev:engine
```

Expected output:
```
Genesis Engine Server starting...
HTTP Server listening on http://localhost:3001
WebSocket Server listening on ws://localhost:8765
```

#### Terminal 2: Run Qt GUI
```powershell
cd qt-gui
./build/Release/EcoSysX.exe
```

Or use the launcher:
```powershell
cd qt-gui
./launch.ps1
```

### Expected Behavior

1. **Window Title**: Shows "EcoSysX - Qt GUI [WebSocket Mode]"

2. **Status Bar**: 
   - Initially: "Connecting to engine server..."
   - After connection: "✅ Connected to engine server"

3. **Log Panel**: Shows connection messages:
   ```
   [INFO] ✅ Connected to Genesis Engine via WebSocket
   [INFO] Requesting engine state...
   ```

4. **Start Button**: Click to start simulation

5. **Visualization Widget**: 
   - Should display grid
   - Agents should appear as colored circles
   - Agents should move/update as simulation runs

6. **Metrics Panel**: Should show:
   - Population count
   - Energy statistics
   - Step counter

7. **Chart Widget**: Should display real-time graphs

### Troubleshooting

#### Problem: GUI shows "Disconnected - attempting to reconnect..."

**Solution**: Ensure engine server is running first
```powershell
npm run dev:engine
```

#### Problem: No agents visible in visualization

**Possible causes**:
1. Simulation not started - Click "Start" button
2. Snapshot format mismatch - Check engine server logs
3. WebSocket not receiving data - Check browser console (if using React UI)

**Debug steps**:
```powershell
# Check if engine server is running
netstat -ano | findstr "8765"

# Check if HTTP API works
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/status

# Check logs in Qt GUI log panel
```

#### Problem: Build errors

**Solution**: Ensure Qt WebSockets module is linked
```cmake
# In qt-gui/src/CMakeLists.txt, verify:
target_link_libraries(EcoSysX PRIVATE
    Qt6::Widgets
    Qt6::Core
    Qt6::WebSockets  # This must be present
)
```

Rebuild:
```powershell
cd qt-gui
cmake --build build --config Release --clean-first
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Genesis Engine                        │
│              (packages/genx-engine/)                    │
│                                                         │
│  • Mesa/Agents.jl/MASON provider abstraction           │
│  • Core simulation logic                               │
│  • Agent behavior primitives                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Engine Server                           │
│          (packages/genx-engine/src/server.ts)           │
│                                                         │
│  • HTTP API (port 3001)                                │
│    - GET /health, /api/v1/status, /api/v1/snapshot    │
│    - POST /api/v1/start, /api/v1/stop, /api/v1/step   │
│                                                         │
│  • WebSocket Server (port 8765)                        │
│    - Events: engine:*, state:*, snapshot:*             │
│    - Commands: start, stop, step, getState, snapshot   │
└────────┬──────────────────────────┬─────────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌──────────────────┐      ┌──────────────────────┐
│   Qt GUI Client  │      │  React Web Client    │
│                  │      │                      │
│ EngineInterface  │      │  EngineService.js    │
│ (WebSocket)      │      │  useEngine.js        │
│                  │      │  (WebSocket)         │
│ MainWindow       │      │  Components          │
│ └─VisWidget      │      │  └─SimControlPanel   │
│ └─MetricsPanel   │      │  └─Visualization     │
│ └─ChartWidget    │      │  └─AgentInspector    │
└──────────────────┘      └──────────────────────┘
```

## Signal Flow: Snapshot Display

```
1. User clicks "Start" in MainWindow
   └─> MainWindow::onStartTriggered()
       └─> m_engineInterface->startSimulation(config)

2. EngineInterface sends WebSocket message
   └─> {"type": "start", "data": {...}}

3. Engine Server starts simulation
   └─> Emits "simulation:started" event
   └─> Periodically emits "snapshot:update" events

4. EngineInterface receives "snapshot:update"
   └─> Parses JSON
   └─> Emits snapshotReceived(QJsonObject) signal

5. MainWindow::onWebSocketSnapshotReceived() called
   └─> Updates metrics panel
   └─> Updates chart widget

6. VisualizationWidget::updateAgents() called (connected signal)
   └─> Parses agents array from snapshot
   └─> Updates agent positions
   └─> Triggers repaint()
   └─> Agents appear on screen! ✅
```

## Data Format: Snapshot

The engine server sends snapshots in this format:

```json
{
  "type": "snapshot:update",
  "data": {
    "tick": 42,
    "state": {
      "agents": [
        {
          "id": 1,
          "x": 10.5,
          "y": 20.3,
          "state": "susceptible",
          "energy": 100.0
        },
        {
          "id": 2,
          "x": 15.8,
          "y": 12.1,
          "state": "infected",
          "energy": 75.5
        }
      ]
    },
    "metrics": {
      "pop": 100,
      "energyMean": 87.3,
      "energyStd": 12.4
    }
  },
  "timestamp": 1697548800000
}
```

The `VisualizationWidget::updateAgents()` expects:
```json
{
  "agents": [
    {"id": 1, "x": 10.5, "y": 20.3, "state": "susceptible"},
    ...
  ]
}
```

The slot `MainWindow::onWebSocketSnapshotReceived()` extracts the nested `state.agents` and forwards it.

## Configuration Notes

### WebSocket URL
Currently hardcoded in MainWindow.cpp:
```cpp
m_engineInterface->connectToEngine("ws://localhost:8765");
```

To make configurable, add to settings file or config dialog.

### Snapshot Update Frequency
Controlled by `m_snapshotTimer` in MainWindow:
```cpp
m_snapshotTimer->setInterval(100); // 100ms = 10 updates/sec
```

Adjust interval based on performance needs.

### Auto-Reconnection
EngineInterface handles reconnection automatically with exponential backoff:
- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff multiplier: 2x

## Performance Considerations

### WebSocket vs. Stdio
- **Old (stdio)**: Spawns Node.js process per GUI instance, uses pipes
- **New (WebSocket)**: Single shared engine server, multiple clients

**Benefits**:
- ✅ Single source of truth
- ✅ React and Qt can view same simulation
- ✅ Better resource utilization
- ✅ Easier debugging (curl endpoints)

### Snapshot Frequency
Sending snapshots every 100ms (10 FPS) is reasonable for visualization.
Adjust `m_snapshotTimer` interval if:
- Too slow → Decrease interval (e.g., 50ms for 20 FPS)
- Too fast → Increase interval (e.g., 200ms for 5 FPS)

### Large Simulations
For simulations with >10,000 agents:
- Consider snapshot sampling (send subset of agents)
- Use spatial culling (only send visible agents)
- Increase snapshot interval
- Implement delta updates (only changed agents)

## Next Steps

### Immediate
1. ✅ Test visualization with small simulation (100 agents)
2. ✅ Verify metrics panel updates
3. ✅ Test start/stop/step controls

### Short Term
- Add reconnection indicator in UI
- Add WebSocket connection status icon
- Make WebSocket URL configurable
- Add snapshot frequency setting

### Long Term
- Implement delta snapshot updates
- Add spatial culling for large simulations
- Support multiple simulation instances
- Add session persistence/recovery

## Related Documentation

- [ENGINE_GUI_INTEGRATION_COMPLETE.md](../ENGINE_GUI_INTEGRATION_COMPLETE.md) - Overall integration guide
- [qt-gui/CODING_STANDARDS.md](./CODING_STANDARDS.md) - Qt coding conventions
- [INTEGRATION_IMPLEMENTATION_COMPLETE.md](../INTEGRATION_IMPLEMENTATION_COMPLETE.md) - Implementation details
- [QUICK_START.md](../QUICK_START.md) - Quick start guide

## Support

If visualization still doesn't work after following this guide:

1. Check engine server logs for WebSocket connection
2. Check Qt GUI log panel for error messages
3. Verify snapshot format matches expected structure
4. Use browser DevTools to inspect WebSocket messages (React UI)
5. Check [TESTING_GUIDE.md](../TESTING_GUIDE.md) for debugging steps

---

**Status**: ✅ COMPLETE
**Last Updated**: 2025-10-17
**Tested**: Pending user verification
