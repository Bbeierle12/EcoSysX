# EcoSysX Qt GUI - Coding Standards and Guidelines

## Overview
This document establishes coding standards and best practices for the EcoSysX Qt GUI project to ensure code consistency, maintainability, and quality.

## Language and Framework
- **Primary Language**: C++ (C++17 or later)
- **Framework**: Qt 6.x
- **Build System**: CMake (minimum version 3.16)

## Code Style

### Naming Conventions

#### Classes and Types
- Use PascalCase for class names
- Prefix Qt classes with 'Q' only when necessary for disambiguation
```cpp
class MainWindow;
class EngineClient;
class SnapshotBuffer;
```

#### Functions and Methods
- Use camelCase for function and method names
- Use descriptive, verb-based names
```cpp
void startSimulation();
void processSnapshot(const QJsonObject& data);
bool validateConfiguration();
```

#### Variables
- Use camelCase for local variables and parameters
- Use descriptive names (avoid single-letter except for iterators)
```cpp
int agentCount;
QString configFilePath;
double energyMean;
```

#### Member Variables
- Prefix private member variables with `m_`
```cpp
class MetricsPanel {
private:
    QVector<double> m_tickData;
    QString m_currentProvider;
    int m_maxDataPoints;
};
```

#### Constants and Enums
- Use UPPER_SNAKE_CASE for constants
- Use PascalCase for enum types and enum values
```cpp
const int MAX_AGENTS = 10000;
const double DEFAULT_STEP_SIZE = 1.0;

enum class SimulationState {
    Idle,
    Starting,
    Running,
    Paused,
    Stopped,
    Error
};
```

### Formatting

#### Indentation and Spacing
- Use 4 spaces for indentation (no tabs)
- Place opening braces on the same line (K&R style)
- Add space after keywords and around operators
```cpp
if (condition) {
    doSomething();
} else {
    doSomethingElse();
}

for (int i = 0; i < count; ++i) {
    processItem(i);
}
```

#### Line Length
- Maximum line length: 100 characters
- Break long lines at logical points

#### File Organization
```cpp
// 1. Copyright/License header
// 2. Include guard or #pragma once
// 3. System includes
// 4. Qt includes
// 5. Third-party includes
// 6. Project includes
// 7. Forward declarations
// 8. Class declaration

#pragma once

#include <vector>
#include <memory>

#include <QMainWindow>
#include <QTimer>

#include "EngineClient.h"
```

## Qt-Specific Guidelines

### Signals and Slots
- Declare signals in the `signals:` section
- Use `Q_EMIT` or `emit` keyword when emitting signals
- Connect signals/slots using new syntax when possible
```cpp
class EngineClient : public QObject {
    Q_OBJECT

public:
    explicit EngineClient(QObject* parent = nullptr);

signals:
    void snapshotReceived(const QJsonObject& data);
    void errorOccurred(const QString& message);

private slots:
    void onProcessFinished(int exitCode);
};

// In implementation
connect(m_client, &EngineClient::snapshotReceived,
        this, &MetricsPanel::updateCharts);
```

### Memory Management
- Use smart pointers (`std::unique_ptr`, `std::shared_ptr`) for non-Qt objects
- Let Qt handle memory for QObject-derived classes with parent-child relationship
- Use `deleteLater()` for QObjects instead of `delete`
```cpp
// Qt parent-child (Qt manages memory)
auto* panel = new ConfigPanel(this);

// Non-Qt objects
auto buffer = std::make_unique<DataBuffer>();
```

### Threading
- Use `QThread` for threading
- Move worker objects to threads, don't subclass QThread
- Use signals/slots for thread communication
```cpp
QThread* thread = new QThread(this);
EngineClient* client = new EngineClient();
client->moveToThread(thread);
thread->start();
```

## Documentation

### Header Documentation
- Use Doxygen-style comments for classes, methods, and complex code
```cpp
/**
 * @brief The EngineClient class manages communication with the Node.js sidecar
 * 
 * This class runs on a worker thread and handles JSON-RPC communication
 * with the EcoSysX simulation engine via stdio or socket.
 */
class EngineClient : public QObject {
    // ...
};

/**
 * @brief Sends a step command to the engine
 * @param steps Number of simulation steps to execute
 * @return true if command was sent successfully, false otherwise
 */
bool sendStepCommand(int steps);
```

### Inline Comments
- Explain "why", not "what"
- Use comments for complex algorithms or non-obvious code
- Keep comments up-to-date with code changes

## Error Handling

### Exception Safety
- Use RAII (Resource Acquisition Is Initialization)
- Avoid throwing exceptions across Qt signal/slot boundaries
- Use return codes or signals to communicate errors

### Logging
- Use a consistent logging approach
- Include context in error messages
```cpp
qWarning() << "Failed to parse snapshot:" << error.message();
qDebug() << "Engine state transition:" << oldState << "->" << newState;
```

## Testing

### Unit Tests
- Write tests for all non-trivial logic
- Use Qt Test framework
- Aim for >80% code coverage for business logic
```cpp
class TestSnapshotBuffer : public QObject {
    Q_OBJECT

private slots:
    void testDataInsertion();
    void testRollingWindow();
    void testDownsampling();
};
```

### Test Organization
- Place tests in `tests/` directory
- Mirror source structure in test structure
- Use descriptive test names

## Version Control

### Commit Messages
- Use clear, descriptive commit messages
- Format: `[Component] Brief description`
- Include "why" in commit body for non-obvious changes
```
[EngineClient] Add JSON-RPC request batching

Implements batched step commands to reduce IPC overhead
when running at high tick rates. Configurable batch size
defaults to 10 steps per request.
```

### Branching
- Use feature branches for new functionality
- Branch naming: `feature/description`, `bugfix/description`
- Keep branches short-lived

## Performance Guidelines

### General
- Profile before optimizing
- Use Qt's container classes when interfacing with Qt APIs
- Use STL containers for pure C++ code
- Prefer const references for parameters

### GUI Performance
- Update UI at maximum 30 FPS
- Use batch painting for large datasets
- Minimize allocations in paint events
- Cache expensive computations

### Memory
- Implement rolling windows for time-series data
- Set reasonable limits on buffer sizes
- Monitor memory usage in long-running scenarios

## Security

### Input Validation
- Validate all user inputs
- Sanitize data from external sources (sidecar)
- Use Qt's JSON validation features

### IPC Security
- Default to stdio communication
- If using sockets, bind to localhost only
- Don't log sensitive data

## Build and Dependencies

### CMake
- Support out-of-source builds
- Use `find_package` for dependencies
- Provide clear dependency documentation

### Qt Version
- Target Qt 6.2 or later
- Document any Qt version-specific features used
- Test on multiple Qt versions in CI

## Code Review Checklist

Before submitting code for review:
- [ ] Code follows naming conventions
- [ ] Code is properly formatted
- [ ] All public APIs are documented
- [ ] Tests are included and passing
- [ ] No memory leaks (checked with valgrind/sanitizers)
- [ ] No compiler warnings
- [ ] Code is thread-safe where applicable
- [ ] Error conditions are handled
- [ ] Commit messages are clear

## References
- [Qt Coding Style](https://wiki.qt.io/Qt_Coding_Style)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Effective Qt](https://doc.qt.io/qt-6/best-practices.html)
