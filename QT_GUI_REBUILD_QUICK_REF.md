# Qt GUI Rebuild Quick Reference

## The Problem You Had
**Error**: "Cannot send step: engine not running. Call init first."  
**Cause**: Qt GUI wasn't sending `schema: "GENX_CFG_V1"` field in configuration  
**Status**: **FIXED** in `qt-gui/src/core/Configuration.cpp`

## What Was Changed
✅ Added `schema: "GENX_CFG_V1"` field  
✅ Fixed field names to match `EngineConfigV1` interface  
✅ Added missing required fields with sensible defaults

## How to Rebuild

### Quick Method (Recommended)
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
.\scripts\build.ps1 -Preset ci -Clean
```

### Manual Method
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build

# Clean
Remove-Item * -Recurse -Force

# Configure
C:\Qt\6.9.3\mingw_64\bin\qt-cmake.bat .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=C:/Qt/Tools/mingw1310_64/bin/mingw32-make.exe

# Build
C:\Qt\Tools\mingw1310_64\bin\mingw32-make.exe -j4
```

### Alternative: Use Qt Creator
1. Open `qt-gui/CMakeLists.txt` in Qt Creator
2. Configure with Desktop Qt 6.9.3 MinGW 64-bit kit
3. Build → Build Project "ecosysx-gui"

## How to Test

1. **Run the application**:
   ```powershell
   cd qt-gui\build\bin
   .\ecosysx-gui.exe
   ```

2. **Click "Start"** → Should see "Engine initialized" in logs

3. **Click "Play"** or **"Step"** → Should work without error!

## Expected Behavior

### Before Fix ❌
```
1. Click "Start" → Engine starts
2. Engine receives config without schema → Validation fails
3. Engine returns error → Qt state = Error
4. Click "Play" → Error: "Cannot send step: engine not running"
```

### After Fix ✅
```
1. Click "Start" → Engine starts
2. Engine receives config with schema → Validation passes
3. Engine initializes → Qt state = Running
4. Click "Play" → Simulation advances!
```

## Troubleshooting

### Build Fails
**Problem**: CMake can't find compiler  
**Solution**: Use Qt Creator or check CMake cache:
```powershell
# Clear CMake cache
cd qt-gui\build
Remove-Item CMakeCache.txt, CMakeFiles -Recurse -Force
```

### "Engine not running" still appears
**Problem**: Didn't rebuild after fix  
**Solution**: Check executable timestamp:
```powershell
Get-Item qt-gui\build\bin\ecosysx-gui.exe | Select-Object LastWriteTime
```
Should show today's date after rebuilding.

### Node.js not found
**Problem**: Engine can't start  
**Solution**: Verify Node.js in PATH:
```powershell
node --version  # Should show v20.x or later
```

## Files Changed

**Modified**:
- `qt-gui/src/core/Configuration.cpp` - Fixed `toJson()` method

**Created**:
- `QT_GUI_CONFIG_FIX.md` - Full documentation
- `QT_GUI_REBUILD_QUICK_REF.md` - This file

**No changes needed**:
- `services/engine-sidecar/main.js` - Already has fallback for missing schema
- `packages/genx-engine/src/engine.ts` - Validation logic unchanged

## Next Steps

1. Rebuild Qt GUI (see commands above)
2. Run application
3. Click "Start" then "Play"
4. Enjoy working simulation! 🎉

---

**Still having issues?** See `QT_GUI_CONFIG_FIX.md` for detailed troubleshooting.
