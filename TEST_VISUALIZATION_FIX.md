# Quick Test: Visualization Fix ✅

## What Was Fixed

The simulator now uses **WebSocket communication** instead of the broken stdio-based approach. This means:
- ✅ No more "Engine startup timeout" errors
- ✅ No more process spawning crashes
- ✅ **Agents now display in the visualization!**

## Quick Test (5 minutes)

### Step 1: Start Engine Server

```powershell
npm run dev:engine
```

**Expected output:**
```
✅ WebSocket server running at ws://localhost:8765
🚀 Genesis Engine Server Started
```

✅ Leave this terminal running!

### Step 2: Launch Qt GUI

```powershell
cd qt-gui\build\bin
.\ecosysx-gui.exe
```

**Expected in GUI Event Log:**
```
Application started
Connecting to engine server at ws://localhost:8765...
✅ Connected to Genesis Engine via WebSocket
```

### Step 3: Start Simulation

1. Click the **▶️ Start** button in the toolbar
2. Watch the event log - should show:
   ```
   User initiated: Start simulation
   ✅ Simulation started (provider: genx-engine)
   ```
3. **Look at the visualization widget (center area)**
   - You should see **agents appearing as circles/dots**
   - They should be moving/updating
   - Metrics panel (right side) should show data

### Step 4: Verify Updates

1. Status bar (bottom): Should say **"Simulation running"** and show **"Step: X"** (increasing)
2. Metrics panel: Values should update every second
3. Chart: Should show growing data lines
4. Visualization: Agents should be visible and moving

## Success Criteria

✅ **FIXED** if you see:
- GUI connects to WebSocket server (log shows "✅ Connected")
- Start button works without errors
- **Agents display in the visualization widget**
- Metrics update continuously
- No "Engine startup timeout" or "Engine crashed" errors

❌ **NOT FIXED** if you see:
- Event log: "Engine: [CMD:1] Starting engine: node ..."
- "Engine startup timeout"
- Blank visualization (no agents)

## What Changed Technically

Before:
```
User clicks Start → EngineClient spawns Node.js → Process crashes → No agents
```

After:
```
User clicks Start → WebSocket message to server → Server responds with snapshot → Agents display
```

## Troubleshooting

### No agents visible?

1. Check server terminal - should show:
   ```
   ✅ Client connected via WebSocket
   📩 Received WebSocket message: start
   📤 Broadcasting event: simulation:started
   📤 Broadcasting event: snapshot:full
   ```

2. Check GUI event log for snapshot receipts

3. Verify configuration has agents:
   - Config panel → "Agent Count" should be > 0 (default is 100)

### GUI can't connect?

1. Verify engine server is running (`npm run dev:engine`)
2. Check nothing else is using port 8765
3. Restart both server and GUI

### Still seeing old errors?

You might be running the old executable. Rebuild:
```powershell
cd qt-gui
$env:PATH = "C:\Qt\Tools\mingw1310_64\bin;C:\Qt\Tools\CMake_64\bin;$env:PATH"
cmake --build build --config Release --target ecosysx-gui
windeployqt --release --no-translations build\bin\ecosysx-gui.exe
```

## Next Steps

Once you confirm agents are displaying:
1. Try Stop/Start/Step buttons
2. Test with different agent counts (10, 100, 1000)
3. Run longer simulations
4. Export chart data

---

**Quick Summary:** The fix migrates from broken stdio to WebSocket. Start the engine server, launch the GUI, click Start, and you should see agents in the visualization! 🎉
