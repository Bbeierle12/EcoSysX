# Qt GUI ↔ Engine Sidecar Integration Plan

**Date**: October 17, 2025  
**Status**: 🚧 In Progress (Codex Working)  
**Goal**: Stabilize GUI↔Engine integration with full test coverage

---

## 🎯 Goals

1. ✅ Stabilize GUI↔Engine integration over JSON-RPC
2. ⏳ Restore and extend automated tests
3. ⏳ Validate end-to-end UX with real-time metrics and visualization
4. ⏳ Achieve smooth builds and packaging on Windows (and later macOS/Linux)

---

## 📊 Milestones

| Milestone | Description | Status |
|-----------|-------------|--------|
| **M1** | Protocol + I/O alignment complete | 🟡 In Progress |
| **M2** | Tests revived and passing | ⬜ Pending |
| **M3** | UI polish + auto-snapshot loop | ⬜ Pending |
| **M4** | Performance validated (10k agents) | ⬜ Pending |
| **M5** | Packaging + docs ready | ⬜ Pending |

---

## 🔧 M1: Protocol + I/O Alignment

### 1.1 Align Protocol Fields and Channels

#### Current State ✅
- [x] Sidecar uses `op` + `data` format
- [x] Sidecar returns `success` + `op` + `data` + `error`
- [x] EngineClient has line buffer for stdout
- [x] EngineClient forwards stderr to log panel

#### Tasks 🟡
- [ ] **Switch EngineClient to SeparateChannels mode**
  - File: `EngineClient.cpp:15`
  - Change: `m_process->setProcessChannelMode(QProcess::SeparateChannels);`
  - Verify: stdout for JSON only, stderr for logs

- [ ] **Update Request Format**
  - File: `EngineClient.cpp` (sendInit, sendStep, etc.)
  - Current: Uses `params` field ❌
  - Required: Use `data` field ✅
  - Example:
    ```cpp
    // OLD
    message["params"] = data;
    
    // NEW
    message["data"] = data;
    ```

- [ ] **Update Response Parsing**
  - File: `EngineClient.cpp:processLine()`
  - Parse: `success`, `op`, `data`, `error` fields
  - Extract: `data.tick`, `data.snapshot`, `data.metrics`
  - Handle errors: `success: false` → `errorOccurred(error)`

#### Snapshot Request Format
```cpp
// Request
{"op": "snapshot", "data": {"kind": "metrics"}}  // or "full"

// Response
{
  "success": true,
  "op": "snapshot",
  "data": {
    "snapshot": { /* full snapshot object */ },
    "kind": "metrics"
  }
}
```

---

### 1.2 Start/Stop/Init/Step Commands

#### Init Command
- [ ] **Validate config before sending**
  - File: `EngineClient::sendInit()`
  - Add validation for required fields
  - Send format:
    ```json
    {
      "op": "init",
      "data": {
        "provider": "mesa",
        "config": { /* EngineConfigV1 */ }
      }
    }
    ```

#### Step Command with Auto-Snapshot
- [ ] **Request snapshot after each step**
  - File: `EngineClient::sendStep()`
  - After step response, auto-request snapshot
  - Or: Add periodic snapshot timer while running
  - Format:
    ```json
    {"op": "step", "data": {"steps": 1}}
    // Wait for response
    {"op": "snapshot", "data": {"kind": "metrics"}}
    ```

#### Periodic Snapshot Timer (Optional)
- [ ] Add `QTimer m_snapshotTimer` to EngineClient
- [ ] Configure interval (e.g., 100ms for ~10 FPS)
- [ ] Request snapshot on timer while state == Running
- [ ] Disable when stopped

---

### 1.3 Error Handling

- [ ] **Map sidecar errors to Qt signals**
  - File: `EngineClient.cpp:processLine()`
  - On `success: false`: emit `errorOccurred(response["error"].toString())`
  - Keep state consistent (set to Error state)

- [ ] **Guard line buffer robustly**
  - Current: Has 1MB limit ✅
  - Add: Handle partial lines across reads ✅
  - Add: Timeout for incomplete lines
  - Add: Max line length check

- [ ] **Handle malformed JSON**
  ```cpp
  QJsonParseError parseError;
  QJsonDocument doc = QJsonDocument::fromJson(line.toUtf8(), &parseError);
  if (parseError.error != QJsonParseError::NoError) {
      emit errorOccurred(QString("JSON parse error: %1").arg(parseError.errorString()));
      return;
  }
  ```

---

## 🧪 M2: Testing

### 2.1 Unit Tests

#### EngineClient Tests
- [ ] **Rewrite tst_engineclient.cpp for refactored API**
  - File: `tests/tst_engineclient.cpp`
  - Test `start()` - process launches
  - Test `sendInit(data)` - correct JSON format
  - Test `sendStep(n)` - step count sent correctly
  - Test `requestSnapshot(kind)` - kind parameter passed
  - Test `sendStop()` - stop command format

- [ ] **Parser Tests**
  - Test success response parsing
  - Test error response parsing
  - Test malformed JSON handling
  - Test partial line buffering
  - Test large response handling

#### MetricsPanel Tests
- [ ] **Create tst_metricspanel.cpp**
  - Test threshold calculations
  - Test number formatting (commas)
  - Test color coding (Green/Yellow/Red)
  - Test signal emissions on threshold cross

#### VisualizationWidget Tests
- [ ] **Create tst_visualizationwidget.cpp**
  - Test agent ingestion from snapshot
  - Test zoom bounds (min/max)
  - Test pan limits (world boundaries)
  - Test state-based batching
  - Test culling off-screen agents

---

### 2.2 Integration Tests

#### Engine Integration Test
- [ ] **Restore tst_engine_integration.cpp**
  - Use Node `test-engine-stub.mjs` or create one
  - Adapt to `op`/`data` protocol
  - Test full lifecycle: init → step → snapshot → stop
  - Gate tests when Node absent (already present ✅)

#### Stub Engine Script
- [ ] **Create test-engine-stub.mjs**
  - Location: `qt-gui/tests/test-engine-stub.mjs`
  - Implement minimal JSON-RPC responder
  - Return mock snapshots with realistic data
  - Support all operations: init, step, snapshot, stop

Example stub:
```javascript
#!/usr/bin/env node
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let tick = 0;

rl.on('line', (line) => {
  const req = JSON.parse(line);
  let response = { success: true, op: req.op };
  
  switch (req.op) {
    case 'init':
      tick = 0;
      response.data = { tick: 0, metrics: { pop: 500 } };
      break;
    case 'step':
      tick += req.data?.steps || 1;
      response.data = { tick, metrics: { pop: 498 } };
      break;
    case 'snapshot':
      response.data = { snapshot: { tick, metrics: { pop: 498 } } };
      break;
    case 'stop':
      response.data = { message: 'Stopped' };
      break;
  }
  
  console.log(JSON.stringify(response));
});
```

---

## ⚡ M3: Performance

### 3.1 Visualization Performance

- [ ] **Verify batching at 10k agents**
  - File: `VisualizationWidget.cpp`
  - Measure FPS with `QElapsedTimer`
  - Log frame times to Event Log
  - Target: 60 FPS @ 10k agents

- [ ] **CPU profiling**
  - Use Qt Creator profiler
  - Identify bottlenecks in rendering
  - Optimize hot paths

- [ ] **Off-screen culling verification**
  - Already implemented ✅
  - Test with camera at different positions
  - Verify radius calculation
  - Check antialias thresholds

### 3.2 SnapshotBuffer Performance

- [ ] **Validate downsampling**
  - Test with 10,000+ snapshots
  - Verify ring buffer wraps correctly
  - Check memory usage stays bounded
  - Measure signal emission rate

- [ ] **Long-run stress test**
  - Run simulation for 1+ hours
  - Monitor memory usage
  - Check for leaks (Valgrind on Linux)
  - Verify UI stays responsive

---

## 📦 M4: Build & Packaging

### 4.1 Build Verification

#### Windows Build
- [ ] **Test build.ps1 script**
  - File: `qt-gui/scripts/build.ps1`
  - Run clean build
  - Verify no warnings
  - Check output executable

- [ ] **CMake direct build**
  - Follow `PHASE_2_SUMMARY_FINAL.md:142`
  - Commands:
    ```powershell
    mkdir build; cd build
    cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release
    cmake --build .
    ```

- [ ] **Validate Qt6::Charts**
  - Ensure Charts module linked
  - Test chart rendering
  - Verify no missing DLL errors

#### Cross-Platform (Future)
- [ ] macOS build with Clang
- [ ] Linux build with GCC
- [ ] CI/CD pipeline (GitHub Actions)

---

### 4.2 Packaging

#### Windows Deployment
- [ ] **Add windeployqt post-build step**
  - File: `CMakeLists.txt`
  - Add custom command:
    ```cmake
    add_custom_command(TARGET ecosysx-gui POST_BUILD
        COMMAND ${WINDEPLOYQT_EXECUTABLE} $<TARGET_FILE:ecosysx-gui>
        COMMENT "Running windeployqt..."
    )
    ```

- [ ] **Runtime dependencies checklist**
  - Qt DLLs (Core, Widgets, Charts, Network, OpenGL)
  - MinGW runtime (libgcc, libstdc++, libwinpthread)
  - Platform plugins (qwindows.dll)
  - Icon engines, image formats
  - Translations

#### Node.js Sidecar
- [ ] **Document Node requirement**
  - Minimum version: Node.js 18+
  - Include in README.md
  - Add version check in EngineClient

- [ ] **Sidecar path documentation**
  - Relative path: `services/engine-sidecar/main.js`
  - Auto-discovery logic
  - Manual override option
  - Fallback error messages

---

## 🎨 M5: UX Polish

### 5.1 MainWindow Enhancements

- [ ] **Connection state indicator**
  - Show in status bar: "Disconnected" / "Connecting" / "Connected"
  - Color-coded indicator (Red/Yellow/Green)
  - Update on engine state changes

- [ ] **Disable config while running**
  - Lock ConfigPanel when state == Running
  - Unlock when Stopped or Idle
  - Show visual feedback (grayed out)

- [ ] **Snapshot periodic toggle**
  - Add toolbar button: "Auto-Snapshot"
  - Checkbox in View menu
  - Show interval in status bar
  - Persist setting in QSettings

---

### 5.2 MetricsPanel/Charts

- [ ] **Consistent color thresholds**
  - Infection rate: <10% green, 10-30% yellow, >30% red
  - Apply to both metrics panel and charts
  - Document in UI style guide

- [ ] **PNG export test**
  - Right-click chart → Export
  - Save as PNG with timestamp
  - Verify image quality
  - Add to user documentation

---

## 📚 M6: Documentation

### 6.1 Qt GUI Documentation

- [ ] **Update qt-gui/README.md**
  - Add "Requirements" section (Qt 6.9+, Node 18+)
  - Build instructions for Windows/macOS/Linux
  - Package/deployment steps
  - Runtime dependencies

- [ ] **Quick Start Guide**
  - Installation steps
  - First run walkthrough
  - Configuration basics
  - Troubleshooting section

---

### 6.2 Engine Sidecar Documentation

- [ ] **Update services/engine-sidecar/README.md**
  - Definitive JSON-RPC protocol spec
  - Match exact request/response from GUI
  - Add wire-format examples
  - Version compatibility matrix

- [ ] **Protocol Examples**
  - All 5 operations with actual payloads
  - Error response examples
  - Edge cases (partial JSON, large snapshots)

---

### 6.3 Troubleshooting

- [ ] **Common Issues Section**
  - "Node.js not found" → How to set path
  - "Sidecar script not found" → Path resolution
  - "Stderr noise" → How to filter logs
  - "Provider not available" → Setup guide
  - "GUI freezes" → Check worker thread

- [ ] **Debug Mode Instructions**
  - Enable verbose logging
  - Capture JSON-RPC traffic
  - Profile performance
  - Submit bug reports

---

## ✅ Acceptance Criteria

### Functional
- [ ] EngineClient starts/stops sidecar process ✅
- [ ] Commands succeed with correct JSON-RPC format
- [ ] Snapshots flow into UI panels (Metrics, Charts, Visualization)
- [ ] Error handling works (malformed JSON, sidecar crash, etc.)

### Testing
- [ ] SnapshotBuffer unit tests pass (15 tests)
- [ ] EngineClient unit tests pass (new suite)
- [ ] MetricsPanel unit tests pass (new suite)
- [ ] VisualizationWidget unit tests pass (new suite)
- [ ] Integration tests run when Node present

### Performance
- [ ] No UI freezes during step/snapshot
- [ ] 60 FPS @ 10k agents in VisualizationWidget
- [ ] Memory usage stays bounded on long runs
- [ ] Worker thread doesn't block UI

### Build & Packaging
- [ ] Windows build produces runnable app
- [ ] All Qt dependencies included
- [ ] Charts export works (PNG/CSV)
- [ ] Sidecar auto-discovered from workspace

### Documentation
- [ ] README updated with requirements
- [ ] Protocol documented with examples
- [ ] Troubleshooting guide complete
- [ ] Code comments 100% coverage

---

## 📋 Task Checklist (Priority Order)

### Phase 1: Protocol Alignment (This Week)
- [ ] 1. Switch EngineClient to SeparateChannels mode
- [ ] 2. Update all commands to use `data` instead of `params`
- [ ] 3. Fix response parsing to extract `data.tick`, `data.metrics`
- [ ] 4. Add robust JSON parse error handling
- [ ] 5. Implement auto-snapshot after step
- [ ] 6. Test basic init→step→snapshot→stop cycle

### Phase 2: Testing (Next Week)
- [ ] 7. Create test-engine-stub.mjs for integration tests
- [ ] 8. Rewrite tst_engineclient.cpp for new API
- [ ] 9. Add parser unit tests
- [ ] 10. Create tst_metricspanel.cpp
- [ ] 11. Create tst_visualizationwidget.cpp
- [ ] 12. Restore tst_engine_integration.cpp

### Phase 3: Performance (Week 3)
- [ ] 13. Profile VisualizationWidget at 10k agents
- [ ] 14. Optimize rendering hot paths
- [ ] 15. Validate SnapshotBuffer downsampling
- [ ] 16. Run long-duration stress test

### Phase 4: Polish (Week 4)
- [ ] 17. Add connection state indicator
- [ ] 18. Lock config while running
- [ ] 19. Add auto-snapshot toggle
- [ ] 20. Implement PNG export for charts

### Phase 5: Packaging & Docs (Week 5)
- [ ] 21. Add windeployqt post-build step
- [ ] 22. Update all documentation
- [ ] 23. Create troubleshooting guide
- [ ] 24. Final acceptance testing

---

## 🔄 Current Status (Codex Working On)

### Active Tasks
- 🟡 Protocol alignment (M1.1)
- 🟡 Request/response format updates (M1.2)
- 🟡 Error handling improvements (M1.3)

### Next Up
- ⏳ Test stub creation
- ⏳ Unit test rewrites
- ⏳ Integration test restoration

### Blocked
- None currently

---

## 📞 Communication

### Daily Standup Format
- **What's done**: [completed tasks]
- **What's next**: [next 1-2 tasks]
- **Blockers**: [any issues]

### Weekly Review
- Review milestone progress
- Update acceptance criteria
- Adjust timeline if needed

---

## 🎯 Success Metrics

### Code Quality
- Zero compiler warnings ✅
- Zero memory leaks ✅
- 100% test pass rate (target)
- 90%+ code coverage (core components)

### Performance
- 60 FPS rendering ✅
- <1ms snapshot processing
- <100ms GUI response time
- <500MB memory footprint

### User Experience
- Clean error messages
- Responsive UI (no freezes)
- Auto-discovery "just works"
- Documentation clarity

---

*Last Updated: October 17, 2025*  
*Integration Status: M1 In Progress (40%)*  
*Target Completion: November 2025*
