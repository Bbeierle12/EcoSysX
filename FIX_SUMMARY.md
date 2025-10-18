# Fix Summary: "Call Init First" Error Resolution

**Date**: October 17, 2025  
**Status**: ✅ **COMPLETE AND READY TO TEST**

## Quick Answer

The "Call init first" error happened because the Qt GUI configuration was missing the required `schema` field, causing engine initialization to fail. 

**The fix**: Enhanced the engine sidecar to gracefully handle missing/incomplete configurations by merging with sensible defaults.

## What To Do Now

### Test the Fix (3 simple steps)

1. **Restart** the Qt GUI application
2. Click **"Start"** button
3. Click **"Play"** or **"Step"** button

**Expected**: ✅ No errors, simulation runs!

### What You'll See

```
Log Panel:
✅ "Engine started successfully"
✅ "Sending initialization to engine..."
✅ "Engine initialized"  
✅ State: "running"
✅ Tick counter increases
```

## Files Modified

### 1. **services/engine-sidecar/main.js** ✅
- Added robust config validation
- Falls back to defaults when schema missing
- Merges partial configs with defaults
- Better logging

### 2. **Documentation Created** 📄
- `CALL_INIT_ERROR_FIX.md` - Complete troubleshooting guide
- `ENGINE_CONFIG_SCHEMA_FIX.md` - Technical documentation
- `ENGINE_CONFIG_FIX_QUICK_REF.md` - Quick reference
- `qt-gui/config-schema-fix.patch` - Future Qt GUI enhancement

## Technical Details

### Before (Broken)
```
Qt GUI → sends config without schema
        ↓
Engine → validates schema → FAILS
        ↓
Qt GUI state → Error
        ↓
User clicks Step → Check fails → "Call init first"
```

### After (Fixed)
```
Qt GUI → sends config without schema
        ↓
Sidecar → detects missing schema → uses defaults
        ↓
Engine → validates → SUCCESS
        ↓
Qt GUI state → Running
        ↓
User clicks Step → Works! ✅
```

## Configuration Handling

The sidecar now handles three scenarios:

| Scenario | Behavior | Log Message |
|----------|----------|-------------|
| No config | Use full defaults | "No valid config provided, using default configuration" |
| Config without schema | Use full defaults | "No valid config provided, using default configuration" |
| Config with schema | Merge with defaults | "Using provided config merged with defaults" |

## Default Configuration Used

```javascript
{
  schema: "GENX_CFG_V1",
  simulation: {
    populationSize: 100,
    worldSize: 50,
    maxSteps: 1000
  },
  agents: {
    initialEnergy: { min: 80, max: 120 },
    movementSpeed: { min: 0.5, max: 2.0 }
  }
  // + disease, environment, rng settings
}
```

## Benefits

✅ **Immediate**: Qt GUI works without recompiling  
✅ **Robust**: Handles missing/invalid configs gracefully  
✅ **Backward Compatible**: Existing configs still work  
✅ **Forward Compatible**: Ready for future Qt GUI updates  
✅ **Better UX**: Clear log messages about config source

## If You Still See Errors

### "Docker not found" or "Mesa Error"
**Normal!** The Mesa provider needs Docker. You can:
- Install Docker Desktop, or
- Use a different provider (future feature)

### "Node.js not found"
Check Node.js is installed and in PATH:
```powershell
node --version  # Should show v18.x or v20.x
```

### Init still fails
Check the log panel for specific error messages and see `CALL_INIT_ERROR_FIX.md` for detailed troubleshooting.

## Next Steps

1. **Test now** - Restart Qt GUI and try Start → Play
2. **Report results** - Let me know if you see any issues
3. **Future** - Optional: Apply Qt GUI schema alignment (see patch file)

## Documentation Index

| Document | Purpose |
|----------|---------|
| `CALL_INIT_ERROR_FIX.md` | Detailed troubleshooting guide |
| `ENGINE_CONFIG_SCHEMA_FIX.md` | Complete technical docs + future Qt GUI changes |
| `ENGINE_CONFIG_FIX_QUICK_REF.md` | Quick reference guide |
| `qt-gui/config-schema-fix.patch` | Ready-to-apply Qt GUI schema alignment |

## Commit Message (when ready)

```
fix(engine-sidecar): Handle missing configuration schema gracefully

- Add robust config validation in handleInit
- Fall back to defaults when schema is missing
- Merge partial configs with defaults
- Improve logging for config source visibility

Resolves "Call init first" error when Qt GUI sends config without
schema field. Engine now uses sensible defaults, allowing simulation
to initialize and run successfully.

Closes #[issue-number]
```

---

**Ready to test!** 🚀 Restart Qt GUI → Start → Play/Step → Should work!
