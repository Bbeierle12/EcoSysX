# Quick Verification Guide

## How to Verify the Engine Initialization Fixes

### Prerequisites
- Node.js installed and in PATH
- Engine sidecar service available at `services/engine-sidecar/main.js`

### Step 1: Launch the Application
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin
.\ecosysx-gui.exe
```

### Step 2: Check Initial Logs
Look in the **Event Log Panel** (bottom of window) for:
```
[INFO] Application started
```

### Step 3: Click "Start" Button
After clicking the Start button (▶️), verify these log messages appear in order:

#### Expected Success Sequence:
```
[INFO ] Starting engine: node C:/Users/.../services/engine-sidecar/main.js
[INFO ] Engine process started
[INFO ] Engine started successfully
[INFO ] Sending initialization to engine...
[INFO ] Engine initialized
```

#### What You Should NOT See (These Were the Bugs):
```
❌ [ERROR] Engine error: Sidecar script path not set
❌ [ERROR] Engine error: Failed to write complete message to engine
```

### Step 4: Test Basic Operations

#### Test Step Command
1. Click "Step" button (⏩)
2. Verify log shows:
   ```
   [INFO] Step X complete
   ```

#### Test Reset Command
1. Click "Reset" button (↻)
2. Verify same initialization sequence as Step 3

#### Test Stop Command
1. Click "Stop" button (⏹️)
2. Verify log shows:
   ```
   [INFO] Stopping engine...
   [INFO] Engine stopped
   ```

### Success Criteria

✅ **All checks passed** if:
- Sidecar script path found automatically
- No "path not set" errors
- No "failed to write" errors
- Engine starts and initializes successfully
- Commands (step, stop, reset) work without errors

### If You See Errors

#### "Sidecar script path not set"
This means the sidecar wasn't found. Manually set it:
1. Stop the application
2. Verify `services/engine-sidecar/main.js` exists
3. Check application working directory

#### "Failed to write complete message to engine"
This means initialization happened too fast. Check:
1. Verify you're running the NEW build (with fixes)
2. Check if Node.js is in PATH: `node --version`
3. Verify sidecar script has no syntax errors: `node services/engine-sidecar/main.js`

#### "Engine process started" but no "Engine initialized"
Check the sidecar's stderr output in the log panel for JavaScript errors.

### Debug Information

If issues persist, check these paths are being searched:
- `./ services/engine-sidecar/main.js`
- `../services/engine-sidecar/main.js`
- `../../services/engine-sidecar/main.js`
- `../../../services/engine-sidecar/main.js`
- `../../../../services/engine-sidecar/main.js`

The application will log all searched paths if the script isn't found.

### Performance Check

Monitor the **Metrics Panel** (right side) after starting:
- FPS should be displayed
- Agent count should update
- No constant error spam

## Quick Test Script

Run this in PowerShell to verify the build:

```powershell
# Verify executable exists
if (Test-Path "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe") {
    Write-Host "✅ Executable found" -ForegroundColor Green
} else {
    Write-Host "❌ Executable not found" -ForegroundColor Red
    exit 1
}

# Verify sidecar exists
if (Test-Path "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\services\engine-sidecar\main.js") {
    Write-Host "✅ Sidecar script found" -ForegroundColor Green
} else {
    Write-Host "❌ Sidecar script not found" -ForegroundColor Red
    exit 1
}

# Verify Node.js available
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js available: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 All prerequisites met! Ready to test." -ForegroundColor Cyan
Write-Host "Run: cd qt-gui\build\bin; .\ecosysx-gui.exe" -ForegroundColor Yellow
```

## Expected Debug Output (Console)

When the application starts, you might see debug output like:
```
Found sidecar script: C:/Users/Bbeie/Github/EcoSysX/EcoSysX/services/engine-sidecar/main.js
```

This is normal and indicates the fix is working correctly.

## Troubleshooting Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Sidecar script path not set" | Path detection failed | Verify sidecar file exists |
| "Failed to write complete message" | Process not ready | Rebuild with latest fixes |
| "Engine startup timeout" | Sidecar crashed/hung | Check Node.js and sidecar logs |
| Process starts but silent | Sidecar syntax error | Test sidecar independently |
| Immediate crash | Missing Qt DLLs | Re-run windeployqt |

---

**Last Updated**: October 17, 2025  
**Build Version**: 0.1.0  
**Fix Version**: ENGINE_INIT_FIX_v1
