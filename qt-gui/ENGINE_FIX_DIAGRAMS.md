# Engine State Machine - Before & After

## BEFORE: Race Condition Vulnerable

```
User                MainWindow           EngineClient         Node Process
  |                      |                     |                    |
  |--[Click Start]------>|                     |                    |
  |                      |--start()----------->|                    |
  |                      |                     |--spawn process---->|
  |                      |                     |                    |
  |                      |<--started() signal--|<--process ready----|
  |                      |                     |                    |
  |                      |--sendInit(cfg)----->|                    |
  |                      |                     |--{"op":"init"}---->|
  |                      |                     |                    |
  |--[Click Step]------->|                     |                    |
  |  (TOO FAST!)         |--sendStep(1)------->|                    |
  |                      |                     |--{"op":"step"}---->|
  |                      |                     |                    |
  |                      |                     |<--ERROR: not init--|
  |                      |<--errorOccurred()---|                    |
  |<--[ERROR DIALOG]-----|                     |                    |
  
  PROBLEM: Commands can arrive before init completes!
```

## AFTER: Race-Free with Idempotent Operations

```
User                MainWindow           EngineClient         Node Process
  |                      |                     |                    |
  |--[Click Start]------>|                     |                    |
  |                      |--start()----------->|                    |
  |                      |--sendInit(cfg)----->|(queued)            |
  |                      |                     |                    |
  |                      |                     |--spawn process---->|
  |                      |                     |                    |
  |                      |                     |<--process ready----|
  |                      |                     |                    |
  |                      |                     |--{"op":"init"}---->|
  |                      |                     |  (auto-sent)       |
  |                      |                     |                    |
  |--[Click Step]------->|                     |                    |
  |  (ANY TIME OK!)      |--sendStep(1)------->|                    |
  |                      |                     |(checks initialized)|
  |                      |                     |--{"op":"step"}---->|
  |                      |                     |                    |
  |                      |                     |<--{tick:1}---------|
  |                      |<--stepped(1)--------|                    |
  |<--[Update UI]--------|                     |                    |
  
  SOLUTION: Init queued and auto-sent; commands wait for initialized flag
```

## Configuration Validation - Before & After

### BEFORE: Empty Schedule Allowed

```
Configuration
┌─────────────────────┐
│ maxSteps: 0         │ ❌ Not validated
│ population: 100     │
└─────────────────────┘
         │
         ▼
   EngineClient
         │
         ▼
   {"op":"init"}
         │
         ▼
    Node Engine
         │
         ▼
  "Step 0 of 0 complete"  💀 Empty run!
```

### AFTER: Validation Gates

```
Configuration
┌─────────────────────┐
│ maxSteps: 0         │
│ population: 100     │
└─────────────────────┘
         │
         ▼
   sendInit(cfg)
         │
         ├─ if maxSteps <= 0 ──> ❌ REJECT with error
         │                         "maxSteps must be > 0"
         ├─ if population <= 0 ─> ❌ REJECT with error
         │                         "populationSize must be > 0"
         │
         ▼
   ✅ Valid config only proceeds
         │
         ▼
   {"op":"init"}
         │
         ▼
    Node Engine
         │
         ▼
  "Initialized: planned_steps=10000"  ✅ Real work!
```

## Shutdown - Before & After

### BEFORE: Fixed Timeout

```
Engine State: IDLE (never stepped)
         │
         ▼
    stop() called
         │
         ├─ sendStop()
         ├─ waitForFinished(2000ms)  ⏱️ Always 2 seconds
         │     │
         │     └─ TIMEOUT (nothing to stop)
         │
         ├─ terminate()  🔨 Force kill
         │
         ▼
  "Engine crashed (62097)"  ❌ False alarm!
```

### AFTER: Smart Timeout

```
Engine State: IDLE (m_lastStepIndex = -1)
         │
         ▼
    stop() called
         │
         ├─ Check activity: never stepped
         ├─ Use FAST_TIMEOUT (100ms)  ⚡
         ├─ sendStop() (skipped - not initialized)
         ├─ waitForFinished(100ms)
         │     │
         │     └─ Completes quickly
         │
         ▼
  "Stopped cleanly"  ✅ Fast & correct!

────────────────────────────────────────

Engine State: ACTIVE (m_lastStepIndex = 42)
         │
         ▼
    stop() called
         │
         ├─ Check activity: stepped 42 times
         ├─ Use GRACEFUL_TIMEOUT (2000ms)  ⏱️
         ├─ sendStop()
         ├─ waitForFinished(2000ms)
         │     │
         │     └─ Clean shutdown
         │
         ▼
  "Stopped cleanly"  ✅ Graceful & correct!
```

## State Tracking - Before & After

### BEFORE: Minimal State

```
EngineClient {
    m_state: Running | Idle | Error
    m_currentTick: 42
}

❌ Can't tell if engine ever did work
❌ Can't tell if init completed
❌ Can't optimize shutdown
```

### AFTER: Rich State Tracking

```
EngineClient {
    // Lifecycle
    m_state: Running | Idle | Error | Starting | Stopping
    m_initialized: true           ✅ Init completed?
    m_initPending: false          ✅ Init in progress?
    
    // Progress
    m_currentTick: 42             ✅ Current step
    m_lastStepIndex: 42           ✅ Last successful step
    m_plannedSteps: 10000         ✅ Expected total
    
    // Queuing
    m_pendingConfig: {...}        ✅ Queued init
    
    // Diagnostics
    m_commandId: 15               ✅ Correlation tracking
}

✅ Know exactly where we are
✅ Can optimize based on activity
✅ Can correlate commands/events
```

## Diagnostic Logging - Before & After

### BEFORE: Opaque

```
[INFO] Starting engine...
[INFO] Engine started
[INFO] Sending init command
[ERROR] Simulation not running  ❓ Which command?
[INFO] Step complete            ❓ Which step?
[INFO] Stopping engine...
[ERROR] Engine crashed           ❓ Real crash or timeout?
```

### AFTER: Correlation IDs

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

✅ Clear command → event flow
✅ Can reconstruct entire timeline
✅ Distinguishes crashes from termination
```

## Data Flow - Complete Picture

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ [Click Start]
       ▼
┌─────────────────────┐
│    MainWindow       │
│  (UI Thread)        │
└──────┬──────────────┘
       │ QMetaObject::invokeMethod
       ▼
┌─────────────────────────────────────┐
│         EngineClient                │
│       (Worker Thread)               │
│                                     │
│  start() ──────┐                    │
│                ├──> m_initialized   │
│  sendInit() ───┘     m_initPending  │
│                      m_pendingConfig│
│                                     │
│  onProcessStarted() ──┐             │
│                       ├──> Auto-send│
│  handleResponse() ────┘     queued  │
│                             init    │
└──────┬──────────────────────────────┘
       │ QProcess stdio
       ▼
┌─────────────────────┐
│  Node.js Process    │
│  (engine_sidecar)   │
│                     │
│  {"op":"init"}      │
│  {"op":"step"}      │
│  {"op":"snapshot"}  │
│  {"op":"stop"}      │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│   Genesis Engine    │
│  (Simulation Core)  │
└─────────────────────┘

Key Properties:
✅ Thread-safe (QueuedConnection)
✅ Idempotent operations
✅ Auto-queuing when needed
✅ Validation at boundaries
✅ Clear error propagation
```

## Error Propagation - Before & After

### BEFORE: Confusing

```
MainWindow ─> EngineClient ─> Process ─> Engine
                     │
                     └─> ❌ Race: "not running"
                     └─> ❌ Silent: "0 of 0"
                     └─> ❌ Misleading: "crashed"
```

### AFTER: Clear

```
MainWindow ─> EngineClient ─> Process ─> Engine
                     │
                     ├─> ✅ Validation: "maxSteps must be > 0"
                     ├─> ✅ State check: "engine not initialized"
                     ├─> ✅ Exit reason: "terminated by supervisor"
                     └─> ✅ Progress log: "tick=42/10000"
```

## Summary: Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Race Safety** | ❌ Vulnerable | ✅ Idempotent |
| **Config Validation** | ❌ None | ✅ Upfront |
| **Shutdown Speed** | 🐌 2s always | ⚡ 100ms idle |
| **Exit Reasons** | ❌ Misleading | ✅ Clear |
| **Diagnostics** | 🌫️ Opaque | 🔍 Correlated |
| **State Tracking** | 🤷 Minimal | 📊 Rich |

---

**Legend:**
- `──>` : Function call / message
- `<--` : Return / signal
- `✅` : Problem solved
- `❌` : Problem present
- `⏱️` : Timeout
- `🔨` : Force kill
- `⚡` : Fast operation
- `💀` : Critical issue
