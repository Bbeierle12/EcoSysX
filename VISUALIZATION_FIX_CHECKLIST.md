# Visualization Fix Checklist

## Problem
Simulator doesn't show in the Qt GUI display screen.

## Root Cause
MainWindow was using old stdio-based `EngineClient` instead of new WebSocket-based `EngineInterface`.

## Solution Applied
Updated MainWindow to use EngineInterface with WebSocket communication to the Genesis Engine server.

---

## Quick Test Steps

### 1️⃣ Rebuild Qt GUI (Required)
```powershell
cd qt-gui
cmake --build build --config Release --clean-first
```

**Expected output**: Clean build with no errors

---

### 2️⃣ Start Engine Server
```powershell
# From project root
npm run dev:engine
```

**Expected output**:
```
Genesis Engine Server starting...
HTTP Server listening on http://localhost:3001
WebSocket Server listening on ws://localhost:8765
```

⚠️ **CRITICAL**: Server must be running BEFORE starting Qt GUI

---

### 3️⃣ Launch Qt GUI
```powershell
cd qt-gui
./launch.ps1
```

Or run directly:
```powershell
./build/Release/EcoSysX.exe
```

---

### 4️⃣ Verify Connection

#### ✅ Check Window Title
Should show: **"EcoSysX - Qt GUI [WebSocket Mode]"**

#### ✅ Check Status Bar
- Initial: "Connecting to engine server..."
- After 1-2 seconds: **"Connected to engine server"**

#### ✅ Check Log Panel (bottom of window)
Should show:
```
[INFO] ✅ Connected to Genesis Engine via WebSocket
[INFO] Requesting engine state...
```

---

### 5️⃣ Start Simulation

1. Click **"Start"** button in toolbar
2. Dialog appears asking for configuration
3. Click **"OK"** (use defaults)

#### ✅ Expected Results:

**Status Bar**:
```
Running (mesa)  |  Tick: 0
```

**Log Panel**:
```
[INFO] ✅ Simulation started (provider: mesa)
```

**Visualization Widget** (main display area):
- ✅ Grid should be visible
- ✅ **Colored circles (agents) should appear**
- ✅ Agents should move/update as simulation runs

**Metrics Panel** (right side):
- ✅ Population count updates
- ✅ Energy statistics update
- ✅ Tick counter increments

**Chart Widget** (bottom):
- ✅ Line graph shows population over time

---

### 6️⃣ Test Controls

#### Stop Button
Click **"Stop"** → Simulation pauses, agents stop moving

#### Step Button  
Click **"Step"** → Simulation advances 1 tick

#### Start Again
Click **"Start"** → Simulation resumes from where it stopped

---

## Troubleshooting

### ❌ Status bar shows "Disconnected - attempting to reconnect..."

**Problem**: Engine server not running

**Fix**:
```powershell
# Terminal 1: Start server
npm run dev:engine

# Terminal 2: Restart Qt GUI
cd qt-gui
./launch.ps1
```

---

### ❌ Build errors about "EngineInterface.h not found"

**Problem**: Header file not in correct location

**Fix**: Verify file exists:
```powershell
ls qt-gui/src/core/EngineInterface.h
ls qt-gui/src/core/EngineInterface.cpp
```

If missing, the files were created earlier. Check the conversation history.

---

### ❌ Visualization widget is blank (no agents)

**Possible causes**:

1. **Simulation not started**
   - **Fix**: Click "Start" button

2. **No agents in simulation**
   - **Fix**: Check configuration has agents > 0

3. **Snapshot not being received**
   - **Check log panel** for "snapshot" messages
   - **Check engine server terminal** for WebSocket messages

4. **Snapshot format mismatch**
   - **Debug**: Add logging to `VisualizationWidget::updateAgents()`
   - Verify snapshot contains `{"agents": [...]}`

---

### ❌ Linker errors about Qt6::WebSockets

**Problem**: CMake not linking WebSockets module

**Fix**: Edit `qt-gui/src/CMakeLists.txt`:
```cmake
target_link_libraries(EcoSysX PRIVATE
    Qt6::Widgets
    Qt6::Core
    Qt6::WebSockets  # ← Must be here
)
```

Then rebuild:
```powershell
cd qt-gui
cmake --build build --config Release --clean-first
```

---

### ❌ WebSocket connection times out

**Problem**: Firewall blocking port 8765

**Fix**: Add firewall exception:
```powershell
New-NetFirewallRule -DisplayName "EcoSysX Engine" -Direction Inbound -Protocol TCP -LocalPort 8765 -Action Allow
```

---

## Verification Screenshots

When working correctly, you should see:

1. **Grid with agents**: Colored circles on grid background
2. **Status bar**: "Running (mesa) | Tick: 42"
3. **Metrics updating**: Population count changing
4. **Chart line**: Graph showing population over time
5. **Log panel**: No error messages

---

## What Changed (Technical Details)

### Files Modified

#### `qt-gui/src/ui/MainWindow.h`
- Added `#include "../core/EngineInterface.h"`
- Added 8 WebSocket slot declarations
- Added `EngineInterface* m_engineInterface;` member
- Added `bool m_useWebSocket;` flag

#### `qt-gui/src/ui/MainWindow.cpp`
- Updated constructor to create EngineInterface
- Connected EngineInterface signals to MainWindow slots
- **Critical**: Connected `snapshotReceived` → `VisualizationWidget::updateAgents`
- Implemented 8 WebSocket event handlers

### Key Connection
```cpp
// This is the magic line that makes visualization work:
connect(m_engineInterface, &EngineInterface::snapshotReceived,
        m_visualizationWidget, &VisualizationWidget::updateAgents);
```

This forwards simulation snapshots from the engine server → EngineInterface → VisualizationWidget.

---

## Success Criteria

✅ All checks passed:
- [ ] Window title shows "[WebSocket Mode]"
- [ ] Status bar shows "Connected"
- [ ] Log panel shows connection success
- [ ] Clicking "Start" begins simulation
- [ ] **Agents visible and moving in visualization widget**
- [ ] Metrics panel updates with statistics
- [ ] Chart shows population line graph
- [ ] Stop/Step buttons work correctly

---

## Next Actions After Success

1. **Commit changes**:
   ```powershell
   git add qt-gui/src/ui/MainWindow.h qt-gui/src/ui/MainWindow.cpp
   git commit -m "Fix Qt GUI visualization using WebSocket-based EngineInterface"
   ```

2. **Test with larger simulations**:
   - Try 1,000 agents
   - Try 10,000 agents
   - Monitor performance

3. **Test React UI** (should also work):
   ```powershell
   npm run dev
   # Open browser to http://localhost:5173
   ```

4. **Run integration tests**:
   ```powershell
   npm test
   ```

---

## Documentation References

- [WEBSOCKET_INTEGRATION_COMPLETE.md](qt-gui/WEBSOCKET_INTEGRATION_COMPLETE.md) - Full integration guide
- [ENGINE_GUI_INTEGRATION_COMPLETE.md](ENGINE_GUI_INTEGRATION_COMPLETE.md) - Overall architecture
- [QUICK_START.md](QUICK_START.md) - Getting started guide
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing procedures

---

**Status**: Ready for testing
**Priority**: HIGH - Blocks visualization functionality
**Estimated Test Time**: 5 minutes

---

## Quick Command Reference

```powershell
# Rebuild Qt GUI
cd qt-gui; cmake --build build --config Release --clean-first

# Start engine server
npm run dev:engine

# Launch Qt GUI
cd qt-gui; ./launch.ps1

# Check server status
curl http://localhost:3001/health

# Check ports
netstat -ano | findstr "8765"
netstat -ano | findstr "3001"
```

---

**Report**: After testing, let me know if agents appear in the visualization! 🎯
