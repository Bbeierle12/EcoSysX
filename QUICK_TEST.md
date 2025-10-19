# 🚀 QUICK START - Test Visualization Fix

## The Fix
Updated Qt GUI to use **WebSocket** instead of stdio for engine communication.

---

## Test Now (3 Steps)

### 1️⃣ Rebuild Qt GUI
```powershell
cd qt-gui
cmake --build build --config Release --clean-first
```
⏱️ **Time**: ~1 minute

---

### 2️⃣ Start Engine Server
```powershell
npm run dev:engine
```
✅ **Wait for**: `WebSocket Server listening on ws://localhost:8765`

---

### 3️⃣ Launch Qt GUI
```powershell
cd qt-gui
./launch.ps1
```
✅ **Check**: Window title says `[WebSocket Mode]`

---

## Verify It Works

1. **Status bar** should show: `Connected to engine server`

2. Click **Start** button

3. **Agents should appear** in the visualization widget! 🎯

---

## If Agents Don't Appear

### Check 1: Is server running?
```powershell
netstat -ano | findstr "8765"
```
Should show: `TCP 0.0.0.0:8765 ... LISTENING`

### Check 2: Is GUI connected?
Look at log panel (bottom of window).
Should show: `✅ Connected to Genesis Engine via WebSocket`

### Check 3: Did simulation start?
Status bar should show: `Running (mesa) | Tick: 0`

---

## Full Documentation

- **Quick checklist**: `VISUALIZATION_FIX_CHECKLIST.md`
- **Complete guide**: `qt-gui/WEBSOCKET_INTEGRATION_COMPLETE.md`
- **Technical details**: `qt-gui/VISUALIZATION_FIX_COMPLETE.md`

---

## Expected Result

**Before fix**: Blank visualization widget ❌

**After fix**: 
- ✅ Grid visible
- ✅ Colored circles (agents) appear
- ✅ Agents move during simulation
- ✅ Metrics update in real-time

---

**Total time to test**: ~5 minutes

**Let me know if agents appear!** 🎉
