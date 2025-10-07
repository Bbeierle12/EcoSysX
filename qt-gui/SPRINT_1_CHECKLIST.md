# Phase 2: Sprint 1 — Foundations

## Overview
Sprint 1 establishes the core communication layer between the Qt GUI and the Node.js sidecar, implements configuration management with validation, and creates the event logging system.

**Sprint Goal**: Enable basic GUI-to-engine communication with Start/Stop/Step controls, configuration editing, and event visibility.

**Duration**: Estimated 2-3 weeks  
**Started**: October 6, 2025

---

## Sprint 1 Objectives

From the main README (Section 20 - Milestones):

> **Sprint 1 — Foundations**
> - Shell app
> - Engine Client (start/stop, send/receive)
> - Config Panel with minimal fields and validation
> - Event Log

### Acceptance Criteria
- [x] Phase 1 complete (foundation in place)
- [ ] EngineClient can start/stop sidecar process
- [ ] EngineClient sends and receives JSON-RPC messages
- [ ] Config Panel displays editable configuration fields
- [ ] Config Panel validates input before sending to engine
- [ ] Event Log displays lifecycle messages
- [ ] MainWindow integrates all components
- [ ] Basic error handling and recovery

---

## Component Breakdown

### 1. EngineClient (Core Communication Layer)

**Purpose**: Manages IPC with Node.js sidecar via JSON-RPC over stdio/socket.

**Files to Create**:
- [ ] `src/core/EngineClient.h`
- [ ] `src/core/EngineClient.cpp`
- [ ] `tests/unit/tst_engineclient_unit.cpp`

**Key Features**:
- Start/stop sidecar process (QProcess)
- Send JSON-RPC requests (init, step, snapshot, stop)
- Parse JSON-RPC responses
- Emit signals for lifecycle events
- Error handling and reconnection logic
- Thread-safe operation (runs on worker thread)

**Signals**:
```cpp
void started();
void stopped();
void stepped(int tick);
void snapshotReceived(const QJsonObject& snapshot);
void errorOccurred(const QString& message);
void stateChanged(EngineState state);
```

**API Methods**:
```cpp
void start();
void stop();
void sendInit(const QJsonObject& config);
void sendStep(int steps);
void requestSnapshot(const QString& type); // "metrics" or "full"
bool isRunning() const;
EngineState state() const;
```

---

### 2. Configuration Management

**Purpose**: Model, validate, and serialize engine configuration matching EngineConfigV1 schema.

**Files to Create**:
- [ ] `src/core/Configuration.h`
- [ ] `src/core/Configuration.cpp`
- [ ] `src/utils/ValidationUtils.h`
- [ ] `src/utils/ValidationUtils.cpp`
- [ ] `tests/unit/tst_configuration.cpp`

**Configuration Structure** (matches engine schema):
```cpp
struct SimulationConfig {
    int maxSteps;
    double worldSize;
};

struct AgentsConfig {
    int initialPopulation;
    struct { double min, max; } movementSpeed;
    struct { double min, max; } energyRange;
    bool reproductionEnabled;
};

struct DiseaseConfig {
    bool enabled;
    double transmissionRate;
    double recoveryRate;
    double mortalityRate;
};

struct EnvironmentConfig {
    bool resourceRegeneration;
    double resourceDensity;
};

struct RngConfig {
    int seed;
    bool independentStreams;
};

class Configuration {
public:
    // Getters/setters for all config sections
    QJsonObject toJson() const;
    bool fromJson(const QJsonObject& json);
    bool validate(QStringList& errors) const;
    static Configuration defaults();
};
```

**Validation Rules**:
- Population size > 0
- World size > 0
- Disease rates between 0 and 1
- Min ≤ Max for all ranges
- Max steps > 0

---

### 3. ConfigPanel (UI)

**Purpose**: User interface for editing simulation configuration with inline validation.

**Files to Create**:
- [ ] `src/ui/panels/ConfigPanel.h`
- [ ] `src/ui/panels/ConfigPanel.cpp`
- [ ] `src/ui/panels/ConfigPanel.ui` (Qt Designer file)
- [ ] `tests/integration/tst_configpanel.cpp`

**UI Layout** (Left Dock):
```
┌─────────────────────────────────┐
│ Configuration                   │
├─────────────────────────────────┤
│ Simulation                      │
│   Max Steps: [10000]            │
│   World Size: [100.0]           │
│                                 │
│ Agents                          │
│   Population: [100]             │
│   Movement Speed:               │
│     Min: [0.5]  Max: [2.0]      │
│   Energy Range:                 │
│     Min: [50.0] Max: [100.0]    │
│   ☑ Reproduction Enabled        │
│                                 │
│ Disease                         │
│   ☑ Enabled                     │
│   Transmission: [0.3] (0-1)     │
│   Recovery: [0.1] (0-1)         │
│   Mortality: [0.05] (0-1)       │
│                                 │
│ Environment                     │
│   ☑ Resource Regeneration       │
│   Density: [1.0]                │
│                                 │
│ RNG                             │
│   Seed: [42]                    │
│   ☑ Independent Streams         │
│                                 │
│ [Load...] [Save...] [Reset]     │
└─────────────────────────────────┘
```

**Features**:
- Inline validation with red borders/tooltips for invalid fields
- Load/Save configuration from/to JSON files
- Reset to defaults button
- Disable editing while simulation is running
- Emit signal when configuration changes

**Signals**:
```cpp
void configurationChanged(const Configuration& config);
void validationStateChanged(bool isValid);
```

---

### 4. EventLogPanel (UI)

**Purpose**: Display lifecycle events, errors, and diagnostic messages.

**Files to Create**:
- [ ] `src/ui/panels/EventLogPanel.h`
- [ ] `src/ui/panels/EventLogPanel.cpp`
- [ ] `tests/unit/tst_eventlog.cpp`

**UI Layout** (Bottom Dock):
```
┌──────────────────────────────────────────────────────────┐
│ Event Log                              [Clear] [Export]   │
├──────────────────────────────────────────────────────────┤
│ 14:32:01 [INFO]  Engine started                          │
│ 14:32:01 [INFO]  Configuration loaded                    │
│ 14:32:05 [INFO]  Stepped to tick 50                      │
│ 14:32:06 [INFO]  Snapshot received (metrics)             │
│ 14:32:10 [WARN]  High memory usage detected              │
│ 14:32:15 [ERROR] Connection to sidecar lost              │
│ 14:32:16 [INFO]  Engine stopped                          │
└──────────────────────────────────────────────────────────┘
```

**Features**:
- Timestamped messages
- Severity levels (INFO, WARN, ERROR)
- Color-coded entries
- Auto-scroll to latest
- Clear log button
- Export log to file
- Filterable by severity

**API**:
```cpp
void logInfo(const QString& message);
void logWarning(const QString& message);
void logError(const QString& message);
void clear();
bool exportToFile(const QString& path);
```

---

### 5. MainWindow Integration

**Purpose**: Orchestrate all components and provide the main application interface.

**Files to Update**:
- [ ] `src/ui/MainWindow.h`
- [ ] `src/ui/MainWindow.cpp`
- [ ] `src/ui/MainWindow.ui`

**UI Layout**:
```
┌────────────────────────────────────────────────────────────┐
│ File  Edit  View  Help                                    │
├────────────────────────────────────────────────────────────┤
│ [▶ Start] [■ Stop] [Step 1] [Step 10] [Step 100]          │
│ Progress: ████████░░░░░░░░░░░░░░ Tick: 1234/10000         │
├───────┬────────────────────────────────────────────┬───────┤
│Config │                                            │Metrics│
│       │                                            │       │
│       │           World View                       │       │
│       │         (placeholder)                      │       │
│       │                                            │       │
├───────┴────────────────────────────────────────────┴───────┤
│ Event Log                                                  │
└────────────────────────────────────────────────────────────┘
```

**Key Responsibilities**:
- Create and layout all dock widgets
- Create EngineClient on worker thread
- Connect signals between components
- Implement action handlers (Start, Stop, Step)
- Manage application state (Idle, Starting, Running, Stopped, Error)
- Save/restore window layout

**State Machine**:
```
     Idle
       │
       ├─[Start]──→ Starting
       │              │
       │              ├─[Success]──→ Running
       │              │                │
       │              │                ├─[Step]────→ Running
       │              │                ├─[Stop]────→ Stopped
       │              │                └─[Error]───→ Error
       │              │
       │              └─[Error]────→ Error
       │
       └─[any Error]──→ Error
                         │
                         └─[Restart]──→ Idle
```

---

## Implementation Order

### Week 1: Core Infrastructure
1. **Day 1-2**: EngineClient basic structure
   - [ ] Create class files
   - [ ] Implement QProcess management
   - [ ] JSON-RPC message formatting
   - [ ] Signal/slot definitions

2. **Day 3-4**: Configuration & Validation
   - [ ] Configuration class
   - [ ] Validation utilities
   - [ ] JSON serialization/deserialization
   - [ ] Unit tests

3. **Day 5**: Event Log Panel
   - [ ] Create EventLogPanel UI
   - [ ] Implement logging methods
   - [ ] Color coding and filtering

### Week 2: UI Components
4. **Day 1-3**: Config Panel
   - [ ] Create UI layout
   - [ ] Wire up form fields
   - [ ] Implement inline validation
   - [ ] Load/Save functionality

5. **Day 4-5**: MainWindow Integration
   - [ ] Update MainWindow layout
   - [ ] Create dock widgets
   - [ ] Implement action handlers
   - [ ] Connect all signals

### Week 3: Testing & Polish
6. **Day 1-2**: Unit Tests
   - [ ] EngineClient tests (with FakeTransport)
   - [ ] Configuration tests
   - [ ] Validation tests

7. **Day 3-4**: Integration Tests
   - [ ] MainWindow flow tests
   - [ ] Config Panel validation tests
   - [ ] End-to-end communication tests

8. **Day 5**: Documentation & Polish
   - [ ] Update documentation
   - [ ] Bug fixes
   - [ ] Code review
   - [ ] Sprint retrospective

---

## Technical Decisions

### Threading Strategy
- **UI Thread**: MainWindow, ConfigPanel, EventLogPanel
- **Worker Thread**: EngineClient (to avoid blocking UI)
- **Communication**: Qt signals/slots (thread-safe)

### IPC Protocol
- **Transport**: stdio (QProcess) initially, socket optional later
- **Format**: Line-delimited JSON (one message per line)
- **Message Structure**:
  ```json
  // Request
  {"op": "init|step|snapshot|stop", "params": {...}}
  
  // Response
  {"status": "ok|error", "data": {...}, "error": "..."}
  ```

### Error Handling
- All errors surface to EventLog
- EngineClient emits `errorOccurred` signal
- MainWindow transitions to Error state
- User can retry after error (auto-restart sidecar)

### Configuration Storage
- **Format**: JSON matching EngineConfigV1
- **Location**: User's config directory (QStandardPaths)
- **Auto-save**: Last used config on successful start

---

## Dependencies

### External (already available)
- Qt 6 (Core, Widgets, Network)
- Node.js runtime (for sidecar)
- Existing GenesisEngine package

### Internal (to be created)
- None yet (self-contained sprint)

---

## Testing Strategy

### Unit Tests
- [ ] Configuration validation rules
- [ ] JSON serialization/deserialization
- [ ] EngineClient message formatting
- [ ] EngineClient with FakeTransport (no real sidecar)

### Integration Tests
- [ ] MainWindow state transitions
- [ ] Config Panel → EngineClient flow
- [ ] EventLog message routing
- [ ] Full Start → Init → Step → Stop sequence

### Manual Testing Checklist
- [ ] Start button launches sidecar
- [ ] Config validation prevents invalid starts
- [ ] Event log shows all lifecycle events
- [ ] Stop button cleanly terminates sidecar
- [ ] Error conditions display properly
- [ ] Configuration persists across sessions

---

## Risks & Mitigations

### Risk: Sidecar Process Management
**Issue**: QProcess can be finicky across platforms  
**Mitigation**: Test on Windows/macOS/Linux early; add timeout and retry logic

### Risk: JSON Schema Mismatch
**Issue**: GUI config doesn't match engine schema  
**Mitigation**: Use engine's default config as source of truth; validate against fixtures

### Risk: Thread Synchronization
**Issue**: Signals between threads can deadlock  
**Mitigation**: Use Qt::QueuedConnection explicitly; avoid blocking calls

### Risk: UI Responsiveness
**Issue**: Long-running operations block UI  
**Mitigation**: All IPC on worker thread; use progress indicators

---

## Success Metrics

### Must Have (Sprint Complete)
- [ ] Application starts without errors
- [ ] Can configure and start sidecar process
- [ ] Can send step commands and receive responses
- [ ] Event log displays lifecycle messages
- [ ] Configuration validates before sending
- [ ] Can cleanly stop simulation

### Should Have
- [ ] Configuration load/save works
- [ ] Inline validation with visual feedback
- [ ] Error recovery without restart
- [ ] Unit tests passing

### Nice to Have
- [ ] Integration tests passing
- [ ] Cross-platform testing
- [ ] Performance profiling

---

## Deliverables

### Code
1. EngineClient (core/EngineClient.h/.cpp)
2. Configuration (core/Configuration.h/.cpp)
3. ValidationUtils (utils/ValidationUtils.h/.cpp)
4. ConfigPanel (ui/panels/ConfigPanel.h/.cpp/.ui)
5. EventLogPanel (ui/panels/EventLogPanel.h/.cpp)
6. Updated MainWindow (ui/MainWindow.h/.cpp/.ui)

### Tests
7. Unit tests (3+ test files)
8. Integration tests (2+ test files)

### Documentation
9. Updated README with Sprint 1 status
10. API documentation (inline Doxygen comments)
11. This sprint summary

---

## Next Sprint Preview

**Sprint 2 — Metrics First** will add:
- SnapshotBuffer (ring buffer for time-series)
- MetricsPanel (charts for population, energy, S/I/R)
- Batched stepping loop with throttling
- Progress bar with tick display

---

## Notes

*Use this section to track decisions, blockers, and important findings during the sprint*

### Decisions
- 

### Blockers
- 

### Important Findings
- 

---

**Sprint 1 Start Date**: October 6, 2025  
**Target Completion**: October 27, 2025  
**Status**: 🟡 In Progress
