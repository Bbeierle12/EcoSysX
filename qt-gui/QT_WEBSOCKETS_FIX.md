# Qt WebSockets Module Missing - Fix Guide

## ✅ Status Update

### Engine Server
**STATUS**: ✅ **RUNNING**
```
HTTP API: http://localhost:3001
WebSocket: ws://localhost:8765
```

The Genesis Engine server is running successfully in the background!

### Qt GUI Build
**STATUS**: ❌ **FAILED** - Missing Qt6WebSockets component

---

## 🔴 Problem

CMake error during Qt GUI build:
```
CMake Error: Failed to find required Qt component "WebSockets"
Expected Config file at "C:/Qt/6.9.3/mingw_64/lib/cmake/Qt6WebSockets/Qt6WebSocketsConfig.cmake" does NOT exist
```

The Qt6WebSockets module is not installed in your Qt installation.

---

## 🔧 Solution Options

### Option 1: Install Qt6WebSockets via Qt Maintenance Tool (RECOMMENDED)

1. **Open Qt Maintenance Tool**:
   ```powershell
   # Usually located at:
   C:\Qt\MaintenanceTool.exe
   ```

2. **Select "Add or remove components"**

3. **Navigate to Qt 6.9.3 → MinGW 64-bit**

4. **Check the following components**:
   - ✅ Qt WebSockets
   - ✅ Qt Network (should already be installed)

5. **Click "Next" and install**

6. **After installation, retry the build**:
   ```powershell
   cd qt-gui
   cmake --build build --config Release --clean-first
   ```

---

### Option 2: Use Online Installer to Add Component

If Maintenance Tool doesn't work:

1. **Download Qt Online Installer**:
   - Visit: https://www.qt.io/download-qt-installer
   - Download for Windows

2. **Run installer and select "Add or remove components"**

3. **Select Qt 6.9.3 → MinGW 64-bit → WebSockets**

4. **Install and rebuild**

---

### Option 3: Reinstall Qt with All Components

If you need a fresh installation:

1. **Uninstall current Qt** (optional - can keep and add components)

2. **Download Qt Online Installer**

3. **During installation, select**:
   - Qt 6.9.3
   - MinGW 64-bit compiler
   - **Additional Libraries**:
     - ✅ Qt WebSockets
     - ✅ Qt Network
     - ✅ Qt Charts
     - ✅ Qt Test
     - ✅ Qt Widgets (Core, GUI)

4. **Complete installation**

5. **Set Qt path** (if needed):
   ```powershell
   $env:CMAKE_PREFIX_PATH = "C:\Qt\6.9.3\mingw_64"
   ```

6. **Rebuild**:
   ```powershell
   cd qt-gui
   cmake -B build -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release
   cmake --build build --config Release
   ```

---

### Option 4: Temporary Workaround - Comment Out WebSockets (NOT RECOMMENDED)

**⚠️ WARNING**: This will disable the visualization fix and make the GUI non-functional!

Only use this if you need to test the build system:

1. Edit `qt-gui/CMakeLists.txt` and comment out WebSockets:
   ```cmake
   find_package(Qt6 REQUIRED COMPONENTS 
       Core
       Widgets
       Network
       Gui
       Charts
       # WebSockets  # ← Commented out
       Test
   )
   ```

2. Edit `qt-gui/src/CMakeLists.txt` and remove WebSockets link:
   ```cmake
   target_link_libraries(EcoSysX PRIVATE
       Qt6::Core
       Qt6::Widgets
       Qt6::Network
       Qt6::Gui
       Qt6::Charts
       # Qt6::WebSockets  # ← Commented out
       Qt6::Test
   )
   ```

3. Comment out EngineInterface in `MainWindow.h`:
   ```cpp
   // #include "../core/EngineInterface.h"  // ← Commented out
   ```

**NOTE**: With this workaround, visualization will NOT work! This defeats the entire purpose of the fix.

---

## 🎯 Recommended Path

**RECOMMENDED**: Use **Option 1** (Qt Maintenance Tool) - fastest and cleanest.

### Step-by-Step:

1. **Close VS Code** (optional, to avoid file locks)

2. **Run Qt Maintenance Tool**:
   ```powershell
   Start-Process "C:\Qt\MaintenanceTool.exe"
   ```

3. **Add Qt WebSockets component** (see Option 1 instructions above)

4. **Reopen VS Code and rebuild**:
   ```powershell
   cd qt-gui
   cmake --build build --config Release --clean-first
   ```

5. **If build succeeds, launch Qt GUI**:
   ```powershell
   ./launch.ps1
   ```

---

## ✅ Verification

After installing Qt WebSockets, verify it's present:

```powershell
# Check if WebSockets config exists
Test-Path "C:\Qt\6.9.3\mingw_64\lib\cmake\Qt6WebSockets\Qt6WebSocketsConfig.cmake"
```

Should return: `True`

If `False`, the component is not installed correctly.

---

## 🧪 Test After Fix

Once Qt WebSockets is installed and Qt GUI builds successfully:

1. **Engine server is already running** ✅

2. **Launch Qt GUI**:
   ```powershell
   cd qt-gui
   ./launch.ps1
   ```

3. **Verify**:
   - Window title: "EcoSysX - Qt GUI [WebSocket Mode]"
   - Status bar: "Connected to engine server"
   - Log panel: "✅ Connected to Genesis Engine via WebSocket"

4. **Click "Start"**

5. **Agents should appear in visualization!** 🎯

---

## 📋 Quick Command Summary

```powershell
# 1. Install Qt WebSockets via Maintenance Tool
Start-Process "C:\Qt\MaintenanceTool.exe"

# 2. After installation, rebuild Qt GUI
cd qt-gui
cmake --build build --config Release --clean-first

# 3. Engine server is already running at:
#    - HTTP: http://localhost:3001
#    - WebSocket: ws://localhost:8765

# 4. Launch Qt GUI
./launch.ps1

# 5. Test visualization - agents should appear!
```

---

## 🆘 Still Having Issues?

### Check Qt Installation
```powershell
# List installed Qt components
Get-ChildItem "C:\Qt\6.9.3\mingw_64\lib\cmake\Qt6*" | Select-Object Name
```

Should include:
- Qt6WebSockets
- Qt6Network
- Qt6Widgets
- Qt6Core
- Qt6Charts

### Check CMake Can Find Qt
```powershell
cd qt-gui
cmake -B build -G "MinGW Makefiles" --debug-find-pkg=Qt6WebSockets
```

This will show detailed information about where CMake is looking for Qt6WebSockets.

### Alternative: Use Different Qt Installation Path

If you have multiple Qt installations:
```powershell
# Set specific Qt path
$env:CMAKE_PREFIX_PATH = "C:\Qt\6.9.3\mingw_64"

# Clean and rebuild
cd qt-gui
Remove-Item -Recurse -Force build
cmake -B build -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

---

## 📚 Related Documentation

- [WEBSOCKET_INTEGRATION_COMPLETE.md](WEBSOCKET_INTEGRATION_COMPLETE.md) - Full integration guide
- [VISUALIZATION_FIX_COMPLETE.md](VISUALIZATION_FIX_COMPLETE.md) - Technical details
- [QUICK_TEST.md](../QUICK_TEST.md) - Testing guide (once build works)
- [INSTALL_BUILD_ENVIRONMENT.md](INSTALL_BUILD_ENVIRONMENT.md) - Full Qt setup guide

---

## 🎓 What Qt WebSockets Is Used For

In EcoSysX:
- **Real-time communication** between Qt GUI and Genesis Engine server
- **Bidirectional data flow**: Commands from GUI → Engine, State updates from Engine → GUI
- **Snapshot streaming**: Agent positions, metrics, and state data
- **Connection management**: Auto-reconnect, error handling
- **Replaces old stdio-based communication** with modern WebSocket protocol

Without Qt6WebSockets, the Qt GUI cannot connect to the engine server and **visualization will not work**.

---

**Current Status**: 
- ✅ Engine server running
- ❌ Qt GUI build blocked by missing Qt6WebSockets
- 🔧 Solution: Install Qt6WebSockets via Maintenance Tool

**Next Step**: Install Qt6WebSockets component and rebuild!
