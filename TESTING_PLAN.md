# EcoSysX Comprehensive Testing Plan

This plan inventories current tests, identifies gaps, and defines a phased strategy to deliver a comprehensive, reliable test suite across all EcoSysX components.

## Goals

- Stabilize and standardize testing across languages and services
- Achieve and sustain >80% coverage for core logic (per AGENTS.md)
- Gate heavy integration/e2e tests to run in CI environments with required deps
- Reduce flakiness via deterministic seeds, timeouts, and golden baselines
- Provide clear, one-command runners and CI visibility

## Current Inventory (as of this plan)

### Core Engine (TypeScript) — `packages/genx-engine`
- Framework: Vitest
- Tests present: `engine.test.ts`, `exports.test.ts`, `sidecar.test.ts`, `integration.test.ts`, `determinism.test.ts`
- Notes:
  - Unit tests validate lifecycle and configuration and tolerate missing sidecars
  - Integration/determinism tests expect provider sidecars (Docker or processes)
  - ISSUE: `integration.test.ts` used `[$provider]` (invalid) for computed key; fixed to `[provider]`

### Qt GUI (C++/Qt) — `qt-gui`
- Framework: Qt Test + CTest via CMake presets
- Tests present:
  - Unit: `tst_validation_utils.cpp`, `tst_configuration.cpp`, `tst_engineclient.cpp`, `tst_snapshotbuffer.cpp`
  - Integration: `tst_engine_integration.cpp`, `tst_mainwindow_integration.cpp` (uses Node test stub)
- Notes:
  - Runs headless-capable; relies on Node being available for the stub
  - Good coverage of EngineClient, SnapshotBuffer, and UI workflow basics

### Web Frontend (React/Vite) — repo root `src/`
- Framework: None configured (no `npm test` scripts)
- Tests present: None
- Notes: Needs unit (Vitest + RTL) and minimal e2e (Playwright) suite

### Engine Sidecar (Node) — `services/engine-sidecar`
- Current: Ad-hoc `test.js` script (child_process + manual asserts)
- Notes:
  - Not using a test framework; contains stray encoding glyphs in logs
  - Needs Vitest/Jest-based unit/integration tests with stubs/mocks

### LLM Service (Python) — `services/llama-service`
- Current: Ad-hoc `test_service.py` hitting localhost
- Notes:
  - Not pytest-based, depends on external running server
  - Contains stray encoding glyphs

### Mesa Sidecar (Python) — `services/mesa-sidecar`
- Current: No tests
- Notes:
  - Add pytest unit tests (class-level) + integration via subprocess/stdio

### Mason Sidecar (Java) — `services/mason-sidecar`
- Current: No tests
- Notes:
  - Add JUnit 5 tests and Maven Surefire setup

### Agents Sidecar (Julia) — `services/agents-sidecar`
- Current: No tests
- Notes:
  - Add `Test.jl` suites; optionally BenchmarkTools for perf baselines

## Gaps and Issues

- Core Engine TS: Heavy provider tests should be gated behind an env flag (e.g., `RUN_PROVIDER_TESTS=1`) to avoid CI failures without containers.
- Core Engine TS: Determinism/integration suites depend on sidecar images; document required images and/or use Testcontainers.
- Engine Sidecar Node: Replace custom `test.js` with proper Vitest tests; add unit tests for JSON-RPC handlers (ping/init/step/snapshot/stop) with engine mocked.
- LLM Service Python: Convert to pytest with `requests-mock` (unit) and Testcontainers (integration) flows.
- Mesa Sidecar Python: Add pytest tests for `MesaSidecar.handle_*`; Integration via subprocess running `main.py` and stdio protocol.
- Mason Sidecar Java: No tests; add JUnit and verify provider API contract.
- Agents Sidecar Julia: No tests; add `@testset` coverage for API surface.
- Web Frontend: No tests; add Vitest + RTL for components and Playwright smoke flows.
- Encoding artifacts: Remove stray glyphs (replacement-character artifacts) in several scripts/docs to keep logs clean.

## Strategy by Layer

### TypeScript Core (genx-engine)
- Unit: Keep current Vitest unit tests; add targeted tests for `providers/*` with sidecar transport mocked
- Integration: Mark provider-dependent suites with `describe.skip` unless `RUN_PROVIDER_TESTS=1`
- Determinism: Keep, but gate with env; add golden-digest comparisons checked into `baseline-artifacts/`
- Coverage: Enable `vitest --coverage` in `test:ci`; threshold 85% for `src/`

### Qt GUI (C++)
- Unit: Maintain and extend tests for new utils/panels/widgets
- Integration: Keep Node stub; ensure `-platform offscreen` via CTest for CI reliability
- Add negative tests for error states and timeouts; add simple perf sanity (not full benchmarks) gated behind `RUN_GUI_PERF=1`
- Coverage: Collect with gcov/lcov on GCC/Clang runners; target 80% for non-UI logic

### Web Frontend (React)
- Add Vitest + React Testing Library; snapshot/behavior tests for key components: `EcosystemSimulator`, `AgentRenderer`, panels
- Add Playwright smoke e2e for: load app, start mock engine, render agents, show metrics
- Coverage: 80% target for non-3D logic; skip expensive WebGL paths or mock Three.js

### Engine Sidecar (Node)
- Introduce Vitest
- Unit: JSON parsing/validation, op routing, error paths, logging separation (stdout vs stderr)
- Integration: Launch sidecar with mocked `GenesisEngine` (DI or jest.spyOn) and test stdio protocol
- Optional: Testcontainers to bring a minimal provider up
- Coverage: 85% target

### Python Services (Llama, Mesa)
- Pytest with `pytest-cov`
- Llama: Unit with `requests-mock`; Integration with `subprocess` or Testcontainers; parametrize timeouts
- Mesa: Unit for `MesaSidecar.handle_*`; Integration via subprocess running `main.py` and stdio protocol
- Coverage: 80% target

### Java (Mason Sidecar)
- JUnit 5 + Maven Surefire; add unit tests for provider API wrapper
- Wire serialized messages for contract tests
- Coverage: JaCoCo 80% target

### Julia (Agents Sidecar)
- Test.jl suites for core functions; deterministic seeds
- Optional: CI setup on Ubuntu runner with Julia cache

## CI Integration

- Core Engine: Keep `engine-sidecar.yml` but gate provider suites with `RUN_PROVIDER_TESTS`
- Upload coverage artifacts
- GUI: Keep `gui.yml`; ensure tests run headless; upload `ctest` logs and coverage (Linux)
- Web: Extend `web.yml` to install Vitest/RTL and run `npm test`; add Playwright job (smoke only)
- Services: Add dedicated workflows for Python/Java/Julia services; run unit tests always, integration tests behind `RUN_SERVICE_IT=1`

## Phased Roadmap

Phase 0 — Quick Fixes (today)
- [x] Fix `packages/genx-engine/tests/integration.test.ts` invalid computed key
- [ ] Gate provider-heavy tests behind `RUN_PROVIDER_TESTS`
- [ ] Remove stray encoding glyphs from scripts/tests

Phase 1 — Stabilize and Standardize (1–2 days)
- [ ] Convert `services/engine-sidecar/test.js` to Vitest, add npm `test:ci`
- [ ] Convert `services/llama-service/test_service.py` to pytest, add `pytest.ini`
- [ ] Add minimal Pytest for Mesa sidecar handlers

Phase 2 — Expand Coverage (3–5 days)
- [ ] Add genx-engine provider mock tests (no Docker)
- [ ] Add Qt GUI tests for `MetricsPanel`, error toasts, and menu actions
- [ ] Add React unit tests (Vitest/RTL), set up `npm test`

Phase 3 — Integration & Contracts (3–5 days)
- [ ] Contract tests between GUI EngineClient and Node sidecar using stub
- [ ] Provider API contract tests across TS <-> sidecars (Mesa/Mason/Agents)
- [ ] Golden metrics/log comparisons (baseline-artifacts)

Phase 4 — E2E & Smoke (optional, 2–3 days)
- [ ] Playwright smoke tests for web
- [ ] GUI headless flows: start -> init -> step -> snapshot -> stop using stub

Phase 5 — Perf/Regression (ongoing)
- [ ] Lightweight perf sanity (bounded runtime) with explicit seeds
- [ ] Track perf deltas over time (opt-in job)

## Ownership and Conventions

- Keep tests close to modules; respect AGENTS.md boundaries
- Name tests descriptively: `should [behavior] when [condition]`
- Default deterministic RNG seeds; avoid flaky time-based assertions
- Use environment flags to enable external deps: `RUN_PROVIDER_TESTS`, `RUN_SERVICE_IT`, `RUN_GUI_PERF`

## Runners

- Unified: `scripts/test-all.(sh|ps1)`
- Per-module:
  - Core Engine: `cd packages/genx-engine && npm test`
  - GUI: `cd qt-gui && ctest --preset ci-unix|ci-mingw`
  - Web: `npm test`
  - Engine Sidecar: `cd services/engine-sidecar && npm test`
  - Python Services: `pytest` within each service dir
  - Mason Sidecar: `mvn -q -DskipTests=false test`
  - Agents Sidecar: `julia --project -e "using Pkg; Pkg.test()"`

---

Track progress via PRs that close the checkbox items above, and update this plan as we land each phase.
