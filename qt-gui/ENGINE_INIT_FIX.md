# Engine Initialization Fix

**Date**: October 17, 2025  
**Issue**: Engine failing to start with "Sidecar script path not set" and "Failed to write complete message to engine" errors

## Problems Identified

### 1. Sidecar Script Path Not Found
- **Error**: `[ERROR] Engine error: Sidecar script path not set`
- **Location**: `EngineClient` constructor
- **Root Cause**: Path detection logic only went up one directory level, insufficient when running from `qt-gui/build/bin/`

### 2. Premature Init Command
- **Error**: `[ERROR] Engine error: Failed to write complete message to engine`
- **Location**: `MainWindow` start/reset actions  
- **Root Cause**: `sendInit()` called immediately after `start()`, before process ready to receive input

## Solutions Applied

### Fix 1: Robust Sidecar Path Detection

**File**: `qt-gui/src/core/EngineClient.cpp` (lines 38-73)

```cpp
// Navigate up to project root from various possible locations:
// - qt-gui/build/bin -> up 3 levels
// - qt-gui/build -> up 2 levels  
// - qt-gui -> up 1 level
QStringList possiblePaths;

for (int levelsUp = 0; levelsUp <= 4; ++levelsUp) {
    QDir testDir = QDir::current();
    for (int i = 0; i < levelsUp; ++i) {
        testDir.cdUp();
    }
    
    // Try engine-sidecar and services/engine-sidecar in this directory
    possiblePaths << testDir.filePath("services/engine-sidecar/main.js");
    possiblePaths << testDir.filePath("engine-sidecar/main.js");
    possiblePaths << testDir.filePath("services/engine-sidecar/engine_sidecar.js");
}

for (const QString& path : possiblePaths) {
    if (QFile::exists(path)) {
        m_sidecarScript = path;
        qDebug() << "Found sidecar script:" << path;
        break;
    }
}
```

**Benefits**:
- Works from any build directory depth
- Searches multiple possible sidecar locations
- Provides clear debugging output

### Fix 2: Process State Validation

**File**: `qt-gui/src/core/EngineClient.cpp` (lines 306-324)

```cpp
void EngineClient::sendMessage(const QJsonObject& message) {
    // Check if process is running and ready
    if (!m_process || m_process->state() != QProcess::Running) {
        emit errorOccurred("Cannot send message: engine process not running");
        return;
    }
    
    QJsonDocument doc(message);
    QByteArray json = doc.toJson(QJsonDocument::Compact);
    json.append('\n');
    
    qint64 written = m_process->write(json);
    m_process->waitForBytesWritten(1000);  // Wait up to 1 second for write
    
    if (written != json.size()) {
        emit errorOccurred(QString("Failed to write complete message to engine (wrote %1 of %2 bytes)")
                          .arg(written).arg(json.size()));
    }
}
```

**Benefits**:
- Validates process state before writing
- Waits for write operation to complete
- Provides detailed error information

### Fix 3: Delayed Initialization

**File**: `qt-gui/src/ui/MainWindow.cpp`

**Start Action** (lines 85-91):
```cpp
connect(m_startAction, &QAction::triggered, [this]() {
    QMetaObject::invokeMethod(m_engineClient, [this]() {
        m_engineClient->start();
        // Init will be sent when engine emits started() signal
    });
});
```

**onEngineStarted** (lines 286-305):
```cpp
void MainWindow::onEngineStarted() {
    m_logPanel->logInfo("Engine started successfully");
    
    // Now that engine is running, send initialization
    if (m_currentConfig.validate()) {
        m_logPanel->logInfo("Sending initialization to engine...");
        QMetaObject::invokeMethod(m_engineClient, [this]() {
            m_engineClient->sendInit(m_currentConfig.toJson());
        });
    } else {
        m_logPanel->logWarning("Configuration invalid, cannot initialize engine");
    }
    
    updateUIState();
    updateStatusBar();
    if (m_snapshotTimer) {
        m_snapshotTimer->start();
    }
    requestSnapshotAsync(QStringLiteral("full"));
}
```

**Benefits**:
- Waits for process to fully start before sending commands
- Validates configuration before initialization
- Provides clear user feedback
- Same pattern applied to reset action

## Testing Recommendations

### 1. Path Detection Test
```bash
# From various directories
cd qt-gui/build/bin
./ecosysx-gui.exe  # Should find sidecar

cd qt-gui/build
./bin/ecosysx-gui.exe  # Should find sidecar

cd qt-gui
./build/bin/ecosysx-gui.exe  # Should find sidecar
```

### 2. Initialization Flow Test
1. Launch GUI
2. Click "Start" button
3. Check log panel for messages:
   - "Starting engine: node <path>"
   - "Engine started successfully"
   - "Sending initialization to engine..."
   - "Engine initialized"
4. Verify no "Sidecar script path not set" errors
5. Verify no "Failed to write complete message" errors

### 3. Reset Test
1. Start engine
2. Let it run a few steps
3. Click "Reset" button
4. Verify same initialization sequence works

## Rebuild Instructions

To apply these fixes:

```powershell
cd qt-gui\build
C:\Qt\6.9.3\mingw_64\bin\qt-cmake.bat .. -G "MinGW Makefiles"
cmake --build . --config Release
```

Or use the build script:
```powershell
cd qt-gui
.\scripts\build.ps1 -Preset default -Clean
```

## Related Files Modified

- `qt-gui/src/core/EngineClient.cpp` - Core engine client logic
- `qt-gui/src/ui/MainWindow.cpp` - UI event handling

## Verification Checklist

- [ ] Sidecar script found regardless of working directory
- [ ] No "path not set" errors in logs
- [ ] No "failed to write" errors in logs
- [ ] Engine starts and initializes successfully
- [ ] Step command works after initialization
- [ ] Reset command works properly
- [ ] Snapshot requests succeed

## Notes

- The constructor now uses `qDebug()`/`qWarning()` instead of `emit logMessage()` since signals shouldn't be emitted before the object is fully constructed
- Process writes now include `waitForBytesWritten()` to ensure the command reaches the sidecar
- All engine operations use `QMetaObject::invokeMethod()` for thread safety since the engine runs in a separate thread

## Future Improvements

1. Consider adding a "ready" message from sidecar before accepting commands
2. Implement retry logic for failed writes
3. Add configuration option to manually specify sidecar path
4. Create automated tests for initialization sequence
