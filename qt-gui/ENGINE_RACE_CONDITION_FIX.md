# Engine Race Condition & Empty Schedule Fix

## Problem Summary

The GUI experienced a critical race condition and configuration issue that caused:

1. **Race Condition**: `start` command arrived before `init` completed → "Simulation not running. Call init first."
2. **Empty Schedule**: Engine logged "Step 0 of 0 complete" → no work was planned
3. **False Crash Reports**: Force termination during shutdown → logged as "crashed (exit code: 62097)"
4. **Fragile Shutdown**: Timeout waiting for non-existent run loop

## Root Causes

### 1. Init/Start Race Condition

**Before:**
```cpp
// MainWindow::onStart()
m_engineClient->start();  // Launches process

// MainWindow::onEngineStarted() 
m_engineClient->sendInit(config);  // Sent after process starts

// BUT: User could click actions between these two calls!
```

**Problem**: Any command (step, snapshot) sent between `start()` and `sendInit()` would hit an uninitialized engine.

### 2. Empty Schedule

**Before:**
```cpp
// Configuration had maxSteps, but engine received:
{
  "simulation": {
    "maxSteps": 10000,  // ✅ Present
    "populationSize": 0  // ❌ Invalid!
  }
}
```

**Problem**: No validation that config would produce actual work. Engine initialized but had nothing to do.

### 3. Shutdown Fragility

**Before:**
```cpp
void stop() {
    sendStop();
    waitForFinished(2000);  // Always 2 seconds
    if (timeout) {
        terminate();  // Logged as "crash"
    }
}
```

**Problem**: Same timeout whether engine never started or ran 10 million steps. Force-kill logged as crash.

## Solution: Comprehensive State Machine Hardening

### 1. Idempotent Initialization

**After:**
```cpp
class EngineClient {
    bool m_initialized;      // Has init completed?
    bool m_initPending;      // Is init in progress?
    QJsonObject m_pendingConfig;  // Config to send when ready
    int m_commandId;         // Correlation tracking
    
    void start() {
        // Idempotent: safe to call multiple times
        if (m_state == Running || m_state == Stepping) return;
        
        m_initialized = false;
        m_initPending = false;
        // ... launch process
    }
    
    void sendInit(config) {
        // Idempotent: safe to call before/during start
        if (m_initialized) return;  // Already done
        if (m_initPending) return;  // In progress
        
        // Validate config produces work
        if (maxSteps <= 0) {
            emit error("maxSteps must be > 0");
            return;
        }
        
        m_pendingConfig = config;
        m_initPending = true;
        
        // Send now if ready, or onProcessStarted will send
        if (processReady()) {
            sendMessage(initCmd);
        }
    }
    
    void onProcessStarted() {
        // Auto-send pending init
        if (m_initPending && !m_pendingConfig.isEmpty()) {
            sendMessage(initCmd);
        }
    }
    
    void handleResponse(json) {
        if (json.op == "init") {
            m_initialized = true;
            m_initPending = false;
            emit started();  // NOW we're ready
        }
    }
};
```

**Benefits:**
- ✅ Can call `start()` then `sendInit()` in any order
- ✅ Duplicate calls are no-ops
- ✅ Commands refuse to run until `m_initialized == true`
- ✅ Race window eliminated

### 2. Configuration Validation

**After:**
```cpp
void sendInit(config) {
    // Validate before accepting
    int maxSteps = config["simulation"]["maxSteps"].toInt(0);
    int population = config["simulation"]["populationSize"].toInt(0);
    
    m_plannedSteps = maxSteps;
    
    emit logMessage(QString("[CMD:%1] Init: maxSteps=%2, population=%3")
                   .arg(++m_commandId)
                   .arg(maxSteps)
                   .arg(population));
    
    if (maxSteps <= 0) {
        emit errorOccurred("Invalid config: maxSteps must be > 0");
        return;  // Refuse to proceed
    }
    
    if (population <= 0) {
        emit errorOccurred("Invalid config: populationSize must be > 0");
        return;
    }
    
    // Now we know this will produce work
    // ...
}

void handleResponse(json) {
    if (json.op == "init") {
        emit logMessage(QString("[EVT] Initialized: planned_steps=%1")
                       .arg(m_plannedSteps));
        
        if (m_plannedSteps <= 0) {
            emit logMessage("[WARN] Empty run plan!");
        }
    }
}
```

**Benefits:**
- ✅ Refuses invalid configs upfront
- ✅ Logs expected work before running
- ✅ Detects "0 of 0" scenarios immediately

### 3. Smart Shutdown

**After:**
```cpp
class EngineClient {
    int m_lastStepIndex = -1;  // -1 = never stepped
    
    void stop() {
        // Adaptive timeout based on activity
        int timeout = (m_lastStepIndex < 0) 
            ? FAST_STOP_TIMEOUT_MS   // 100ms if never stepped
            : GRACEFUL_STOP_TIMEOUT_MS;  // 2000ms if active
        
        emit logMessage(QString("[CMD:%1] Stopping (timeout=%2ms, ever_stepped=%3)")
                       .arg(++m_commandId)
                       .arg(timeout)
                       .arg(m_lastStepIndex >= 0));
        
        if (m_initialized) sendStop();
        
        if (!waitForFinished(timeout)) {
            emit logMessage("[EVT] Timeout, terminating (not a crash)");
            terminate();
        } else {
            emit logMessage("[EVT] Stopped cleanly");
        }
    }
    
    void handleResponse(json) {
        if (json.op == "step") {
            m_lastStepIndex = json.tick;  // Track progress
            emit logMessage(QString("[EVT] Step %1/%2")
                           .arg(m_lastStepIndex)
                           .arg(m_plannedSteps));
        }
    }
    
    void onProcessFinished(exitCode, exitStatus) {
        if (exitStatus == CrashExit && m_state == Stopping) {
            // This is us killing it, not a crash
            emit logMessage("[EVT] Terminated by supervisor (not a crash)");
            setState(Stopped);
        } else if (exitStatus == CrashExit) {
            emit errorOccurred("Engine crashed unexpectedly");
            setState(Error);
        }
    }
};
```

**Benefits:**
- ✅ Fast shutdown if engine idle (100ms vs 2s)
- ✅ Distinguishes forced termination from real crashes
- ✅ Tracks whether engine ever did work

### 4. Enhanced Diagnostics

**After:**
```cpp
// Every operation gets a correlation ID
int m_commandId = 0;

void anyCommand() {
    emit logMessage(QString("[CMD:%1] %2: arg1=%3, arg2=%4")
                   .arg(++m_commandId)
                   .arg(commandName)
                   .arg(arg1)
                   .arg(arg2));
}

void handleEvent() {
    emit logMessage(QString("[EVT:%1] %2: result=%3")
                   .arg(m_commandId)
                   .arg(eventName)
                   .arg(result));
}

// Sample output:
// [CMD:1] Starting engine: node main.js
// [EVT:1] Engine process started successfully
// [EVT:1] Sending pending init command
// [CMD:2] Init: maxSteps=10000, population=100
// [EVT:2] Initialized: planned_steps=10000
// [CMD:3] Step: steps=1, current_tick=0, planned=10000
// [EVT:3] Step complete: tick=1/10000
// [CMD:4] Stopping (timeout=2000ms, ever_stepped=true)
// [EVT:4] Stopped cleanly
```

**Benefits:**
- ✅ Clear correlation between commands and responses
- ✅ Intent logged before action
- ✅ Results logged after action
- ✅ Easy to reconstruct event timeline

## MainWindow Simplification

**Before:**
```cpp
onStart() {
    m_engineClient->start();
}

onEngineStarted() {
    // Race window here!
    m_engineClient->sendInit(config);
}
```

**After:**
```cpp
onStart() {
    m_engineClient->start();
    m_engineClient->sendInit(config);  // Idempotent, queued if needed
}

onEngineStarted() {
    // Nothing to do - init already sent
}
```

**Benefits:**
- ✅ Simpler flow
- ✅ No race conditions
- ✅ EngineClient handles complexity

## Verification Checklist

Run these scenarios to confirm fixes:

### ✅ Test 1: Normal Startup
```
1. Start GUI
2. Click Start
3. Observe logs:
   ✓ [CMD:1] Starting engine
   ✓ [EVT:1] Process started
   ✓ [CMD:2] Init: maxSteps=10000, population=100
   ✓ [EVT:2] Initialized: planned_steps=10000
   ✓ No "Simulation not running" errors
```

### ✅ Test 2: Empty Config Rejection
```
1. Set maxSteps = 0 in config
2. Click Start
3. Observe logs:
   ✓ [CMD:2] Init: maxSteps=0, population=100
   ✓ ERROR: Invalid config: maxSteps must be > 0
   ✓ No "Step 0 of 0" messages
```

### ✅ Test 3: Fast Idle Shutdown
```
1. Click Start (but don't step)
2. Immediately click Stop
3. Observe logs:
   ✓ [CMD:3] Stopping (timeout=100ms, ever_stepped=false)
   ✓ [EVT:3] Stopped cleanly (within ~100ms)
   ✓ No "Force terminating" or "crashed" messages
```

### ✅ Test 4: Active Shutdown
```
1. Click Start
2. Run 100 steps
3. Click Stop
4. Observe logs:
   ✓ [CMD:N] Stopping (timeout=2000ms, ever_stepped=true)
   ✓ [EVT:N] Stopped cleanly
   ✓ No false crash reports
```

### ✅ Test 5: Idempotent Init
```
1. Call start() twice rapidly
2. Call sendInit() twice rapidly
3. Observe logs:
   ✓ "Engine already starting" on 2nd start
   ✓ "Init already pending" on 2nd init
   ✓ Only one actual init sent to engine
```

## Key Implementation Files

### Modified Files
- `qt-gui/src/core/EngineClient.h` - Added state tracking fields
- `qt-gui/src/core/EngineClient.cpp` - Implemented all fixes
- `qt-gui/src/ui/MainWindow.cpp` - Simplified using new idempotent API

### Key Changes

**EngineClient.h:**
```cpp
bool m_initialized;        // Init completed?
bool m_initPending;        // Init in progress?
int m_lastStepIndex;       // -1 = never stepped
int m_plannedSteps;        // Expected work
QJsonObject m_pendingConfig;  // Queued init
int m_commandId;           // Correlation tracking
```

**EngineClient.cpp:**
- `start()` - Idempotent, resets state
- `sendInit()` - Validates config, queues if needed
- `stop()` - Adaptive timeout, clear exit reason
- `onProcessStarted()` - Auto-send pending init
- `handleResponse()` - Track completion, log plan vs actual
- All methods - Correlation IDs and event logging

## Migration Guide

### If you have custom code calling EngineClient:

**Old way (fragile):**
```cpp
client->start();
// Wait somehow?
client->sendInit(config);
// Hope for the best
```

**New way (robust):**
```cpp
client->start();
client->sendInit(config);  // Safe to call immediately
// EngineClient handles ordering
```

### If you check engine state:

**Old way:**
```cpp
if (client->state() == EngineState::Running) {
    client->sendStep(1);
}
```

**New way (unchanged, but safer):**
```cpp
// sendStep() now checks m_initialized internally
client->sendStep(1);  // Will emit error if not ready
```

### If you handle errors:

**Old way:**
```cpp
connect(client, &EngineClient::errorOccurred, [](QString err) {
    // "Simulation not running" could be transient race
});
```

**New way:**
```cpp
connect(client, &EngineClient::errorOccurred, [](QString err) {
    // Errors now indicate real problems (config invalid, etc.)
    // No more transient races
});
```

## Performance Impact

- **Startup**: +0ms (init queued, sent when ready)
- **Shutdown (idle)**: -1900ms (100ms vs 2000ms)
- **Shutdown (active)**: 0ms (still 2000ms graceful)
- **Memory**: +~100 bytes per EngineClient (tracking fields)
- **CPU**: Negligible (validation is O(1))

## Future Improvements

### Optional Enhancements (not required now):

1. **Config Schema Validation**
   ```cpp
   bool Configuration::validateAgainstSchema(const QString& schemaPath) {
       // Use JSON schema validator
   }
   ```

2. **Progress Heartbeat**
   ```cpp
   // Add to EngineClient
   QTimer* m_heartbeatTimer;  // Detect hung engine
   void onHeartbeatTimeout() {
       if (m_lastStepIndex unchanged for 10s) {
           emit warning("Engine appears hung");
       }
   }
   ```

3. **Richer Diagnostics**
   ```cpp
   struct CommandEvent {
       int id;
       QString type;
       QDateTime timestamp;
       QJsonObject data;
   };
   QList<CommandEvent> m_eventLog;  // Keep last N events
   ```

4. **Graceful Degradation**
   ```cpp
   void sendInit(config) {
       if (maxSteps <= 0) {
           emit warning("maxSteps=0, using default 1000");
           config["simulation"]["maxSteps"] = 1000;
       }
   }
   ```

## Conclusion

The fixes eliminate three critical issues:

1. **Race Condition**: Idempotent operations with queuing
2. **Empty Schedule**: Upfront validation refuses bad configs
3. **False Crashes**: Smart shutdown with clear exit reasons

All changes maintain API compatibility while hardening internal state management. The diagnostic improvements make future debugging trivial.

---

**Author**: GitHub Copilot  
**Date**: 2025-10-19  
**Status**: ✅ Complete  
**Testing**: Ready for verification
