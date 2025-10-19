# Provider Option Fix ✅

## Issue Identified

When you clicked "Start" in the Qt GUI, the event logs showed:
```
✅ Simulation started (provider: )
Simulation started (provider: )
```

The **provider string was empty**, meaning the GUI wasn't telling the server which engine provider to use.

## Root Cause

The Qt GUI's `MainWindow` was calling:
```cpp
m_engineInterface->startSimulation(m_currentConfig.toJson());
```

This sends only the configuration but **no options object** with provider information. The server expected:
```json
{
  "type": "start",
  "data": {
    "config": {...},
    "options": {
      "provider": "genx-engine"  // ← This was missing!
    }
  }
}
```

## Fix Applied

Updated `qt-gui/src/ui/MainWindow.cpp` in two places:

### 1. Start Button Handler (Line ~101)

**Before:**
```cpp
m_engineInterface->startSimulation(m_currentConfig.toJson());
```

**After:**
```cpp
QJsonObject options;
options["provider"] = "genx-engine";
m_engineInterface->startSimulation(m_currentConfig.toJson(), options, false);
```

### 2. Reset Button Handler (Line ~123)

**Before:**
```cpp
if (m_currentConfig.validate()) {
    m_engineInterface->startSimulation(m_currentConfig.toJson());
}
```

**After:**
```cpp
if (m_currentConfig.validate()) {
    QJsonObject options;
    options["provider"] = "genx-engine";
    m_engineInterface->startSimulation(m_currentConfig.toJson(), options, false);
}
```

## Server-Side Flow

When the GUI now clicks "Start":

1. **GUI sends:**
   ```json
   {
     "type": "start",
     "data": {
       "config": {...agentConfig...},
       "options": {"provider": "genx-engine"},
       "autoRun": false
     }
   }
   ```

2. **Server processes** (`packages/genx-engine/src/server.ts:334`):
   ```typescript
   const config = data.config || GenesisEngine.createDefaultConfig();
   const options = data.options || { provider: 'mock' };
   
   await engine.start(config, options);
   ```

3. **Server broadcasts:**
   ```json
   {
     "event": "engine:started",
     "data": {
       "tick": 0,
       "provider": "genx-engine"  // ✅ Now populated!
     }
   }
   ```

4. **GUI receives** and displays:
   ```
   ✅ Simulation started (provider: genx-engine)
   ```

## Build Status

✅ **Built successfully:**
```
[100%] Built target ecosysx-gui
```

Executable: `qt-gui/build/bin/ecosysx-gui.exe`

## Testing

### Prerequisites
1. Engine server running: `npm run dev:engine`
2. Fresh GUI build completed

### Expected Behavior

Launch the GUI and click **Start**. Event log should now show:
```
User initiated: Start simulation
✅ Simulation started (provider: genx-engine)
Simulation started (provider: genx-engine)
```

**No more empty provider string!** The logs will clearly show `genx-engine` as the provider.

### Server Logs

The server terminal should show:
```
📩 Received WebSocket message: start
Starting simulation with config: {...}
Provider: genx-engine
📤 Broadcasting event: engine:started
   Data: {"tick":0,"provider":"genx-engine"}
```

## Impact

### What This Fixes

✅ **Provider visibility** - You can now see which engine backend is running the simulation  
✅ **Proper configuration** - Server knows which provider to initialize  
✅ **Debugging clarity** - Logs show the correct provider name  
✅ **Future extensibility** - Easy to switch providers (genx-engine, mesa, mason, etc.)

### What This Enables

Once provider is properly set, the engine can:
- Initialize the correct backend (genx-engine vs mesa vs mason)
- Apply provider-specific optimizations
- Display provider-specific metrics
- Enable provider-specific features

## Files Modified

- `qt-gui/src/ui/MainWindow.cpp` (2 changes):
  - Line ~101: Start button lambda
  - Line ~123: Reset button lambda

## Next Test

1. **Close any running GUI** (`taskkill /F /IM ecosysx-gui.exe`)
2. **Verify engine server is running** (check terminal for "WebSocket server running")
3. **Launch GUI:** `cd qt-gui\build\bin; .\ecosysx-gui.exe`
4. **Click Start button**
5. **Check event log** - should show:
   ```
   ✅ Simulation started (provider: genx-engine)
   ```

If you see "genx-engine" in the provider field, the fix is working! 🎉

## Technical Notes

### Provider Options

The `options` object can include:
```cpp
QJsonObject options;
options["provider"] = "genx-engine";  // Backend selection
options["autoRun"] = true;            // Auto-start simulation loop
options["updateRate"] = 60;           // Steps per second
```

For now, we only set the provider. Future enhancements could add more options.

### Default Behavior

If no options are provided, the server uses:
```typescript
const options = data.options || { provider: 'mock' };
```

So it defaults to `'mock'` provider, but now we explicitly request `'genx-engine'`.

---

**Status:** ✅ **Fix applied and built**  
**Ready for:** Testing with GUI launch  
**Expected result:** Provider field populated with "genx-engine"  
**Date:** 2025-01-17
