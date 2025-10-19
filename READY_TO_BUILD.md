# Post-Installation Quick Commands

## ✅ Ready To Execute

Once Qt WebSockets download completes (you'll see "Finished" in Maintenance Tool):

---

## 🔍 Step 1: Verify Installation

```powershell
# Check if Qt6WebSockets was installed
Test-Path "C:\Qt\6.9.3\mingw_64\lib\cmake\Qt6WebSockets\Qt6WebSocketsConfig.cmake"
```

**Expected**: `True` ✅

```powershell
# Confirm it appears in cmake directory
Get-ChildItem "C:\Qt\6.9.3\mingw_64\lib\cmake" | Where-Object {$_.Name -like "*WebSocket*"}
```

**Expected**: Should show `Qt6WebSockets` folder

---

## 🔨 Step 2: Clean & Rebuild Qt GUI

```powershell
# Navigate and rebuild
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
cmake --build build --config Release --clean-first
```

**Expected**: 
- No CMake errors about missing Qt6WebSockets
- Successful compilation
- Output: `Build succeeded` or similar

**Time**: ~2-5 minutes

---

## 🚀 Step 3: Launch Qt GUI

```powershell
# Launch from qt-gui directory
./launch.ps1
```

**OR**

```powershell
# Run executable directly
./build/Release/EcoSysX.exe
```

**Expected Window**:
- Title: "EcoSysX - Qt GUI [WebSocket Mode]"
- Status bar: "Connected to engine server"
- Log panel: "✅ Connected to Genesis Engine via WebSocket"

---

## 🎯 Step 4: Test Visualization

1. **Click "Start" button** in toolbar
2. **Accept default configuration** (click OK)
3. **Watch the visualization widget**:
   - ✅ Grid should appear
   - ✅ **Colored circles (agents) should appear**
   - ✅ Agents should move during simulation
   - ✅ Metrics panel updates
   - ✅ Chart shows population graph

---

## 📊 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| Qt WebSockets | ⏳ Downloading | Maintenance Tool in progress |
| Engine Server | ✅ Running | Ports 3001 + 8765 active |
| Qt GUI Code | ✅ Ready | WebSocket integration complete |
| Build System | ⏳ Waiting | Will rebuild after download |
| Visualization | ⏳ Pending | Ready to test after build |

---

## 🆘 Quick Troubleshooting

### If Step 1 returns False:
- Close Maintenance Tool completely
- Re-open and verify Qt WebSockets is checked
- Try installation again

### If Step 2 fails with CMake errors:
```powershell
# Force reconfigure
cd qt-gui
Remove-Item -Recurse -Force build/CMakeCache.txt
cmake -B build -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

### If Step 3 shows "Disconnected":
- Verify engine server is running (should see it in terminal)
- Check ports: `netstat -ano | findstr "8765"`
- Restart server if needed: `npm run dev:engine`

### If Step 4 shows no agents:
- Check log panel for errors
- Verify simulation started (status bar should say "Running")
- Try clicking "Stop" then "Start" again

---

## ⏱️ Timeline

- **Download**: 2-5 minutes (in progress)
- **Verification**: 10 seconds
- **Build**: 2-5 minutes
- **Test**: 30 seconds
- **Total**: ~7-12 minutes from now

---

## 💡 What I'll Do Next

Once you say "Download finished":

1. ✅ Verify WebSockets installed correctly
2. ✅ Clean rebuild Qt GUI
3. ✅ Launch and test connection
4. ✅ Start simulation
5. ✅ Verify agents display

---

## 📝 Notes

- **Engine server is already running** ✅
- **All code changes are complete** ✅
- **Only missing piece**: Qt6WebSockets binary files
- **Once installed**: Everything should work!

---

**Let me know when the Maintenance Tool says "Finished" and I'll run through all the steps!** 🚀

---

**Current Time**: Waiting for Qt WebSockets download to complete...
**Next Action**: Verification and rebuild
