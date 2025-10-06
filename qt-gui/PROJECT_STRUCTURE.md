# EcoSysX Qt GUI - Project Structure

## Overview
This document outlines the directory structure and file organization for the EcoSysX Qt GUI project.

## Directory Layout

```
qt-gui/
├── CMakeLists.txt              # Main CMake configuration
├── README.md                   # Project documentation
├── CODING_STANDARDS.md         # Coding guidelines
├── PROJECT_STRUCTURE.md        # This file
├── .gitignore                  # Git ignore rules
│
├── src/                        # Source files
│   ├── main.cpp               # Application entry point
│   ├── CMakeLists.txt         # Source CMake config
│   │
│   ├── core/                  # Core application logic
│   │   ├── EngineClient.h
│   │   ├── EngineClient.cpp
│   │   ├── SnapshotBuffer.h
│   │   ├── SnapshotBuffer.cpp
│   │   ├── Configuration.h
│   │   ├── Configuration.cpp
│   │   └── CMakeLists.txt
│   │
│   ├── ui/                    # User interface components
│   │   ├── MainWindow.h
│   │   ├── MainWindow.cpp
│   │   ├── MainWindow.ui      # Qt Designer file
│   │   │
│   │   ├── panels/            # Dockable panels
│   │   │   ├── ConfigPanel.h
│   │   │   ├── ConfigPanel.cpp
│   │   │   ├── ConfigPanel.ui
│   │   │   ├── MetricsPanel.h
│   │   │   ├── MetricsPanel.cpp
│   │   │   ├── MetricsPanel.ui
│   │   │   ├── WorldView.h
│   │   │   ├── WorldView.cpp
│   │   │   ├── EventLogPanel.h
│   │   │   └── EventLogPanel.cpp
│   │   │
│   │   ├── widgets/           # Custom widgets
│   │   │   ├── ChartWidget.h
│   │   │   ├── ChartWidget.cpp
│   │   │   ├── WorldRenderer.h
│   │   │   └── WorldRenderer.cpp
│   │   │
│   │   └── dialogs/           # Dialog windows
│   │       ├── AboutDialog.h
│   │       ├── AboutDialog.cpp
│   │       ├── SettingsDialog.h
│   │       └── SettingsDialog.cpp
│   │
│   └── utils/                 # Utility classes
│       ├── JsonUtils.h
│       ├── JsonUtils.cpp
│       ├── ValidationUtils.h
│       ├── ValidationUtils.cpp
│       ├── Logger.h
│       └── Logger.cpp
│
├── include/                   # Public headers (if needed)
│   └── ecosysx/
│
├── resources/                 # Qt resources
│   ├── resources.qrc         # Resource collection file
│   ├── icons/                # Application icons
│   │   ├── app.ico
│   │   ├── app.png
│   │   ├── start.svg
│   │   ├── stop.svg
│   │   └── step.svg
│   ├── images/               # Images and graphics
│   └── translations/         # Translation files (.ts, .qm)
│       ├── ecosysx_en.ts
│       └── ecosysx_de.ts
│
├── tests/                    # Test files
│   ├── CMakeLists.txt       # Test CMake config
│   ├── test_main.cpp        # Test runner
│   │
│   ├── unit/                # Unit tests
│   │   ├── test_EngineClient.cpp
│   │   ├── test_SnapshotBuffer.cpp
│   │   ├── test_Configuration.cpp
│   │   └── test_JsonUtils.cpp
│   │
│   ├── integration/         # Integration tests
│   │   ├── test_EngineIntegration.cpp
│   │   └── test_UIWorkflow.cpp
│   │
│   └── fixtures/            # Test data and fixtures
│       ├── sample_config.json
│       ├── sample_snapshot.json
│       └── mock_responses/
│
├── docs/                    # Additional documentation
│   ├── GETTING_STARTED.md
│   ├── CONFIGURATION_REFERENCE.md
│   ├── TROUBLESHOOTING.md
│   ├── EXTENDING_GUI.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── ipc_protocol.md
│   │   └── threading_model.md
│   └── images/             # Documentation images
│       └── screenshots/
│
├── scripts/                # Build and utility scripts
│   ├── build.sh           # Unix build script
│   ├── build.ps1          # Windows build script
│   ├── setup_dev.sh       # Development setup
│   ├── setup_dev.ps1
│   └── package/           # Packaging scripts
│       ├── windows.ps1
│       ├── macos.sh
│       └── linux.sh
│
├── packaging/             # Packaging configuration
│   ├── windows/
│   │   ├── installer.nsi  # NSIS installer script
│   │   └── app.rc         # Windows resources
│   ├── macos/
│   │   ├── Info.plist
│   │   └── entitlements.plist
│   └── linux/
│       ├── ecosysx.desktop
│       └── AppImage/
│
├── third_party/          # Third-party dependencies (if vendored)
│   └── README.md
│
└── build/               # Build output (gitignored)
```

## Key Files and Their Purposes

### Root Level
- **CMakeLists.txt**: Main build configuration defining project, dependencies, and build options
- **README.md**: Project documentation following the development outline
- **CODING_STANDARDS.md**: Coding style and best practices
- **.gitignore**: Files and directories to exclude from version control

### Source Directory (`src/`)

#### `main.cpp`
- Application entry point
- Initializes QApplication
- Creates and shows MainWindow
- Sets up global application settings

#### `core/`
Core business logic independent of UI:
- **EngineClient**: Manages IPC with Node.js sidecar, sends/receives JSON-RPC
- **SnapshotBuffer**: Ring buffer for time-series data, handles downsampling
- **Configuration**: Models EngineConfigV1, handles validation and serialization

#### `ui/`
All user interface code:
- **MainWindow**: Main application window, orchestrates panels and actions
- **panels/**: Dockable panels (Config, Metrics, WorldView, EventLog)
- **widgets/**: Reusable custom widgets (charts, renderers)
- **dialogs/**: Modal dialogs (About, Settings, file dialogs)

#### `utils/`
Helper utilities:
- **JsonUtils**: JSON parsing, validation, serialization helpers
- **ValidationUtils**: Configuration validation functions
- **Logger**: Application logging wrapper

### Resources (`resources/`)
- **resources.qrc**: Qt resource file listing all embedded resources
- **icons/**: SVG/PNG icons for toolbar and UI elements
- **translations/**: Localization files (for future i18n support)

### Tests (`tests/`)
- **unit/**: Fast, isolated tests for individual classes
- **integration/**: Tests combining multiple components or testing IPC
- **fixtures/**: Sample data files for testing

### Documentation (`docs/`)
- Getting started guide
- Configuration reference matching EngineConfigV1
- Troubleshooting common issues
- Architecture diagrams and design docs

### Scripts (`scripts/`)
- Build automation scripts for different platforms
- Development environment setup
- Packaging scripts for distribution

### Packaging (`packaging/`)
- Platform-specific packaging configuration
- Installer scripts and metadata
- Application icons and resources for each platform

## Module Dependencies

### Dependency Graph
```
main.cpp
  └── MainWindow
        ├── EngineClient (core)
        ├── SnapshotBuffer (core)
        ├── ConfigPanel
        │     └── Configuration (core)
        ├── MetricsPanel
        │     ├── SnapshotBuffer (core)
        │     └── ChartWidget
        ├── WorldView
        │     ├── SnapshotBuffer (core)
        │     └── WorldRenderer
        └── EventLogPanel

EngineClient uses:
  ├── QProcess or QTcpSocket
  ├── JsonUtils
  └── Configuration

All components can use:
  ├── Logger
  └── ValidationUtils
```

## File Naming Conventions

### Source Files
- Header files: `.h` extension
- Implementation files: `.cpp` extension
- Qt UI files: `.ui` extension (Qt Designer XML)
- Match class name: `ClassName.h` and `ClassName.cpp`

### Resource Files
- Qt resource collections: `.qrc`
- Icons: `.svg` preferred, `.png` for raster
- Translations: `.ts` (source), `.qm` (compiled)

### Test Files
- Prefix with `test_`: `test_ClassName.cpp`
- Test fixtures: descriptive names, `.json` for data files

## Build Outputs

### Debug Build
```
build/Debug/
  ├── ecosysx-gui.exe (or ecosysx-gui)
  ├── *.dll / *.so (Qt libraries in dev)
  └── tests/
        └── ecosysx-tests
```

### Release Build
```
build/Release/
  ├── ecosysx-gui.exe
  └── (dependencies handled by packaging)
```

## Adding New Components

### Adding a New Panel
1. Create `NewPanel.h`, `NewPanel.cpp`, and optionally `NewPanel.ui` in `src/ui/panels/`
2. Inherit from `QDockWidget` or `QWidget`
3. Register in `MainWindow`
4. Add tests in `tests/unit/test_NewPanel.cpp`

### Adding a New Core Class
1. Create `NewClass.h` and `NewClass.cpp` in `src/core/`
2. Keep Qt dependencies minimal (prefer QObject if needed)
3. Write unit tests in `tests/unit/test_NewClass.cpp`
4. Document in header with Doxygen comments

### Adding Resources
1. Add files to appropriate subdirectory in `resources/`
2. Update `resources/resources.qrc` with new file entries
3. Access in code using `:/path/to/resource`

## Migration Notes

### Moving from Initial Structure
- Existing Node.js engine stays in parent directory
- Qt GUI is self-contained in `qt-gui/` subdirectory
- Can be developed and built independently
- Communicates with Node engine via sidecar process

## Future Considerations

### Potential Additions
- `plugins/` directory for extensible functionality
- `benchmarks/` for performance testing
- `examples/` for code examples and tutorials
- Platform-specific `src/platform/` for OS-specific code

### Scalability
Structure supports:
- Multiple provider implementations
- Additional panel types
- Alternative rendering backends
- Plugin architecture
- Scriptable automation layer

---

This structure balances organization, discoverability, and Qt/CMake best practices while supporting the Sprint 1–4 development plan outlined in the main README.
