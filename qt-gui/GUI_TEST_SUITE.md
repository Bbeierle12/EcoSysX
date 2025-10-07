# EcoSysX GUI — VS Code Test Suite README

This README turns the full test plan into a practical VS Code–centric setup so you can build, run, and debug the Qt GUI test suite locally on macOS, Linux, and Windows.

## 1) Overview

### What you get:

A complete Qt + CTest test harness (unit, integration, GUI/interaction, performance, fuzz).

VS Code configs to build, run, and debug tests:
- `.vscode/settings.json` (CMake Tools, test args)
- `.vscode/tasks.json` (build + ctest runners)
- `.vscode/launch.json` (debug a single test, debug the app, optional Node sidecar attach)
- `.vscode/extensions.json` (recommended extensions)

### The suite exercises:

- **EngineClient** (JSON-RPC, lifecycle, error handling)
- **SnapshotBuffer** (ring buffers, downsampling)
- **MetricsPanel** (rolling charts)
- **WorldView** (agents + heatmap ingestion, batched painting)
- **ConfigPanel** (validation, JSON round-trip)
- **MainWindow** (Start/Run/Step/Stop wiring, progress, cadence)
- **Resilience & performance** (negative tests, throughput)

---

## 2) Prerequisites

### C++ toolchain
- **macOS**: Xcode CLT or LLVM (Homebrew)
- **Linux**: GCC ≥ 10 or Clang ≥ 12
- **Windows**: MSVC (Visual Studio Build Tools) or LLVM/Clang

### Required Software
- **CMake** ≥ 3.22 and Ninja (recommended)
- **Qt 6**: Core, Gui, Widgets, Charts, Test
- **Node.js** ≥ 18 (only if running the real sidecar; the suite also supports a FakeTransport)
- **Python** optional (for helper scripts)

### Recommended VS Code extensions (added below):
- CMake Tools
- C/C++ (IntelliSense)
- Test Explorer UI
- CodeLLDB (macOS/Linux)
- C/C++ Extension Pack
- Node Debug (optional)

---

## 3) Repository layout (tests)

Place the following under your repo root:

```
ecosysx-gui/
  CMakeLists.txt
  src/
    app/...
    ui/...
    sim/...
    util/...
  tests/
    CMakeLists.txt
    data/
      metrics_small.json
      full_small.json
      malformed_missing_metrics.json
    helpers/
      FakeTransport.h
      FakeTransport.cpp
      TestUtils.h
      TestUtils.cpp
      # (Optional) FakeSidecarProcess.js
    unit/
      tst_snapshotbuffer.cpp
      tst_colormaps.cpp
      tst_jsonhelpers.cpp
      tst_engineclient_unit.cpp
      tst_configpanel_validation.cpp
    integration/
      tst_engineclient_sidecar.cpp
      tst_mainwindow_flows.cpp
      tst_metricspanel_series.cpp
      tst_worldview_ingest.cpp
    gui/
      tst_worldview_render.cpp
      tst_mainwindow_interaction.cpp
    perf/
      tst_perf_runloop.cpp
      tst_perf_render_agents.cpp
    fuzz/
      tst_engineclient_fuzz.cpp
      tst_snapshot_parse_fuzz.cpp
```

If your current class/file names differ, keep the structure and rename includes inside tests accordingly.

---

## 4) CMake wiring

### 4.1 Root CMakeLists.txt (snippet)

```cmake
cmake_minimum_required(VERSION 3.22)
project(EcoSysXGUI LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Charts Test)

add_subdirectory(src)
add_subdirectory(tests)
```

### 4.2 tests/CMakeLists.txt

```cmake
enable_testing()

set(QT_COMPONENTS Core Gui Widgets Test Charts)
find_package(Qt6 REQUIRED COMPONENTS ${QT_COMPONENTS})

function(add_qt_test name)
  add_executable(${name} ${ARGN})
  target_link_libraries(${name} PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Test Qt6::Charts)
  target_include_directories(${name} PRIVATE ${CMAKE_SOURCE_DIR}/src ${CMAKE_CURRENT_SOURCE_DIR})
  add_test(NAME ${name} COMMAND ${name} -platform offscreen)
endfunction()

# Helpers
add_library(test_helpers STATIC
  helpers/FakeTransport.cpp
  helpers/TestUtils.cpp
)
target_link_libraries(test_helpers PRIVATE Qt6::Core Qt6::Gui)

# Unit tests (examples; add the rest similarly)
add_qt_test(tst_snapshotbuffer
  unit/tst_snapshotbuffer.cpp
)
target_link_libraries(tst_snapshotbuffer PRIVATE test_helpers)

add_qt_test(tst_engineclient_unit
  unit/tst_engineclient_unit.cpp
)
target_link_libraries(tst_engineclient_unit PRIVATE test_helpers)

# ... repeat for integration/gui/perf/fuzz groups
```

All tests run with `-platform offscreen` so they work headlessly and in CI.

---

## 5) VS Code configuration

Create a `.vscode/` folder in the repo with the files below.

### 5.1 .vscode/extensions.json

```json
{
  "recommendations": [
    "ms-vscode.cmake-tools",
    "ms-vscode.cpptools-extension-pack",
    "ms-vscode.test-adapter-converter",
    "vadimcn.vscode-lldb",
    "ms-vscode.cpptools",
    "ms-vscode.cpptools-themes",
    "ms-vscode.node-debug2"
  ]
}
```

### 5.2 .vscode/settings.json

```json
{
  "cmake.generator": "Ninja",
  "cmake.buildDirectory": "${workspaceFolder}/build",
  "cmake.configureArgs": [],
  "cmake.testArgs": [
    "--output-on-failure"
  ],
  "cmake.debugConfig": {
    "args": ["-platform", "offscreen"]
  },
  "cmake.statusbar.advanced": {
    "debug": true
  },
  // If you'll run the real Node sidecar from tests/app:
  "ecosysx.nodePath": "node",
  "ecosysx.sidecarScript": "${workspaceFolder}/engine-sidecar/engine_sidecar.js"
}
```

### 5.3 .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "CMake: configure",
      "type": "cmake",
      "command": "configure",
      "problemMatcher": []
    },
    {
      "label": "CMake: build",
      "type": "cmake",
      "command": "build",
      "group": "build"
    },
    {
      "label": "CTest: all",
      "type": "shell",
      "dependsOn": "CMake: build",
      "options": {
        "env": {
          "QT_QPA_PLATFORM": "offscreen"
        }
      },
      "command": "ctest --test-dir ${workspaceFolder}/build --output-on-failure"
    },
    {
      "label": "CTest: filter",
      "type": "shell",
      "dependsOn": "CMake: build",
      "options": {
        "env": { "QT_QPA_PLATFORM": "offscreen" }
      },
      "command": "ctest --test-dir ${workspaceFolder}/build -R ${input:ctestFilter} --output-on-failure"
    }
  ],
  "inputs": [
    {
      "id": "ctestFilter",
      "type": "promptString",
      "description": "Regex for tests (e.g., tst_mainwindow_flows)"
    }
  ]
}
```

### 5.4 .vscode/launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug: single Qt test (LLDB/GDB)",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/tests/tst_mainwindow_flows",
      "args": ["-platform", "offscreen"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}/build",
      "environment": [
        { "name": "QT_QPA_PLATFORM", "value": "offscreen" }
      ],
      "MIMode": "lldb",
      "externalConsole": false
    },
    {
      "name": "Debug: app",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/src/app/EcoSysXGUI",
      "args": [],
      "cwd": "${workspaceFolder}/build",
      "environment": [],
      "MIMode": "lldb",
      "externalConsole": false
    },
    {
      "name": "Attach: Node sidecar",
      "type": "pwa-node",
      "request": "attach",
      "processId": "${command:PickProcess}",
      "restart": false
    }
  ]
}
```

**Note**: On Windows, set `"MIMode": "gdb"` if you're using MinGW; use `cppvsdbg` for MSVC.

---

## 6) Key test helpers (drop-in)

### 6.1 tests/helpers/FakeTransport.h

```cpp
#pragma once
#include <QObject>
#include <QByteArray>
#include <functional>

class ITransport : public QObject {
  Q_OBJECT
public:
  using QObject::QObject;
  virtual void start() = 0;
  virtual void send(const QByteArray&) = 0;
  virtual void stop() = 0;
signals:
  void lineReceived(const QByteArray&);
  void error(const QString&);
};

class FakeTransport : public ITransport {
  Q_OBJECT
public:
  void start() override {}
  void stop() override {}
  void send(const QByteArray& bytes) override;
  void setResponder(std::function<QByteArray(const QByteArray&)> fn) { resp_ = std::move(fn); }
private:
  std::function<QByteArray(const QByteArray&)> resp_;
};
```

### 6.2 tests/helpers/FakeTransport.cpp

```cpp
#include "FakeTransport.h"
#include <QTimer>

void FakeTransport::send(const QByteArray& bytes) {
  if (!resp_) return;
  const QByteArray line = resp_(bytes);
  QTimer::singleShot(0, this, [this, line]{ emit lineReceived(line); });
}
```

### 6.3 tests/helpers/TestUtils.h

```cpp
#pragma once
#include <QJsonObject>
#include <QString>

QJsonObject loadJsonFixture(const QString& path);
QJsonObject makeMetricsSnapshot(int tick, int pop, double eMean, int S, int I, int R);
QJsonObject makeFullSnapshot(int tick, int nAgents, int gridW, int gridH);
```

### 6.4 Example fixture: tests/data/metrics_small.json

```json
{
  "snapshot": {
    "tick": 123,
    "metrics": {
      "pop": 250,
      "energyMean": 71.5,
      "sir": { "S": 200, "I": 40, "R": 10 }
    }
  }
}
```

---

## 7) Running in VS Code

### Setup
1. **Open Folder**: open the repo root in VS Code.
2. **Configure**: Command Palette → "CMake: Configure".
3. **Build**: Command Palette → "CMake: Build".

### Run all tests:
- Run task: "CTest: all", or
- CMake Tools status bar → "Tests" → "Run Tests".

### Run a subset:
- Run task: "CTest: filter" and enter a regex (e.g., `tst_mainwindow_flows`).

### Debug a test:
- Open `.vscode/launch.json`, pick "Debug: single Qt test"; adjust the `program` path to the test you want.

**Note**: If you run GUI/interaction tests locally, keep `QT_QPA_PLATFORM=offscreen`. If you want visible windows, remove that env var for local runs.

---

## 8) What each test group covers

- **unit/**: zero-UI tests for buffers, JSON, validation, protocol.
- **integration/**: wiring flows (Start/Run/Step/Stop), with FakeTransport or a stub sidecar.
- **gui/**: offscreen rendering smoke tests, interactions (zoom/pan/follow).
- **perf/**: conservative throughput & render time checks (CI-friendly thresholds).
- **fuzz/**: malformed frames, partial JSON, wrong types (must not crash; emit errors).

---

## 9) Tips, toggles, and perf knobs

- **Cadence**: in tests that simulate running, keep metrics snapshots frequent and full snapshots sparse.
- **Downsampling**: verify downsampling kicks in by checking plotted point counts, not just raw sample size.
- **Redraw cap**: throttle UI repaint to ≤ 30 FPS in app; in tests we measure logic, not FPS.

---

## 10) Troubleshooting

### Qt offscreen plugin missing
Ensure Qt 6 is on PATH (Windows: add `<Qt>\bin`), or run tests with `-platform offscreen` (already set) and `QT_QPA_PLATFORM=offscreen`.

### Node not found (only if you run real sidecar)
Install Node ≥ 18 and set `"ecosysx.nodePath"` in `.vscode/settings.json`. Otherwise stick to FakeTransport.

### Tests are flaky on CI
Increase timeouts via `QTRY_*` macros, reduce perf thresholds, or skip perf group with a CTest label filter.

### Windows font/render differences
Avoid pixel-perfect image assertions. Prefer histogram/structure checks for offscreen renders.

---

## 11) Adding a new test

1. Create `tests/<group>/tst_myfeature.cpp`.
2. Include the relevant headers; inject FakeTransport or direct model setters.
3. Add an `add_qt_test(...)` entry in `tests/CMakeLists.txt`.
4. Re-configure (CMake), build, and run `ctest -R tst_myfeature`.

---

## 12) Optional: run with a real sidecar

- Put `engine-sidecar/engine_sidecar.js` in the repo (Node script that bridges to your GenesisEngine).
- Start it from the app or from tests that require genuine RPC.
- Use "Attach: Node sidecar" launch config to debug Node if needed.

---

## 13) Acceptance criteria (MVP) for the suite

- `ctest` exercises all unit/integration/gui tests headlessly in < 10 minutes on CI.
- Breaking JSON schema handling, signal wiring, or draw batching triggers targeted test failures.
- GUI tests never require a visible display (offscreen OK by default).

---

## 14) Fast commands (CLI)

### Configure & build:
```bash
cmake -S . -B build -G Ninja
cmake --build build -j
```

### Run all tests:
```bash
ctest --test-dir build --output-on-failure
```

### Run a subset:
```bash
ctest --test-dir build -R tst_mainwindow_flows --output-on-failure
```

### Windows (PowerShell):
```powershell
cmake -S . -B build -G "Ninja"
cmake --build build --config Release
$env:QT_QPA_PLATFORM="offscreen"; ctest --test-dir build --output-on-failure
```

---

## Test Scope Summary

### What we're testing:

1. **EngineClient**: JSON-RPC encode/decode, lifecycle (init/step/snapshot/stop), error surfacing, reconnect logic.
2. **SnapshotBuffer**: ring-buffering, trimming, downsampling.
3. **MetricsPanel**: series updates, rolling windows, downsampling hooks.
4. **WorldView**: agent/heatmap model ingestion, painting contract, zoom/pan, follow-agent.
5. **ConfigPanel**: validation and JSON round-trip to engine schema shape.
6. **MainWindow**: action wiring (Start/Run/Step/Stop), progress/tick propagation, snapshot cadence, run-loop state machine.
7. **Resilience**: malformed/missing fields, transport failures, long runs (memory).
8. **Performance**: batched step cadence, throttled repaint (no UI stalls).

---

## Example Unit Test: SnapshotBuffer

```cpp
// tests/unit/tst_snapshotbuffer.cpp
#include <QtTest>
#include "sim/SnapshotBuffer.h"

class SnapshotBufferTest : public QObject { 
  Q_OBJECT
private slots:
  void push_and_trim();
  void downsample_series();
};

void SnapshotBufferTest::push_and_trim() {
  SnapshotBuffer buf(100); // capacity
  for (int i=0; i<150; ++i) 
    buf.pushMetrics(i, /*pop*/i*2, /*e*/50.0, /*S*/i, /*I*/0, /*R*/0);
  QCOMPARE(buf.size(), 100);
  QCOMPARE(buf.back().tick, 149);
}

void SnapshotBufferTest::downsample_series() {
  SnapshotBuffer buf(1000); 
  buf.setDownsample(10);
  for (int i=0; i<1000; ++i) 
    buf.pushMetrics(i, i, 0.0, 0, 0, 0);
  QVERIFY(buf.plotPointsCount() <= 120); // safety headroom
}

QTEST_MAIN(SnapshotBufferTest)
#include "tst_snapshotbuffer.moc"
```

---

## Example Integration Test: MainWindow Flows

```cpp
// tests/integration/tst_mainwindow_flows.cpp
#include <QtTest>
#include "ui/MainWindow.h"
#include "tests/helpers/FakeTransport.h"

class MainWindowFlows : public QObject { 
  Q_OBJECT
private slots:
  void start_run_step_stop();
};

void MainWindowFlows::start_run_step_stop() {
  auto* ft = new FakeTransport;
  auto* mw = new MainWindow(/*inject transport*/ ft); 
  mw->show();
  
  // script responses that advance tick & emit snapshots
  int tick = 0;
  ft->setResponder([&](const QByteArray& req){
    const auto s = QString::fromUtf8(req);
    if (s.contains("\"op\":\"init\"")) 
      return QByteArray("{\"ok\":true,\"phase\":\"start\"}\n");
    if (s.contains("\"op\":\"step\"")) { 
      tick += 50; 
      return QByteArray("{\"tick\":" + QByteArray::number(tick) + "}\n"); 
    }
    if (s.contains("\"snapshot\"") && s.contains("\"metrics\"")) {
      QByteArray j = "{\"snapshot\":{\"tick\":" + QByteArray::number(tick) + 
                     ",\"metrics\":{\"pop\":100,\"energyMean\":70.0,\"sir\":{\"S\":80,\"I\":15,\"R\":5}}}}\n";
      return j;
    }
    return QByteArray("{\"ok\":true}\n");
  });

  // simulate clicks: Start → Run tick
  QTest::mouseClick(mw->actionStart(), Qt::LeftButton);
  QTRY_VERIFY(mw->isRunning());

  QTest::mouseClick(mw->actionRunOnce(), Qt::LeftButton);
  QTRY_COMPARE(mw->progressTick(), tick);

  QTest::mouseClick(mw->actionStop(), Qt::LeftButton);
  QTRY_VERIFY(!mw->isRunning());
}

QTEST_MAIN(MainWindowFlows)
#include "tst_mainwindow_flows.moc"
```

---

## Coverage Goals & Gates

- **Unit**: ≥ 85% statements on SnapshotBuffer, EngineClient protocol, ConfigPanel validators.
- **Integration**: cover Start/Run/Step/Stop happy path and at least two failure modes (bad JSON, early sidecar exit).
- **GUI**: smoke rendering + basic interactions executed on all platforms.

---

## Minimal Refactors to Enable Testing

1. Add `ITransport` and `ProcessTransport`; let EngineClient accept an `ITransport*` (keeps production path unchanged, unlocks FakeTransport).
2. Ensure WorldView exposes a model setter (`setAgents(...)`, `setResourceGrid(...)`) so tests can inject state without IPC.
3. Keep chart updates behind a method that accepts a struct of latest metrics; tests can call it directly.

---

## What Success Looks Like

- One command (`ctest`) exercises all core flows without flakiness.
- A PR breaking JSON schema handling, signal wiring, or render batching triggers clear, targeted failures.
- The suite runs headless on Linux/macOS/Windows CI in < 10 minutes.

---

**Ready to test!** Run `.\scripts\build.ps1` then `ctest --test-dir build --output-on-failure` 🚀
