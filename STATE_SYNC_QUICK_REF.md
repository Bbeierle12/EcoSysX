# State Sync Fix - Quick Reference

## What Was Fixed
1. **Race Condition**: GUI marked "Running" before sidecar was ready → snapshot errors
2. **Fake Crashes**: Sidecar didn't exit after stop → timeout+kill → logged as crash

## The Fixes (17 lines changed)

### Qt Client (EngineClient.cpp)
```cpp
// ✅ Only init marks Running (not process start or ping)
onProcessStarted() { setState(Starting); }  // Was: Running
handleResponse("ping") { /* no state change */ }  // Was: upgrade to Running
handleResponse("init") { setState(Running); }  // ONLY promotion point
```

### Sidecar (main.js)
```javascript
// ✅ Exit process after stop success
async handleStop() {
    await this.engine.stop();
    const response = { success: true };
    setImmediate(() => process.exit(0));  // ← Added
    return response;
}
```

## Test It
```bash
cd qt-gui/build
cmake --build .
./bin/EcoSysX
```

**Expected**:
- ✅ Start → Init → Running (no premature "Running")
- ✅ Snapshot requests work (no "not running" errors)
- ✅ Stop → "Engine stopped normally" (no "crashed")

## Before/After Logs

### Before
```
[INFO] Engine process started
[INFO] State: Running          ← TOO EARLY
[ERROR] Simulation not running  ← RACE
[ERROR] Engine crashed (62097)  ← FAKE
```

### After
```
[EVT] Process started
[EVT] State: Starting           ← Correct
[EVT] Engine initialized
[EVT] State: Running            ← Now synced
[EVT] Snapshot received         ← Works!
[EVT] Stopped normally          ← Clean!
```

## Files Changed
- `qt-gui/src/core/EngineClient.cpp` (3 lines)
- `qt-gui/src/core/EngineClient.h` (1 line - timeout)
- `services/engine-sidecar/main.js` (7 lines)

## Why It Works
1. **Single Running promotion**: Only `init` can mark Running → GUI/sidecar synchronized
2. **Process exits**: `exit(0)` after stop → no timeout → no kill → no fake crash

## Docs
- Full details: `SURGICAL_STATE_SYNC_FIX.md`
- Visuals: `STATE_SYNC_VISUAL.md`
- Original fix: `ENGINE_RACE_CONDITION_FIX.md`
