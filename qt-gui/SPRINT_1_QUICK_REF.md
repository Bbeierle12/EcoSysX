# Sprint 1 Quick Reference

This guide provides quick reference information for working with the Sprint 1 codebase.

## Component Overview

### Core Components

#### EngineClient (`src/core/EngineClient.h`)
**Purpose**: JSON-RPC communication with Node.js sidecar

**Key Methods**:
```cpp
void start(const Configuration& config);  // Start engine with config
void stop();                               // Stop engine
void step();                               // Step simulation one tick
void reset();                              // Reset simulation state
State state() const;                       // Current engine state
int currentStep() const;                   // Current simulation step
```

**Key Signals**:
```cpp
void started();                            // Engine started successfully
void stopped();                            // Engine stopped
void stepped(int currentStep, int total);  // Simulation stepped
void snapshotReceived(const QJsonObject&); // Snapshot data received
void errorOccurred(const QString& error);  // Error occurred
void stateChanged(State newState);         // State changed
void logMessage(const QString& message);   // Log message from engine
```

**States**: `Idle`, `Starting`, `Running`, `Stopping`, `Stopped`, `Error`

**Thread Safety**: Designed to run in worker thread, uses signals for UI updates

---

#### Configuration (`src/core/Configuration.h`)
**Purpose**: EngineConfigV1 schema model

**Key Methods**:
```cpp
QJsonObject toJson() const;                // Serialize to JSON
void fromJson(const QJsonObject& json);    // Deserialize from JSON
bool validate(QStringList* errors = nullptr); // Validate configuration
bool loadFromFile(const QString& path, QString* error); // Load from file
bool saveToFile(const QString& path, QString* error);   // Save to file
```

**Sections**:
- `simulation`: stepsPerTick, gridWidth, gridHeight
- `agents`: initialCount, initialInfectedRate, moveProbability, interactionRadius
- `disease`: transmissionRate, recoveryRate, mortalityRate, incubationSteps
- `environment`: resourceRegeneration, carryingCapacity
- `rng`: seed, algorithm

---

### UI Components

#### MainWindow (`src/ui/MainWindow.h`)
**Purpose**: Main application window

**Features**:
- Menu bar: File, Edit, View, Help
- Toolbar: Start, Stop, Step, Reset
- Dock widgets: ConfigPanel (left), EventLogPanel (bottom)
- Status bar: State text, step counter
- Settings persistence

**Thread Architecture**:
```cpp
// EngineClient runs in worker thread
QThread* m_engineThread;
EngineClient* m_engineClient;

// Use QMetaObject::invokeMethod for cross-thread calls
QMetaObject::invokeMethod(m_engineClient, &EngineClient::start);
```

---

#### ConfigPanel (`src/ui/panels/ConfigPanel.h`)
**Purpose**: Configuration editor

**Key Methods**:
```cpp
Configuration configuration() const;       // Get current config
void setConfiguration(const Configuration&); // Set config
bool isDirty() const;                      // Check for unsaved changes
bool validate(QStringList* errors = nullptr); // Validate current values
bool apply();                              // Apply and emit configurationChanged
bool loadFromFile();                       // Load with file dialog
bool saveToFile();                         // Save with file dialog
void reset();                              // Reset to defaults
```

**Key Signals**:
```cpp
void configurationChanged(const Configuration&); // Config applied
void dirtyStateChanged(bool dirty);        // Unsaved changes flag
void validationStateChanged(bool valid);   // Validation result
```

---

#### EventLogPanel (`src/ui/panels/EventLogPanel.h`)
**Purpose**: Log message display

**Key Methods**:
```cpp
void logInfo(const QString& message);      // Log info message
void logWarning(const QString& message);   // Log warning message
void logError(const QString& message);     // Log error message
void log(LogSeverity severity, const QString&); // Log with severity
void clear();                              // Clear all entries
bool exportToFile(const QString& path);    // Export to file
```

**Severity Levels**: `Info`, `Warning`, `Error`

**Colors**: INFO (black), WARN (orange), ERROR (red)

---

## Common Workflows

### Starting the Engine

```cpp
// 1. Get configuration from ConfigPanel
Configuration config = configPanel->configuration();

// 2. Validate configuration
QStringList errors;
if (!config.validate(&errors)) {
    // Show errors
    return;
}

// 3. Start engine (thread-safe)
QMetaObject::invokeMethod(engineClient, [this, config]() {
    engineClient->start(config);
});

// 4. Wait for started() signal
connect(engineClient, &EngineClient::started, this, [this]() {
    logPanel->logInfo("Engine started successfully");
});
```

### Handling Configuration Changes

```cpp
// 1. Connect to configurationChanged signal
connect(configPanel, &ConfigPanel::configurationChanged,
        this, &MainWindow::onConfigurationChanged);

// 2. Handle configuration change
void MainWindow::onConfigurationChanged(const Configuration& config) {
    m_currentConfig = config;
    logPanel->logInfo("Configuration updated");
    
    // If engine is running, may need to restart
    if (engineClient->state() == EngineClient::State::Running) {
        // Prompt user to restart
    }
}
```

### Displaying Log Messages

```cpp
// Info message
logPanel->logInfo("Simulation started");

// Warning message
logPanel->logWarning("High infection rate detected");

// Error message
logPanel->logError("Engine communication failure");

// Custom severity
logPanel->log(LogSeverity::Warning, "Custom warning message");
```

### Tracking Dirty State

```cpp
// Connect to dirtyStateChanged signal
connect(configPanel, &ConfigPanel::dirtyStateChanged,
        this, &MainWindow::onConfigDirtyStateChanged);

// Update window title
void MainWindow::onConfigDirtyStateChanged(bool dirty) {
    QString title = "EcoSysX - Qt GUI";
    if (dirty) {
        title += " *";  // Unsaved indicator
    }
    setWindowTitle(title);
}
```

## Testing

### Running Tests

```powershell
# Build tests
cd build
cmake -G Ninja ..
ninja

# Run all tests
ctest --output-on-failure

# Run specific test
.\tests\tst_engineclient.exe
```

### Writing Unit Tests

```cpp
#include <QtTest/QtTest>

class TestMyClass : public QObject {
    Q_OBJECT
    
private slots:
    void testSomething() {
        MyClass obj;
        QCOMPARE(obj.value(), 42);
        QVERIFY(obj.isValid());
    }
};

QTEST_MAIN(TestMyClass)
#include "tst_myclass.moc"
```

### Using FakeTransport

```cpp
// Create fake transport for EngineClient testing
FakeTransport* fake = new FakeTransport();

// Simulate startup
fake->start();
fake->sendMessage("ready", QJsonObject());

// Simulate step response
QJsonObject payload;
payload["step"] = 10;
fake->sendMessage("step", payload);

// Simulate error
fake->sendError("Test error message");
```

## Build Configuration

### CMakeLists.txt Structure

```cmake
# Root CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(ecosysx-gui)
find_package(Qt6 REQUIRED COMPONENTS Core Widgets Network)
add_subdirectory(src)
add_subdirectory(tests)

# src/CMakeLists.txt
set(SOURCES main.cpp core/EngineClient.cpp ...)
set(HEADERS core/EngineClient.h ...)
add_executable(ecosysx-gui ${SOURCES} ${HEADERS})
target_link_libraries(ecosysx-gui Qt6::Widgets Qt6::Network)

# tests/CMakeLists.txt
enable_testing()
add_executable(tst_engineclient unit/tst_engineclient.cpp)
target_link_libraries(tst_engineclient Qt6::Test)
add_test(NAME tst_engineclient COMMAND tst_engineclient)
```

### Adding New Source Files

1. Create `.h` and `.cpp` files in appropriate directory
2. Add to `set(SOURCES ...)` in `src/CMakeLists.txt`
3. Add to `set(HEADERS ...)` in `src/CMakeLists.txt`
4. Rebuild: `ninja` (CMake auto-detects changes)

### Adding New Tests

1. Create `tst_*.cpp` in `tests/unit/` or `tests/integration/`
2. Add to `tests/CMakeLists.txt`:
   ```cmake
   add_qt_test(tst_mytest unit/tst_mytest.cpp)
   ```
3. Rebuild and run: `ninja && ctest`

## Debugging

### Enabling Debug Output

```cpp
// In main.cpp
qSetMessagePattern("[%{time HH:mm:ss.zzz}] %{type}: %{message}");

// Use qDebug() for debug output
qDebug() << "Engine state:" << engineClient->state();
qWarning() << "High CPU usage detected";
qCritical() << "Fatal error occurred";
```

### Debugging Thread Issues

```cpp
// Check which thread you're on
qDebug() << "Current thread:" << QThread::currentThread();
qDebug() << "UI thread:" << QApplication::instance()->thread();

// Ensure signal is queued
connect(source, &Source::signal,
        dest, &Dest::slot,
        Qt::QueuedConnection);  // Explicit queue for cross-thread
```

### Common Issues

**Issue**: MOC errors during build
**Solution**: Ensure class has `Q_OBJECT` macro and inherits `QObject`

**Issue**: Signals not received across threads
**Solution**: Use `Qt::QueuedConnection` or `QMetaObject::invokeMethod`

**Issue**: UI freezes during engine operations
**Solution**: Ensure EngineClient is in worker thread, not UI thread

**Issue**: Configuration validation always fails
**Solution**: Check ValidationUtils logic and error message output

## Code Style

### Naming Conventions
- **Classes**: `PascalCase` (e.g., `EngineClient`)
- **Methods**: `camelCase` (e.g., `startEngine()`)
- **Members**: `m_camelCase` (e.g., `m_engineClient`)
- **Signals**: `camelCase` (e.g., `engineStarted()`)
- **Slots**: `onEventName` (e.g., `onStartClicked()`)

### Header Documentation
```cpp
/**
 * @brief Brief description
 * 
 * Longer description with details.
 * 
 * @param param1 Description of parameter
 * @return Description of return value
 */
ReturnType methodName(ParamType param1);
```

### Signal/Slot Connections
```cpp
// Prefer new-style connections
connect(sender, &Sender::signal,
        receiver, &Receiver::slot);

// Use lambdas for simple logic
connect(button, &QPushButton::clicked, [this]() {
    doSomething();
});
```

## Resources

### Documentation Files
- `README.md` - Project overview and setup
- `SPRINT_1_COMPLETE.md` - Sprint 1 completion summary
- `SPRINT_1_CHECKLIST.md` - Original sprint plan
- `GUI_TEST_SUITE.md` - Testing guide
- `CODING_STANDARDS.md` - C++ coding standards
- `PROJECT_STRUCTURE.md` - Directory organization

### External Resources
- [Qt Documentation](https://doc.qt.io/qt-6/)
- [Qt Widgets](https://doc.qt.io/qt-6/qtwidgets-index.html)
- [Qt Test Framework](https://doc.qt.io/qt-6/qtest-overview.html)
- [CMake Documentation](https://cmake.org/documentation/)

### Contact & Support
- Project Repository: [Your repo URL]
- Issue Tracker: [Your issue tracker URL]
- Wiki: [Your wiki URL]

---

**Last Updated**: October 6, 2025  
**Sprint**: Phase 2 - Sprint 1 (Complete)  
**Next**: Phase 2 - Sprint 2 (Metrics & Visualization)
