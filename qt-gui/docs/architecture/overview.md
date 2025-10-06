# EcoSysX Qt GUI - Architecture Overview

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Qt GUI Application                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Config    │  │   Metrics    │  │   World View     │   │
│  │   Panel     │  │   Panel      │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Main Window                              │  │
│  │  ┌─────────────────────────────────────────────────┐ │  │
│  │  │         Engine Client (Worker Thread)           │ │  │
│  │  │  ┌────────────┐         ┌──────────────────┐   │ │  │
│  │  │  │   JSON-RPC │◄───────►│ Snapshot Buffer  │   │ │  │
│  │  │  └────────────┘         └──────────────────┘   │ │  │
│  │  └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ stdio/socket IPC
                       │ JSON-RPC Protocol
┌──────────────────────▼──────────────────────────────────────┐
│              Node.js Sidecar Process                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              GenesisEngine                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │  Agents  │  │   Mesa   │  │  Mason   │            │ │
│  │  │ Provider │  │ Provider │  │ Provider │            │ │
│  │  └──────────┘  └──────────┘  └──────────┘            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Qt GUI Layer
- **Main Window**: Application orchestration, layout management
- **Config Panel**: User input for simulation parameters
- **Metrics Panel**: Real-time chart display
- **World View**: 2D visualization of agents and environment
- **Event Log**: System messages and diagnostics

#### Core Logic Layer
- **Engine Client**: IPC management, message protocol
- **Snapshot Buffer**: Data retention, downsampling
- **Configuration**: Schema validation, serialization

#### Sidecar Process
- **GenesisEngine**: Simulation orchestration
- **Providers**: Pluggable simulation backends (Agents, Mesa, Mason)

## Threading Model

### UI Thread
- Handles all Qt widget updates
- Processes user input
- Renders charts and world view at 10-30 FPS

### Worker Thread
- Runs Engine Client
- Manages sidecar process
- Sends/receives JSON-RPC messages
- Emits signals on snapshot arrival

### Communication Pattern
```
UI Thread                 Worker Thread
    │                          │
    ├─ User clicks "Start" ────►│
    │                          │ Send init command
    │                          ├────────────► Sidecar
    │                          │◄────────────┐
    │◄─ Signal: initialized ───┤
    │                          │
    ├─ Update UI ──────────────┤
    │                          │
    │                          │ Send step command
    │                          ├────────────► Sidecar
    │                          │◄────────────┐
    │◄─ Signal: snapshotReady ┤
    │                          │
    ├─ Update charts & view ───┤
```

## IPC Protocol

### JSON-RPC Message Format

**Request**:
```json
{
  "op": "init|step|snapshot|stop",
  "params": { /* operation-specific */ }
}
```

**Response**:
```json
{
  "status": "ok|error",
  "data": { /* operation-specific */ },
  "error": "error message if status=error"
}
```

### Operations

- **init**: Initialize simulation with configuration
- **step(n)**: Execute n simulation steps
- **snapshot**: Request current state
- **stop**: Halt simulation

See [IPC Protocol Details](ipc_protocol.md) for complete specification.

## Data Flow

### Configuration Flow
```
User Input → ConfigPanel → Validation → JSON → EngineClient → Sidecar
```

### Metrics Flow
```
Sidecar → JSON → EngineClient → SnapshotBuffer → MetricsPanel → Charts
```

### World State Flow
```
Sidecar → Full Snapshot → SnapshotBuffer → WorldView → Render
```

## Error Handling Strategy

### Error Propagation
1. Sidecar errors → JSON error response
2. EngineClient catches → emits errorOccurred signal
3. MainWindow receives → updates UI state, logs event
4. User notified → can retry or reconfigure

### Recovery Strategy
- All errors return GUI to idle state
- Sidecar process can be restarted
- Configuration preserved for retry
- No unhandled exceptions in UI thread

## Performance Considerations

### Optimization Points
1. **Batched Stepping**: Request multiple steps per IPC round-trip
2. **Selective Snapshots**: Full state every N ticks, metrics every M ticks
3. **Downsampling**: Reduce chart data points for large time windows
4. **Cached Rendering**: Only rebuild world view on full snapshots

### Target Metrics
- UI responsiveness: <100ms for user actions
- Chart updates: 10-20 FPS
- World view: 20-30 FPS with 1k+ agents
- Memory: <500MB for typical simulations

## Security Model

### Isolation
- Sidecar runs as separate process (sandboxed)
- Communication via stdio (no network exposure by default)
- Configuration validated before sending to sidecar

### Data Privacy
- No telemetry by default
- Logs stored locally
- User configs in standard OS data directory

## Extensibility Points

### Adding New Panels
Implement `QDockWidget`, connect to `SnapshotBuffer` signals

### Adding New Providers
Sidecar-side only; GUI provider-agnostic (selects via config)

### Adding New Charts
Subclass `ChartWidget`, register with `MetricsPanel`

### Alternative Renderers
Implement `WorldRenderer` interface, swap in `WorldView`

---

For detailed documentation:
- [IPC Protocol](ipc_protocol.md)
- [Threading Model](threading_model.md)
- [Configuration Reference](../CONFIGURATION_REFERENCE.md)
