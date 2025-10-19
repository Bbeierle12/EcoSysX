# Qt WebSockets Installation - Terminal Guide

## ✅ Qt Maintenance Tool Launched!

I've opened the Qt Maintenance Tool GUI for you. Follow these steps:

---

## 📋 Step-by-Step Instructions

### In the Maintenance Tool Window:

1. **Welcome Screen**
   - Click **"Add or remove components"**
   - Click **"Next"**

2. **Select Components**
   - Expand: **Qt** → **Qt 6.9.3** → **MinGW 64-bit**
   - Scroll down and find: **☐ Qt WebSockets**
   - **Check the box**: ☑️ **Qt WebSockets**
   - Click **"Next"**

3. **Review Changes**
   - Verify "Qt WebSockets" is listed to be installed
   - Click **"Update"** or **"Install"**

4. **Installation**
   - Wait for download and installation (~50-100 MB)
   - Should take 2-5 minutes depending on internet speed

5. **Completion**
   - Click **"Finish"**
   - Close the Maintenance Tool

---

## ⚡ After Installation - Run These Commands

Once the Maintenance Tool finishes, come back to the terminal and run:

```powershell
# 1. Verify Qt WebSockets was installed
Test-Path "C:\Qt\6.9.3\mingw_64\lib\cmake\Qt6WebSockets\Qt6WebSocketsConfig.cmake"
```

**Expected**: `True`

```powershell
# 2. Rebuild Qt GUI
cd qt-gui
cmake --build build --config Release --clean-first
```

**Expected**: Build succeeds with no errors

```powershell
# 3. Launch Qt GUI
./launch.ps1
```

**Expected**: Window opens with "[WebSocket Mode]" in title

---

## 🎯 What To Do Right Now

1. **Look for the Qt Maintenance Tool window** (should be open)
2. **Follow the steps above** to add Qt WebSockets
3. **Come back here** when installation is done
4. **Run the verification commands** above

---

## 🔍 Can't Find the Maintenance Tool Window?

If the window didn't open, run this again:

```powershell
Start-Process "C:\Qt\MaintenanceTool.exe"
```

Or open it manually:
- Navigate to: `C:\Qt\`
- Double-click: `MaintenanceTool.exe`

---

## 🆘 Alternative: Command-Line Installation

If you prefer command-line, the Qt Maintenance Tool supports CLI mode:

```powershell
# List available components
C:\Qt\MaintenanceTool.exe --list-components

# Install WebSockets (replace with exact component name from list)
C:\Qt\MaintenanceTool.exe install qt.qt6.693.win64_mingw.websockets
```

**Note**: The exact component name may vary. Use `--list-components` to find it.

---

## 📊 Installation Progress Tracking

| Step | Status | Action |
|------|--------|--------|
| 1. Open Maintenance Tool | ✅ Done | Tool launched via terminal |
| 2. Select "Add/Remove Components" | ⏳ Waiting | Click in GUI |
| 3. Check Qt WebSockets | ⏳ Waiting | Find and check box |
| 4. Install Component | ⏳ Waiting | Click Update/Install |
| 5. Verify Installation | ⏳ Waiting | Run Test-Path command |
| 6. Rebuild Qt GUI | ⏳ Waiting | Run cmake build |
| 7. Launch & Test | ⏳ Waiting | Run launch.ps1 |

---

## ⏱️ Estimated Time

- **GUI selection**: 1 minute
- **Download**: 2-3 minutes (depending on connection)
- **Installation**: 1-2 minutes
- **Rebuild Qt GUI**: 2-5 minutes
- **Total**: ~10 minutes

---

## 🎉 Success Criteria

After everything is done:

```powershell
# This should return True
Test-Path "C:\Qt\6.9.3\mingw_64\lib\cmake\Qt6WebSockets\Qt6WebSocketsConfig.cmake"

# This should show Qt6WebSockets in the list
Get-ChildItem "C:\Qt\6.9.3\mingw_64\lib\cmake" | Where-Object {$_.Name -like "*WebSocket*"}

# Qt GUI should build without errors
cd qt-gui
cmake --build build --config Release

# Qt GUI should launch and connect
./launch.ps1
```

---

## 💡 What Happens Next

Once Qt WebSockets is installed and Qt GUI is rebuilt:

1. **Engine server is already running** ✅
   - HTTP: http://localhost:3001
   - WebSocket: ws://localhost:8765

2. **Qt GUI will connect automatically**
   - Window title: "EcoSysX - Qt GUI [WebSocket Mode]"
   - Status bar: "Connected to engine server"

3. **Click "Start" to test**
   - Agents should appear in visualization! 🎯
   - Metrics should update in real-time
   - Charts should display population data

---

## 📞 Let Me Know When Done!

After the Maintenance Tool completes the installation, let me know and I'll:
1. Verify the installation
2. Rebuild the Qt GUI
3. Test the visualization

---

**Current Status**: 
- ✅ Qt Maintenance Tool launched
- ⏳ Waiting for you to install Qt WebSockets component
- ✅ Engine server running (ready for connections)

**What to do now**: Follow the GUI steps above to install Qt WebSockets!
