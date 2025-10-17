# EcoSysX Scripts Reference

Comprehensive guide to all automation scripts in the EcoSysX monorepo.

## Table of Contents

- [Overview](#overview)
- [Root Scripts](#root-scripts)
- [Component Scripts](#component-scripts)
- [CI/CD](#cicd)
- [Script Conventions](#script-conventions)

## Overview

EcoSysX uses a two-tiered script organization:

1. **Root Scripts** (`scripts/`) - Cross-repository orchestration
2. **Component Scripts** - Module-specific operations (e.g., `qt-gui/scripts/`)

All scripts follow consistent naming conventions and are available in both PowerShell (`.ps1`) and Bash (`.sh`) for cross-platform compatibility.

## Root Scripts

Located in `scripts/` directory. These scripts orchestrate operations across all components.

### Build Scripts

#### `build-all.ps1` / `build-all.sh`

Build all EcoSysX components in dependency order.

**Usage:**
```powershell
# PowerShell
.\scripts\build-all.ps1                        # Build everything
.\scripts\build-all.ps1 -Component web         # Build web only
.\scripts\build-all.ps1 -Component gui -Configuration release

# Bash
./scripts/build-all.sh                         # Build everything
./scripts/build-all.sh web                     # Build web only
./scripts/build-all.sh gui release             # Build Qt GUI in release mode
```

**Components:**
- `engine` - Core genx-engine package
- `web` - React web application
- `gui` - Qt desktop application
- `services` - All backend sidecars
- `all` (default) - Everything in order

**Build Order:**
1. genx-engine (shared package)
2. Web application (depends on engine)
3. Qt GUI application
4. Service sidecars

**Exit Codes:**
- `0` - All builds succeeded
- `1` - One or more builds failed

---

### Test Scripts

#### `test-all.ps1` / `test-all.sh`

Run test suites for all components.

**Usage:**
```powershell
# PowerShell
.\scripts\test-all.ps1                         # Test everything
.\scripts\test-all.ps1 -Component gui          # Test Qt GUI only
.\scripts\test-all.ps1 -Coverage               # With coverage reports

# Bash
./scripts/test-all.sh                          # Test everything
./scripts/test-all.sh gui                      # Test Qt GUI only
./scripts/test-all.sh --coverage               # With coverage reports
```

**Components:**
- `engine` - genx-engine unit tests (Vitest)
- `web` - Web app tests (Vitest)
- `gui` - Qt GUI tests (QtTest, CTest)
- `services` - Service tests (framework-specific)
- `all` (default) - All test suites

**Test Frameworks:**
- JavaScript/TypeScript: Vitest
- C++ (Qt): QtTest with CTest
- Julia: Julia Test.jl
- Python: pytest

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more test suites failed

---

### Cleanup Scripts

#### `clean-all.ps1` / `clean-all.sh`

Remove build artifacts, caches, and optionally dependencies.

**Usage:**
```powershell
# PowerShell
.\scripts\clean-all.ps1                        # Clean everything
.\scripts\clean-all.ps1 -Component gui         # Clean Qt GUI only
.\scripts\clean-all.ps1 -KeepDeps              # Keep node_modules

# Bash
./scripts/clean-all.sh                         # Clean everything
./scripts/clean-all.sh gui                     # Clean Qt GUI only
./scripts/clean-all.sh --keep-deps             # Keep node_modules
```

**Removes:**
- `dist/` - Build outputs (web, engine)
- `build/` - CMake build directory (Qt GUI)
- `coverage/` - Test coverage reports
- `.vitest/` - Vitest cache
- `node_modules/` - Unless `--keep-deps` specified

**Components:**
- `engine` - genx-engine artifacts
- `web` - Web app artifacts
- `gui` - Qt GUI build directory
- `services` - Service artifacts
- `all` (default) - Everything

---

### Utility Scripts

#### `generate-golden-log.mjs`

Generate baseline test data for regression testing.

**Usage:**
```bash
node scripts/generate-golden-log.mjs
```

**Purpose:**
- Creates deterministic simulation output
- Used for regression testing
- Outputs to `baseline-artifacts/`

**Requirements:**
- Node.js 18+
- genx-engine built

---

#### `deploy.ps1`

Deploy EcoSysX to production environment.

**Usage:**
```powershell
.\scripts\deploy.ps1
```

**Actions:**
- Builds all components
- Creates Docker images
- Deploys to configured environment

**Requirements:**
- Docker installed
- Production credentials configured

---

#### `fix_placeholders.py`

Fix placeholder values in generated code.

**Usage:**
```bash
python scripts/fix_placeholders.py
```

**Purpose:**
- Post-processing for code generation
- Replaces `TODO` and placeholder values
- Updates configuration files

---

#### `update_export.py`

Update export statements across codebase.

**Usage:**
```bash
python scripts/update_export.py
```

**Purpose:**
- Synchronize module exports
- Update barrel files
- Maintain consistent API surface

---

## Component Scripts

### Qt GUI Scripts (`qt-gui/scripts/`)

#### `build.ps1` / `build.sh`

Build Qt GUI application using CMake presets.

**Usage:**
```powershell
# PowerShell (Windows)
.\qt-gui\scripts\build.ps1                     # Default (dev preset)
.\qt-gui\scripts\build.ps1 -Preset release     # Release build
.\qt-gui\scripts\build.ps1 -Preset ci-mingw    # CI build (MinGW)

# Bash (Linux/macOS)
./qt-gui/scripts/build.sh                      # Default (dev preset)
./qt-gui/scripts/build.sh release              # Release build
./qt-gui/scripts/build.sh ci-unix              # CI build (Unix)
```

**CMake Presets:**
- `dev` - Debug build with Ninja (default)
- `dev-mingw` - Debug build with MinGW
- `dev-vs` - Debug build with Visual Studio
- `ci-unix` - CI release build (Unix/Linux)
- `ci-mingw` - CI release build (Windows MinGW)
- `release` - Optimized release build

**Output:**
- Binaries: `qt-gui/build/bin/`
- Libraries: `qt-gui/build/lib/`
- Tests: Executed via CTest

---

#### `setup-environment.ps1`

Set up development environment for Qt GUI (Windows only).

**Usage:**
```powershell
.\qt-gui\scripts\setup-environment.ps1
```

**Actions:**
- Verifies Qt installation
- Checks CMake version
- Validates MinGW toolchain
- Sets environment variables

**Requirements:**
- Qt 6.9.3+
- CMake 3.23+
- MinGW 64-bit (Windows)

---

### Engine Package Scripts (`packages/genx-engine/scripts/`)

#### `benchmark.ts`

Run performance benchmarks for core engine.

**Usage:**
```bash
cd packages/genx-engine
npm run benchmark
```

**Benchmarks:**
- Agent update performance
- Physics simulation
- Spatial queries
- Memory allocation

**Output:**
- Console report
- JSON results in `benchmark-results/`

---

## CI/CD

### GitHub Actions Workflows

Located in `.github/workflows/`:

#### `web.yml`

CI/CD for React web application.

**Triggers:**
- Push to `main`, `develop`
- Pull requests to `main`, `develop`
- Paths: `src/**`, `packages/genx-engine/**`, `*.config.js`

**Jobs:**
- Lint (ESLint)
- Build (Vite)
- Test (Vitest)
- Upload artifacts

**Matrix:**
- Node.js 18, 20

---

#### `gui.yml`

CI/CD for Qt GUI application.

**Triggers:**
- Push to `main`, `develop`
- Pull requests to `main`, `develop`
- Paths: `qt-gui/**`

**Jobs:**
- Build (CMake presets)
- Test (CTest)
- Upload artifacts

**Matrix:**
- `ubuntu-latest` (ci-unix preset)
- `windows-latest` (ci-mingw preset)

---

#### `engine-sidecar.yml`

CI/CD for engine sidecar service.

**Triggers:**
- Push to `main`, `develop`
- Pull requests to `main`, `develop`
- Paths: `services/engine-sidecar/**`, `packages/genx-engine/**`

**Jobs:**
- Build dependency chain
- Docker image build
- Push to GHCR
- Security scan (Trivy)

**Matrix:**
- Node.js 18

---

## Script Conventions

### Naming

All scripts follow consistent naming:

- **Kebab-case**: `build-all.ps1`, `setup-environment.sh`
- **No spaces**: Use hyphens instead
- **Descriptive**: Name indicates purpose (`test-all`, not `t`)
- **Extensions**: `.ps1` (PowerShell), `.sh` (Bash), `.mjs` (ES modules), `.py` (Python)

### Structure

**PowerShell Scripts:**
```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Brief description
.DESCRIPTION
    Detailed description
.PARAMETER ParamName
    Parameter description
.EXAMPLE
    Usage example
#>

param(
    [string]$ParamName = "default"
)

$ErrorActionPreference = "Stop"

# Script body...
```

**Bash Scripts:**
```bash
#!/usr/bin/env bash
# Brief description
# Usage:
#   ./script.sh [args]

set -e  # Exit on error

# Script body...
```

### Error Handling

- **PowerShell**: `$ErrorActionPreference = "Stop"` + try/catch
- **Bash**: `set -e` + error checks
- **Exit codes**: `0` for success, `1` for failure
- **Logging**: Colored output for status (Green=success, Red=error, Yellow=warning)

### Documentation

Each script includes:

1. **Synopsis** - One-line description
2. **Description** - Detailed purpose
3. **Parameters** - All options explained
4. **Examples** - Common usage patterns
5. **Requirements** - Dependencies and prerequisites

### Cross-Platform

- **Dual implementations**: Both `.ps1` and `.sh` for portability
- **Path handling**: Use appropriate separators (`\` vs `/`)
- **Line endings**: LF for `.sh`, CRLF for `.ps1`
- **Shebang**: `#!/usr/bin/env bash` or `#!/usr/bin/env pwsh`

---

## Quick Reference

### Common Workflows

**Full clean build and test:**
```bash
# Bash
./scripts/clean-all.sh
./scripts/build-all.sh
./scripts/test-all.sh

# PowerShell
.\scripts\clean-all.ps1
.\scripts\build-all.ps1
.\scripts\test-all.ps1
```

**Build specific component:**
```bash
# Web only
./scripts/build-all.sh web

# Qt GUI release
./scripts/build-all.sh gui release
```

**Test with coverage:**
```bash
./scripts/test-all.sh --coverage
```

**Clean but keep dependencies:**
```bash
./scripts/clean-all.sh --keep-deps
```

---

## Troubleshooting

### Script Not Found

**Issue:** `command not found` or `file not found`

**Solution:**
```bash
# Make script executable (Bash)
chmod +x scripts/*.sh
chmod +x qt-gui/scripts/*.sh

# Or run with interpreter
bash scripts/build-all.sh
pwsh scripts/build-all.ps1
```

### Permission Denied

**Issue:** `Permission denied` when executing

**Solution:**
```bash
# Bash - Add execute permission
chmod +x script-name.sh

# PowerShell - Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Build Fails

**Issue:** Build script exits with error

**Solution:**
1. Check error message for specific component
2. Clean and retry: `./scripts/clean-all.sh && ./scripts/build-all.sh`
3. Build components individually to isolate issue
4. Verify dependencies installed (npm, Qt, CMake)

### Tests Fail

**Issue:** Test script reports failures

**Solution:**
1. Run tests individually: `./scripts/test-all.sh gui`
2. Check test logs in component directories
3. Rebuild: `./scripts/build-all.sh`
4. Ensure environment setup (Qt, Node.js versions)

---

## See Also

- [CONTRIBUTING.md](CONTRIBUTING.md) - Setup and contribution guidelines
- [AGENTS.md](AGENTS.md) - Coding conventions and standards
- [DOCS_INDEX.md](DOCS_INDEX.md) - Complete documentation index
- [qt-gui/BUILD_STATUS.md](qt-gui/BUILD_STATUS.md) - Qt GUI build documentation
- [.github/workflows/](../.github/workflows/) - CI/CD configuration

---

**Last Updated:** 2025-01-17  
**Maintainers:** EcoSysX Contributors
