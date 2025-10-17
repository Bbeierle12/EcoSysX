1) What we’re testing (scope)

EngineClient: JSON-RPC encode/decode, lifecycle (init/step/snapshot/stop), error surfacing, reconnect logic.

SnapshotBuffer: ring-buffering, trimming, downsampling.

MetricsPanel: series updates, rolling windows, downsampling hooks.

WorldView: agent/heatmap model ingestion, painting contract, zoom/pan, follow-agent.

ConfigPanel: validation and JSON round-trip to engine schema shape.

MainWindow: action wiring (Start/Run/Step/Stop), progress/tick propagation, snapshot cadence, run-loop state machine.

Resilience: malformed/missing fields, transport failures, long runs (memory).

Performance: batched step cadence, throttled repaint (no UI stalls).

2) Test stack & directory layout

Framework: Qt 6 QtTest (a.k.a. QTestLib) + QSignalSpy.

Runner: CTest via CMake; headless CI uses Qt’s offscreen platform.

Optionally: GoogleTest for pure, non-Qt logic (not required here).

ecosysx-gui/
  CMakeLists.txt
  src/...
  tests/
    CMakeLists.txt
    data/              # golden JSON, snapshot fixtures
      metrics_small.json
      full_small.json
      malformed_*.json
    helpers/
      FakeTransport.h/.cpp           # in-memory transport for EngineClient
      FakeSidecarProcess.js          # optional Node stub (integration)
      TestUtils.h/.cpp               # common asserts, snapshot builders
    unit/
      tst_snapshotbuffer.cpp
      tst_colormaps.cpp
      tst_jsonhelpers.cpp
      tst_engineclient_unit.cpp
      tst_configpanel_validation.cpp
    integration/
      tst_engineclient_sidecar.cpp   # with FakeSidecarProcess (optional)
      tst_mainwindow_flows.cpp       # Start/Run/Step/Stop wiring
      tst_metricspanel_series.cpp
      tst_worldview_ingest.cpp
    gui/
      tst_worldview_render.cpp       # offscreen render checks
      tst_mainwindow_interaction.cpp # clicks, shortcuts, layout
    perf/
      tst_perf_runloop.cpp
      tst_perf_render_agents.cpp
    fuzz/
      tst_engineclient_fuzz.cpp
      tst_snapshot_parse_fuzz.cpp

3) CMake & CTest wiring
# tests/CMakeLists.txt
enable_testing()

set(QT_COMPONENTS Core Gui Widgets Test Charts)
find_package(Qt6 REQUIRED COMPONENTS ${QT_COMPONENTS})

function(add_qt_test name)
  add_executable(${name} ${ARGN})
  target_link_libraries(${name} PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Test Qt6::Charts)
  target_include_directories(${name} PRIVATE ${CMAKE_SOURCE_DIR}/src ${CMAKE_CURRENT_SOURCE_DIR})
  add_test(NAME ${name} COMMAND ${name} -platform offscreen)
endfunction()

add_qt_test(tst_snapshotbuffer tests/unit/tst_snapshotbuffer.cpp tests/helpers/TestUtils.cpp)
# ...repeat for each .cpp (see files above)


-platform offscreen lets GUI tests run in CI without a display server.

4) Test helpers (core building blocks)
4.1 FakeTransport (in-memory, deterministic)

Use dependency injection: let EngineClient accept an abstract ITransport with signals lineReceived(QByteArray) and methods start(), send(QByteArray), stop(). Production uses ProcessTransport (QProcess). Tests use FakeTransport.

// tests/helpers/FakeTransport.h
#pragma once
#include <QObject>
#include <QByteArray>
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

// FakeTransport: immediately replies with canned lines (scriptable).
class FakeTransport : public ITransport {
  Q_OBJECT
public:
  void start() override {}
  void stop() override {}
  void send(const QByteArray& bytes) override; // parses req, pushes scripted resp
  // scripting API
  void setResponder(std::function<QByteArray(const QByteArray&)> fn) { resp_ = std::move(fn); }
private:
  std::function<QByteArray(const QByteArray&)> resp_;
};

// tests/helpers/FakeTransport.cpp
#include "FakeTransport.h"
#include <QTimer>
void FakeTransport::send(const QByteArray& bytes) {
  if (!resp_) return;
  const QByteArray line = resp_(bytes);
  // async deliver to mimic real transport
  QTimer::singleShot(0, this, [this,line]{ emit lineReceived(line); });
}

4.2 Snapshot builders & fixture loader
// tests/helpers/TestUtils.h
#pragma once
#include <QJsonObject>
#include <QString>
QJsonObject loadJsonFixture(const QString& path);
QJsonObject makeMetricsSnapshot(int tick, int pop, double eMean, int S, int I, int R);
QJsonObject makeFullSnapshot(int tick, int nAgents, int gridW, int gridH);

5) Unit tests (fast, no GUI)
5.1 SnapshotBuffer
// tests/unit/tst_snapshotbuffer.cpp
#include <QtTest>
#include "sim/SnapshotBuffer.h"
class SnapshotBufferTest : public QObject { Q_OBJECT;
private slots:
  void push_and_trim();
  void downsample_series();
};
void SnapshotBufferTest::push_and_trim() {
  SnapshotBuffer buf(100); // capacity
  for (int i=0;i<150;++i) buf.pushMetrics(i, /*pop*/i*2, /*e*/50.0, /*S*/i, /*I*/0, /*R*/0);
  QCOMPARE(buf.size(), 100);
  QCOMPARE(buf.back().tick, 149);
}
void SnapshotBufferTest::downsample_series() {
  SnapshotBuffer buf(1000); buf.setDownsample(10);
  for (int i=0;i<1000;++i) buf.pushMetrics(i, i, 0.0, 0,0,0);
  QVERIFY(buf.plotPointsCount() <= 120); // safety headroom
}
QTEST_MAIN(SnapshotBufferTest)
#include "tst_snapshotbuffer.moc"

5.2 ColorMaps (heatmap LUT)

Verify monotonic mapping, bounds clamping, and that min/max map to endpoints.

5.3 Json helpers

Round-trip engine config JSON (whitespace-insensitive), reject invalid types, accept missing optional fields with defaults.

5.4 EngineClient (protocol only, with FakeTransport)
// tests/unit/tst_engineclient_unit.cpp
#include <QtTest>
#include "sim/EngineClient.h"
#include "tests/helpers/FakeTransport.h"
class EngineClientUnit : public QObject { Q_OBJECT;
private slots:
  void init_step_snapshot_stop_ok();
  void handles_error_frames();
};

void EngineClientUnit::init_step_snapshot_stop_ok() {
  auto* ft = new FakeTransport;
  EngineClient ec(ft); // ctor overload that takes ITransport*
  ft->setResponder([](const QByteArray& req) {
    const auto s = QString::fromUtf8(req);
    if (s.contains("\"op\":\"init\""))     return QByteArray("{\"ok\":true,\"phase\":\"start\"}\n");
    if (s.contains("\"op\":\"step\""))     return QByteArray("{\"tick\":42}\n");
    if (s.contains("\"op\":\"snapshot\"")) return QByteArray("{\"snapshot\":{\"tick\":42,\"metrics\":{\"pop\":100,\"energyMean\":75.0,\"sir\":{\"S\":80,\"I\":15,\"R\":5}}}}\n");
    if (s.contains("\"op\":\"stop\""))     return QByteArray("{\"ok\":true,\"phase\":\"stop\"}\n");
    return QByteArray("{\"phase\":\"error\",\"error\":\"unexpected\"}\n");
  });

  QSignalSpy spyStart(&ec, &EngineClient::started);
  QSignalSpy spyStep(&ec,  &EngineClient::stepped);
  QSignalSpy spySnap(&ec,  &EngineClient::snapshotReceived);
  QSignalSpy spyStop(&ec,  &EngineClient::stopped);

  ec.start(); ec.sendInit(QJsonObject{{"schema","GENX_CFG_V1"}});
  QTRY_COMPARE(spyStart.count(), 1);

  ec.sendStep(1); QTRY_COMPARE(spyStep.count(), 1);
  ec.requestSnapshot("metrics"); QTRY_COMPARE(spySnap.count(), 1);
  const auto snap = spySnap.takeFirst().at(0).toJsonObject();
  QCOMPARE(snap["tick"].toInt(), 42);
  QCOMPARE(snap["metrics"].toObject()["pop"].toInt(), 100);

  ec.sendStop(); QTRY_COMPARE(spyStop.count(), 1);
}

void EngineClientUnit::handles_error_frames() {
  auto* ft = new FakeTransport;
  EngineClient ec(ft);
  ft->setResponder([](const QByteArray&){ return QByteArray("{\"phase\":\"error\",\"error\":\"boom\"}\n"); });
  QSignalSpy spyErr(&ec, &EngineClient::error);
  ec.start(); ec.sendStep(10);
  QTRY_COMPARE(spyErr.count(), 1);
  QCOMPARE(spyErr.takeFirst().at(0).toString(), QString("boom"));
}
QTEST_MAIN(EngineClientUnit)
#include "tst_engineclient_unit.moc"

5.5 ConfigPanel validation

Programmatically set invalid values (negative sizes, min>max, rates >1), assert Start is disabled, inline errors visible.

Set valid defaults; assert Start enabled and JSON matches the engine schema keys.

6) Integration tests (end-to-end wiring)
6.1 EngineClient ↔️ sidecar (optional)

If Node is available in CI, spin a tiny JS sidecar that echos expected frames. Otherwise, use FakeTransport only.

Happy path: init → step(50) → snapshot(metrics) → snapshot(full) → stop

Error paths: sidecar sends malformed JSON, disconnects abruptly — EngineClient emits error and returns to idle.

6.2 MainWindow flows
// tests/integration/tst_mainwindow_flows.cpp
#include <QtTest>
#include "ui/MainWindow.h"
#include "tests/helpers/FakeTransport.h"

class MainWindowFlows : public QObject { Q_OBJECT;
private slots:
  void start_run_step_stop();
};

void MainWindowFlows::start_run_step_stop() {
  auto* ft = new FakeTransport;
  auto* mw = new MainWindow(/*inject transport*/ ft); mw->show();
  // script responses that advance tick & emit snapshots
  int tick = 0;
  ft->setResponder([&](const QByteArray& req){
    const auto s = QString::fromUtf8(req);
    if (s.contains("\"op\":\"init\"")) return QByteArray("{\"ok\":true,\"phase\":\"start\"}\n");
    if (s.contains("\"op\":\"step\"")) { tick += 50; return QByteArray("{\"tick\":" + QByteArray::number(tick) + "}\n"); }
    if (s.contains("\"snapshot\"") && s.contains("\"metrics\"")) {
      QByteArray j = "{\"snapshot\":{\"tick\":" + QByteArray::number(tick) + ",\"metrics\":{\"pop\":100,\"energyMean\":70.0,\"sir\":{\"S\":80,\"I\":15,\"R\":5}}}}\n";
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

6.3 MetricsPanel series behavior

Feed a stream of 2,000 metric snapshots; assert series counts match rolling window, verify values at edges, confirm downsampling engaged.

6.4 WorldView ingestion

Feed a full snapshot with N agents and a small grid; assert model holds N agents; heatmap image dimensions and normalization sane.

7) GUI/interaction tests (offscreen)
7.1 WorldView render smoke test

Render to a QImage via QGraphicsView::render(); assert a non-trivial number of non-background pixels (agents + heatmap produced something).

Optionally compare to a golden histogram (not exact pixels; cross-platform friendly).

7.2 MainWindow interaction

Simulate zoom in/out via wheel events; ensure world rectangle changes.

Toggle “follow agent”; verify the view centers near target coordinates after updates.

Shortcut keys (Space toggles run, +/- zoom).

8) Performance tests (bounded, CI-safe)

These are micro-benchmarks with generous thresholds; skip locally if QT_QPA_PLATFORM=offscreen is very slow.

Run loop throughput: 10 batches of step(100) with metrics snapshots only. Assert wall time < threshold (e.g., 3s on CI).

Render agents: inject 10k synthetic agents into WorldView; render once; assert render time < threshold (e.g., 200 ms offscreen).

Memory stability: push 50k metric snapshots into buffer; ensure RSS roughly stable (platform-tolerant; check internal container sizes instead of OS RSS if needed).

9) Fuzz & negative tests

EngineClient fuzz: feed random lines (truncated JSON, extra fields, wrong types). Assert no crash; error emitted at most once per line; internal state remains consistent.

Snapshot parse fuzz: mutate valid snapshots (drop metrics, set sir to arrays/strings). Ensure GUI ignores bad frames and logs a warning.

10) Test data fixtures (examples)

tests/data/metrics_small.json

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


tests/data/full_small.json

{
  "snapshot": {
    "tick": 123,
    "metrics": { "pop": 250, "energyMean": 71.5, "sir": { "S": 200, "I": 40, "R": 10 } },
    "state": {
      "agents": [
        { "id": "a1", "position": {"x": 1, "y": 2}, "velocity": {"dx": 0, "dy": 0}, "energy": 100, "sirState": 0, "daysInState": 0, "ageTicks": 10 }
      ],
      "environment": { "resourceGrid": [0, 0.5, 1.0, 0.2], "tick": 123 }
    }
  }
}


tests/data/malformed_missing_metrics.json

{ "snapshot": { "tick": 99 } }

11) Running locally & in CI

Local (from build dir):

ctest --output-on-failure
# or run single test:
./tst_mainwindow_flows -platform offscreen -maxwarnings 0


GitHub Actions (matrix):

Install Qt 6 (use jurplel/install-qt-action), configure with -DCMAKE_BUILD_TYPE=RelWithDebInfo.

Cache build, run ctest.

Mark perf tests “soft fail” with relaxed thresholds on Windows runners.

12) Coverage goals & gates

Unit ≥ 85% statements on SnapshotBuffer, EngineClient protocol, ConfigPanel validators.

Integration: cover Start/Run/Step/Stop happy path and at least two failure modes (bad JSON, early sidecar exit).

GUI: smoke rendering + basic interactions executed on all platforms.

13) Minimal refactors to enable testing (safe & local)

Add ITransport and ProcessTransport; let EngineClient accept an ITransport* (keeps production path unchanged, unlocks FakeTransport).

Ensure WorldView exposes a model setter (setAgents(...), setResourceGrid(...)) so tests can inject state without IPC.

Keep chart updates behind a method that accepts a struct of latest metrics; tests can call it directly.

14) What success looks like

One command (ctest) exercises all core flows without flakiness.

A PR breaking JSON schema handling, signal wiring, or render batching triggers clear, targeted failures.

The suite runs headless on Linux/macOS/Windows CI in < 10 minutes.

If you want, I can turn these skeletons into concrete files matching your current classes (namespaces, headers) so you can copy-paste into tests/ and run ctest immediately.

You said:
Please turn it into a readme file for vs code.
ChatGPT said:
Thought for 16s
EcoSysX GUI — VS Code Test Suite README

This README turns the full test plan into a practical VS Code–centric setup so you can build, run, and debug the Qt GUI test suite locally on macOS, Linux, and Windows.

1) Overview

What you get:

A complete Qt + CTest test harness (unit, integration, GUI/interaction, performance, fuzz).

VS Code configs to build, run, and debug tests:

.vscode/settings.json (CMake Tools, test args)

.vscode/tasks.json (build + ctest runners)

.vscode/launch.json (debug a single test, debug the app, optional Node sidecar attach)

.vscode/extensions.json (recommended extensions)

The suite exercises:

EngineClient (JSON-RPC, lifecycle, error handling)

SnapshotBuffer (ring buffers, downsampling)

MetricsPanel (rolling charts)

WorldView (agents + heatmap ingestion, batched painting)

ConfigPanel (validation, JSON round-trip)

MainWindow (Start/Run/Step/Stop wiring, progress, cadence)

Resilience & performance (negative tests, throughput)

2) Prerequisites

C++ toolchain

macOS: Xcode CLT or LLVM (Homebrew)

Linux: GCC ≥ 10 or Clang ≥ 12

Windows: MSVC (Visual Studio Build Tools) or LLVM/Clang

CMake ≥ 3.22 and Ninja (recommended)

Qt 6: Core, Gui, Widgets, Charts, Test

Node.js ≥ 18 (only if running the real sidecar; the suite also supports a FakeTransport)

Python optional (for helper scripts)

Recommended VS Code extensions (added below):

CMake Tools, C/C++ (IntelliSense), Test Explorer UI, CodeLLDB (macOS/Linux), C/C++ Extension Pack, Node Debug (optional)

3) Repository layout (tests)

Place the following under your repo root:

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


If your current class/file names differ, keep the structure and rename includes inside tests accordingly.

4) CMake wiring
4.1 Root CMakeLists.txt (snippet)
cmake_minimum_required(VERSION 3.22)
project(EcoSysXGUI LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Qt
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets Charts Test)

add_subdirectory(src)
add_subdirectory(tests)

4.2 tests/CMakeLists.txt
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


All tests run with -platform offscreen so they work headlessly and in CI.

5) VS Code configuration

Create a .vscode/ folder in the repo with the files below.

5.1 .vscode/extensions.json
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

5.2 .vscode/settings.json
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
  // If you’ll run the real Node sidecar from tests/app:
  "ecosysx.nodePath": "node",
  "ecosysx.sidecarScript": "${workspaceFolder}/engine-sidecar/engine_sidecar.js"
}

5.3 .vscode/tasks.json
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

5.4 .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug: single Qt test (LLDB/GDB)",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/tests/tst_mainwindow_flows",  // change per test
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


On Windows, set "MIMode": "gdb" if you’re using Mingw; use cppvsdbg for MSVC.

6) Key test helpers (drop-in)
6.1 tests/helpers/FakeTransport.h
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

6.2 tests/helpers/FakeTransport.cpp
#include "FakeTransport.h"
#include <QTimer>
void FakeTransport::send(const QByteArray& bytes) {
  if (!resp_) return;
  const QByteArray line = resp_(bytes);
  QTimer::singleShot(0, this, [this, line]{ emit lineReceived(line); });
}

6.3 tests/helpers/TestUtils.h
#pragma once
#include <QJsonObject>
#include <QString>
QJsonObject loadJsonFixture(const QString& path);
QJsonObject makeMetricsSnapshot(int tick, int pop, double eMean, int S, int I, int R);
QJsonObject makeFullSnapshot(int tick, int nAgents, int gridW, int gridH);

6.4 Example fixture: tests/data/metrics_small.json
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

7) Running in VS Code

Open Folder: open the repo root in VS Code.

Configure: Command Palette → “CMake: Configure”.

Build: Command Palette → “CMake: Build”.

Run all tests:

Run task: “CTest: all”, or

CMake Tools status bar → “Tests” → “Run Tests”.

Run a subset:

Run task: “CTest: filter” and enter a regex (e.g., tst_mainwindow_flows).

Debug a test:

Open .vscode/launch.json, pick “Debug: single Qt test”; adjust the program path to the test you want.

If you run GUI/interaction tests locally, keep QT_QPA_PLATFORM=offscreen. If you want visible windows, remove that env var for local runs.

8) What each test group covers

unit/: zero-UI tests for buffers, JSON, validation, protocol.

integration/: wiring flows (Start/Run/Step/Stop), with FakeTransport or a stub sidecar.

gui/: offscreen rendering smoke tests, interactions (zoom/pan/follow).

perf/: conservative throughput & render time checks (CI-friendly thresholds).

fuzz/: malformed frames, partial JSON, wrong types (must not crash; emit errors).

9) Tips, toggles, and perf knobs

Cadence: in tests that simulate running, keep metrics snapshots frequent and full snapshots sparse.

Downsampling: verify downsampling kicks in by checking plotted point counts, not just raw sample size.

Redraw cap: throttle UI repaint to ≤ 30 FPS in app; in tests we measure logic, not FPS.

10) Troubleshooting

Qt offscreen plugin missing
Ensure Qt 6 is on PATH (Windows: add <Qt>\bin), or run tests with -platform offscreen (already set) and QT_QPA_PLATFORM=offscreen.

Node not found (only if you run real sidecar)
Install Node ≥ 18 and set "ecosysx.nodePath" in .vscode/settings.json. Otherwise stick to FakeTransport.

Tests are flaky on CI
Increase timeouts via QTRY_* macros, reduce perf thresholds, or skip perf group with a CTest label filter.

Windows font/render differences
Avoid pixel-perfect image assertions. Prefer histogram/structure checks for offscreen renders.

11) Adding a new test

Create tests/<group>/tst_myfeature.cpp.

Include the relevant headers; inject FakeTransport or direct model setters.

Add an add_qt_test(...) entry in tests/CMakeLists.txt.

Re-configure (CMake), build, and run ctest -R tst_myfeature.

12) Optional: run with a real sidecar

Put engine-sidecar/engine_sidecar.js in the repo (Node script that bridges to your GenesisEngine).

Start it from the app or from tests that require genuine RPC.

Use “Attach: Node sidecar” launch config to debug Node if needed.

13) Acceptance criteria (MVP) for the suite

ctest exercises all unit/integration/gui tests headlessly in < 10 minutes on CI.

Breaking JSON schema handling, signal wiring, or draw batching triggers targeted test failures.

GUI tests never require a visible display (offscreen OK by default).

14) Fast commands (CLI)

Configure & build:

cmake -S . -B build -G Ninja
cmake --build build -j


Run all tests:

ctest --test-dir build --output-on-failure


Run a subset:

ctest --test-dir build -R tst_mainwindow_flows --output-on-failure


Windows (PowerShell):

cmake -S . -B build -G "Ninja"
cmake --build build --config Release
$env:QT_QPA_PLATFORM="offscreen"; ctest --test-dir build --output-on-failure
