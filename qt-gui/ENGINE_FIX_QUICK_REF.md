# Engine Race Condition Fix - Quick Reference

## Problem in Plain English

Your logs showed:
- **23:53:13** - "ERROR Simulation not running. Call init first"
- **23:53:13** - State flips to running, "Step 0 of 0 complete"
- **~6 minutes** - Engine sits idle with no work
- **23:59:13** - Force killed after timeout
- **23:59:14** - "Engine crashed (exit code: 62097)"

**Translation**: Init and start had a race, config produced zero steps, and force-kill was mislabeled as "crash."

## What Was Fixed

### 1. Race Condition → Idempotent Operations
- ✅ Can call `start()` then `sendInit()` in any order
- ✅ Duplicate calls are safe no-ops
- ✅ Commands refuse to run until fully initialized

### 2. Empty Schedule → Validation
- ✅ Rejects `maxSteps <= 0` upfront
- ✅ Rejects `populationSize <= 0` upfront
- ✅ Logs planned steps before running

### 3. False Crashes → Smart Shutdown
- ✅ 100ms timeout if never stepped (vs 2000ms)
- ✅ Distinguishes forced termination from real crashes
- ✅ Tracks whether engine ever did work

### 4. Diagnostic Blind Spots → Correlation IDs
- ✅ Every command gets `[CMD:N]` prefix
- ✅ Every event gets `[EVT:N]` prefix
- ✅ Easy to correlate commands with responses

## Diagnostic Output (After Fix)

### Good Run:
```
[CMD:1] Starting engine: node main.js
[EVT:1] Engine process started successfully
[EVT:1] Sending pending init command
[CMD:2] Init: maxSteps=10000, population=100
[EVT:2] Engine initialized: tick=0, planned_steps=10000
[CMD:3] Step: steps=1, current_tick=0, planned=10000
[EVT:3] Step complete: tick=1/10000
[CMD:4] Stopping (timeout=2000ms, ever_stepped=true)
[EVT:4] Stopped cleanly
```

### Empty Config (Now Caught):
```
[CMD:2] Init: maxSteps=0, population=100
ERROR: Invalid configuration: maxSteps=0 (must be > 0)
(Engine refuses to proceed)
```

### Fast Idle Stop:
```
[CMD:3] Stopping (timeout=100ms, ever_stepped=false)
[EVT:3] Stopped cleanly
(Completes in ~100ms, not 2000ms)
```

## Files Changed

1. **qt-gui/src/core/EngineClient.h** - Added tracking fields
2. **qt-gui/src/core/EngineClient.cpp** - Implemented all fixes
3. **qt-gui/src/ui/MainWindow.cpp** - Simplified to use new API

## How to Test

```bash
# From qt-gui directory
cd build
cmake --build .

# Run the GUI
./bin/EcoSysX
```

### Test Checklist:
- [ ] Start → no "not running" errors
- [ ] Set maxSteps=0 → rejected with clear error
- [ ] Start → Stop immediately → fast shutdown (~100ms)
- [ ] Start → Run steps → Stop → graceful shutdown
- [ ] Check logs for correlation IDs `[CMD:N]` and `[EVT:N]`

## Key Code Locations

### Idempotent Start/Init:
```cpp
// qt-gui/src/core/EngineClient.cpp:117-169
void EngineClient::start() {
    if (m_state == Running || m_state == Stepping) return;  // Safe
    // ...
}

void EngineClient::sendInit(config) {
    if (m_initialized) return;  // Safe
    if (m_initPending) return;  // Safe
    
    // Validate
    if (maxSteps <= 0) {
        emit errorOccurred(...);
        return;
    }
    
    // Queue or send immediately
}
```

### Smart Shutdown:
```cpp
// qt-gui/src/core/EngineClient.cpp:171-213
void EngineClient::stop() {
    int timeout = (m_lastStepIndex < 0) 
        ? FAST_STOP_TIMEOUT_MS   // 100ms
        : GRACEFUL_STOP_TIMEOUT_MS;  // 2000ms
    
    // Wait with appropriate timeout
    // Distinguish forced termination from crash
}
```

### Correlation Logging:
```cpp
// Every command:
emit logMessage(QString("[CMD:%1] Action: arg=%2")
               .arg(++m_commandId)
               .arg(arg));

// Every event:
emit logMessage(QString("[EVT:%1] Result: value=%2")
               .arg(m_commandId)
               .arg(value));
```

## Migration (If You Have Custom Code)

**Old (fragile):**
```cpp
client->start();
// hope it's ready...
client->sendInit(config);
```

**New (robust):**
```cpp
client->start();
client->sendInit(config);  // Queued if needed, safe!
```

## Next Steps

1. **Build & Test**: Verify all scenarios work
2. **Monitor Logs**: Check for `[CMD:N]` / `[EVT:N]` correlation
3. **Validate Configs**: Ensure no "Step 0 of 0" appears
4. **Report Issues**: Any new edge cases

## Performance Impact

- Startup: Same (init just queued smarter)
- Idle shutdown: **1900ms faster** (100ms vs 2000ms)
- Active shutdown: Same (still 2000ms graceful)
- Memory: +~100 bytes per EngineClient

## Questions?

**Q: Can I still call start() multiple times?**  
A: Yes! It's idempotent now. Subsequent calls are no-ops.

**Q: What if config changes after init?**  
A: Call `stop()`, wait for stopped signal, then `start()` + `sendInit()` again.

**Q: How do I know if init succeeded?**  
A: Wait for `started()` signal (emitted after init response).

**Q: What about the "crash" error?**  
A: Fixed. Force termination during shutdown is now logged as "terminated by supervisor" not "crashed."

---

**Status**: ✅ All fixes implemented  
**Testing**: Ready for verification  
**Documentation**: `ENGINE_RACE_CONDITION_FIX.md` (detailed)
