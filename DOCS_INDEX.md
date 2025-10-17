# EcoSysX Documentation Index

Welcome to the EcoSysX documentation! This index provides links to all documentation across the project, organized by component and purpose.

## 📚 Getting Started

- **[README.md](README.md)** - Project overview and quick start
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project
- **[LICENSE](LICENSE)** - MIT License terms
- **[AGENTS.md](AGENTS.md)** - Coding conventions for AI agents and contributors

## 🏗️ Project Status & History

### Completion Reports
- **[PHASE_0_COMPLETION.md](PHASE_0_COMPLETION.md)** - Phase 0 completion summary
- **[PHASE_2_INTEGRATION_COMPLETE.md](PHASE_2_INTEGRATION_COMPLETE.md)** - Phase 2 integration status
- **[CORE_ENGINE_EXTRACTION_COMPLETE.md](CORE_ENGINE_EXTRACTION_COMPLETE.md)** - Core engine extraction
- **[ENGINE_GUI_INTEGRATION_COMPLETE.md](ENGINE_GUI_INTEGRATION_COMPLETE.md)** - Engine-GUI integration

### Integration Guides
- **[PERFORMANCE_INTEGRATION_GUIDE.md](PERFORMANCE_INTEGRATION_GUIDE.md)** - Performance system integration
- **[LLAMA_INTEGRATION.md](LLAMA_INTEGRATION.md)** - LLM/Llama service integration
- **[CRASH_ANALYSIS_SUMMARY.md](CRASH_ANALYSIS_SUMMARY.md)** - Crash analysis and fixes

## 🖥️ Qt GUI Application

The Qt-based native desktop application for high-performance visualization.

### Start Here
- **[qt-gui/START_HERE.md](qt-gui/START_HERE.md)** - 👈 **Start here for Qt GUI development**
- **[qt-gui/README.md](qt-gui/README.md)** - Qt GUI overview
- **[qt-gui/DOCS_INDEX.md](qt-gui/DOCS_INDEX.md)** - Complete Qt GUI documentation index

### Development
- **[qt-gui/DEVELOPMENT_SETUP.md](qt-gui/DEVELOPMENT_SETUP.md)** - Setup instructions
- **[qt-gui/INSTALL_BUILD_ENVIRONMENT.md](qt-gui/INSTALL_BUILD_ENVIRONMENT.md)** - Build environment setup
- **[qt-gui/BUILD_STATUS.md](qt-gui/BUILD_STATUS.md)** - Current build status
- **[qt-gui/CODING_STANDARDS.md](qt-gui/CODING_STANDARDS.md)** - C++ coding standards
- **[qt-gui/PROJECT_STRUCTURE.md](qt-gui/PROJECT_STRUCTURE.md)** - Project structure overview

### Testing
- **[qt-gui/tests/README.md](qt-gui/tests/README.md)** - Test suite overview
- **[qt-gui/GUI_TEST_SUITE.md](qt-gui/GUI_TEST_SUITE.md)** - GUI test documentation
- **[qt-gui/docs/1-testing-scope.md](qt-gui/docs/1-testing-scope.md)** - Testing scope and coverage

### Integration & Protocols
- **[qt-gui/INTEGRATION_PLAN.md](qt-gui/INTEGRATION_PLAN.md)** - Integration strategy
- **[qt-gui/PROTOCOL_QUICKREF.md](qt-gui/PROTOCOL_QUICKREF.md)** - Protocol quick reference
- **[qt-gui/CODEX_INTEGRATION_SUMMARY.md](qt-gui/CODEX_INTEGRATION_SUMMARY.md)** - Codex integration

### Sprint Reports
- **[qt-gui/SPRINT_1_COMPLETE.md](qt-gui/SPRINT_1_COMPLETE.md)** - Sprint 1 completion
- **[qt-gui/SPRINT_1_COMPLETION_REPORT.md](qt-gui/SPRINT_1_COMPLETION_REPORT.md)** - Sprint 1 detailed report
- **[qt-gui/SPRINT_2_COMPLETE.md](qt-gui/SPRINT_2_COMPLETE.md)** - Sprint 2 completion
- **[qt-gui/QUICK_REFERENCE.md](qt-gui/QUICK_REFERENCE.md)** - Quick reference guide

### Phase Reports
- **[qt-gui/PHASE_1_SUMMARY.md](qt-gui/PHASE_1_SUMMARY.md)** - Phase 1 summary
- **[qt-gui/PHASE_2_COMPLETE_OFFICIAL.md](qt-gui/PHASE_2_COMPLETE_OFFICIAL.md)** - Phase 2 official completion
- **[qt-gui/PHASE_2_SUMMARY_FINAL.md](qt-gui/PHASE_2_SUMMARY_FINAL.md)** - Phase 2 final summary
- **[qt-gui/GUI_FULL_PROGRESS_UPDATE.md](qt-gui/GUI_FULL_PROGRESS_UPDATE.md)** - Full progress update

## 📦 Core Engine

The core simulation engine powering EcoSysX.

- **[packages/genx-engine/README.md](packages/genx-engine/README.md)** - Core engine documentation
- **[packages/genx-engine/src/](packages/genx-engine/src/)** - Engine source code

## 🔌 Services

Backend services and sidecars for various functionality.

### Julia Agent Sidecar
- **[services/agents-sidecar/README.md](services/agents-sidecar/README.md)** - High-performance Julia agent system

### Engine Sidecar
- **[services/engine-sidecar/README.md](services/engine-sidecar/README.md)** - Engine service integration
- **[services/engine-sidecar/INTEGRATION.md](services/engine-sidecar/INTEGRATION.md)** - Integration guide

### LLM Service
- **[services/llama-service/README.md](services/llama-service/README.md)** - Language model integration service

### Mason Sidecar
- **[services/mason-sidecar/README.md](services/mason-sidecar/README.md)** - Agent coordination service

### Mesa Sidecar
- **[services/mesa-sidecar/](services/mesa-sidecar/)** - Mesa ABM integration

## 🌐 Web Frontend

React-based web interface for EcoSysX.

- **[src/](src/)** - React application source
  - `App.jsx` - Main application component
  - `EcosystemSimulator.jsx` - Ecosystem simulation UI
  - `PerformanceMonitoringDashboard.jsx` - Performance monitoring
  - `GPUComputeSystem.js` - GPU compute integration
  - `LLMService.js` - LLM service client

## 🔧 Development Tools

### CI/CD
- **[docs/CI_CD_INTEGRATION.md](docs/CI_CD_INTEGRATION.md)** - Continuous integration setup

### Scripts
- **[scripts/](scripts/)** - Build and utility scripts
- **[qt-gui/scripts/](qt-gui/scripts/)** - Qt-specific build scripts

### Baseline Artifacts
- **[baseline-artifacts/README.md](baseline-artifacts/README.md)** - Baseline artifacts overview
- **[baseline-artifacts/v0-baseline-golden-log.md](baseline-artifacts/v0-baseline-golden-log.md)** - Baseline golden log
- **[baseline-artifacts/v0-baseline-schema.json](baseline-artifacts/v0-baseline-schema.json)** - Baseline schema

## 📖 Additional Documentation

### Qt GUI Docs
See **[qt-gui/docs/](qt-gui/docs/)** for additional Qt GUI documentation:
- **[1-testing-scope.md](qt-gui/docs/1-testing-scope.md)** - Testing scope and standards
- Additional technical documentation

### Examples
- **[examples/basic.mjs](examples/basic.mjs)** - Basic usage examples

## 🗺️ Documentation by Role

### For New Contributors
1. Start with [CONTRIBUTING.md](CONTRIBUTING.md)
2. Review [AGENTS.md](AGENTS.md) for coding standards
3. Read [README.md](README.md) for project overview
4. Set up your environment:
   - Qt GUI: [qt-gui/DEVELOPMENT_SETUP.md](qt-gui/DEVELOPMENT_SETUP.md)
   - Web: `npm install` in root directory

### For Qt GUI Developers
1. **Start here**: [qt-gui/START_HERE.md](qt-gui/START_HERE.md)
2. Review [qt-gui/DOCS_INDEX.md](qt-gui/DOCS_INDEX.md)
3. Follow [qt-gui/CODING_STANDARDS.md](qt-gui/CODING_STANDARDS.md)
4. Run tests: [qt-gui/tests/README.md](qt-gui/tests/README.md)

### For Service Developers
1. Review service-specific READMEs in `services/*/README.md`
2. Check integration guides (e.g., [services/engine-sidecar/INTEGRATION.md](services/engine-sidecar/INTEGRATION.md))
3. Follow [AGENTS.md](AGENTS.md) conventions

### For AI Agents
1. **Essential**: Read [AGENTS.md](AGENTS.md) thoroughly
2. Review [CONTRIBUTING.md](CONTRIBUTING.md)
3. Check module-specific documentation before modifying code
4. Follow test policy in [AGENTS.md](AGENTS.md#test-policy)

## 🔍 Finding Documentation

### By Component
- **Qt GUI**: All in `qt-gui/` directory
- **Services**: All in `services/*/` directories
- **Core Engine**: In `packages/genx-engine/`
- **Web Frontend**: In `src/` directory

### By Type
- **Setup/Installation**: Files with "SETUP", "INSTALL", "BUILD" in name
- **Development**: "DEVELOPMENT", "CODING", "STANDARDS" files
- **Testing**: Files in `tests/` directories and "TEST" in name
- **Integration**: "INTEGRATION", "PROTOCOL" files
- **Status**: "COMPLETE", "SUMMARY", "STATUS" files

## 📝 Documentation Standards

When creating new documentation:
- Place in appropriate component directory
- Update this index
- Follow Markdown formatting conventions
- Include code examples where relevant
- Add links to related documentation

## 🤝 Contributing to Documentation

Documentation contributions are welcome! Please:
1. Follow the structure outlined in this index
2. Update this index when adding new documentation
3. Keep documentation close to the code it describes
4. Include examples and diagrams where helpful

---

**Last Updated**: October 17, 2025  
**Maintained by**: EcoSysX Contributors

For questions or suggestions about documentation, please open an issue on GitHub.
