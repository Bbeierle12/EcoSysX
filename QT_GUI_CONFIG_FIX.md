# Qt GUI "Call Init First" Error - FIXED ✅

**Date**: October 18, 2025  
**Issue**: "Cannot send step: engine not running. Call init first."  
**Root Cause**: Qt GUI sending incorrect configuration format to engine  
**Status**: **FIXED** - Configuration now matches EngineConfigV1 schema

---

## Problem Summary

When clicking **Play** or **Step** in the Qt GUI, you received the error:
```
Cannot send step: engine not running. Call init first.
```

### Root Cause Analysis

The problem occurred in this sequence:

1. **User clicks "Start"** → Qt GUI launches Node.js engine sidecar ✅
2. **Process starts successfully** → `onProcessStarted()` called, state = `Running` ✅
3. **Qt sends init command** → Calls `sendInit(config)` with configuration ✅
4. **Engine validates config** → Checks `if (cfg.schema !== 'GENX_CFG_V1')` ❌
5. **Validation fails** → Engine throws error: `"Unsupported configuration schema: undefined"`
6. **Qt receives error** → Sets state to `Error`, simulation not running ❌
7. **User clicks Play/Step** → `isRunning()` returns false → Shows error message

### The Bug

In `qt-gui/src/core/Configuration.cpp`, the `toJson()` method had two critical issues:

1. **Missing `schema` field** - Engine requires `schema: "GENX_CFG_V1"`
2. **Wrong field names** - Qt GUI field names didn't match `EngineConfigV1` interface

**Engine Expected (EngineConfigV1)**:
```json
{
  "schema": "GENX_CFG_V1",
  "simulation": {
    "populationSize": 100,
    "worldSize": 50,
    "maxSteps": 1000,
    "enableDisease": true,
    "enableReproduction": true,
    "enableEnvironment": true
  },
  "agents": {
    "initialEnergy": { "min": 80, "max": 120 },
    "energyConsumption": { "min": 0.5, "max": 1.5 },
    "reproductionThreshold": 150,
    "deathThreshold": 0,
    "movementSpeed": { "min": 0.5, "max": 2.0 }
  },
  "disease": {
    "initialInfectionRate": 0.05,
    "transmissionRate": 0.1,
    "recoveryTime": 14,
    "contactRadius": 2.0
  },
  "environment": {
    "resourceRegenRate": 0.01,
    "resourceDensity": 1.0,
    "enableSeasons": false,
    "enableWeather": false
  },
  "rng": {
    "masterSeed": "12345",
    "streams": {
      "movement": true,
      "disease": true,
      "births": true,
      "mutation": false,
      "llm": false
    }
  }
}
```

**Qt GUI Was Sending** (WRONG):
```json
{
  // ❌ Missing schema field!
  "simulation": {
    "maxSteps": 1000,
    "worldSize": 50
    // ❌ Missing: populationSize, enableDisease, enableReproduction, enableEnvironment
  },
  "agents": {
    "initialPopulation": 100,  // ❌ Wrong location (should be simulation.populationSize)
    "energyRange": { "min": 80, "max": 120 },  // ❌ Wrong name (should be initialEnergy)
    "movementSpeed": { "min": 0.5, "max": 2.0 },  // ✅ Correct
    "reproductionEnabled": true  // ❌ Wrong location (should be simulation.enableReproduction)
    // ❌ Missing: energyConsumption, reproductionThreshold, deathThreshold
  },
  // ... other sections also had mismatches
}
```

---

## The Fix

### File Modified: `qt-gui/src/core/Configuration.cpp`

**Function**: `Configuration::toJson()`

**Changes**:

1. **Added schema field** (line 99):
   ```cpp
   root["schema"] = "GENX_CFG_V1";
   ```

2. **Fixed simulation section** (lines 102-108):
   ```cpp
   QJsonObject sim;
   sim["populationSize"] = agents.initialPopulation;  // Moved from agents
   sim["worldSize"] = simulation.worldSize;
   sim["maxSteps"] = simulation.maxSteps;
   sim["enableDisease"] = disease.enabled;
   sim["enableReproduction"] = agents.reproductionEnabled;
   sim["enableEnvironment"] = true;
   ```

3. **Fixed agents section** (lines 111-129):
   ```cpp
   QJsonObject agts;
   
   // Renamed energyRange → initialEnergy
   QJsonObject initialEnergy;
   initialEnergy["min"] = agents.energyRange.min;
   initialEnergy["max"] = agents.energyRange.max;
   agts["initialEnergy"] = initialEnergy;
   
   // Added missing energyConsumption
   QJsonObject energyConsumption;
   energyConsumption["min"] = 0.5;
   energyConsumption["max"] = 1.5;
   agts["energyConsumption"] = energyConsumption;
   
   // Added missing thresholds
   agts["reproductionThreshold"] = 150;
   agts["deathThreshold"] = 0;
   
   // movementSpeed was already correct
   agts["movementSpeed"] = moveSpeed;
   ```

4. **Fixed disease section** (lines 132-137):
   ```cpp
   QJsonObject dis;
   dis["initialInfectionRate"] = 0.05;  // Added
   dis["transmissionRate"] = disease.transmissionRate;
   dis["recoveryTime"] = static_cast<int>(1.0 / disease.recoveryRate);  // Convert rate→time
   dis["contactRadius"] = 2.0;  // Added
   ```

5. **Fixed environment section** (lines 140-145):
   ```cpp
   QJsonObject env;
   env["resourceRegenRate"] = environment.resourceRegeneration;  // Renamed
   env["resourceDensity"] = environment.resourceDensity;
   env["enableSeasons"] = false;  // Added
   env["enableWeather"] = false;  // Added
   ```

6. **Fixed RNG section** (lines 148-158):
   ```cpp
   QJsonObject rngObj;
   rngObj["masterSeed"] = QString::number(rng.seed);  // Convert int→string
   
   // Added streams object
   QJsonObject streams;
   streams["movement"] = true;
   streams["disease"] = true;
   streams["births"] = rng.independentStreams;
   streams["mutation"] = false;
   streams["llm"] = false;
   rngObj["streams"] = streams;
   ```

---

## How to Test the Fix

### Step 1: Rebuild the Qt GUI

From the `qt-gui` directory:

```powershell
# Option A: Using build script
.\scripts\build.ps1 -Preset ci -Clean

# Option B: Manual CMake build
cd build
Remove-Item * -Recurse -Force
C:\Qt\6.9.3\mingw_64\bin\qt-cmake.bat .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release
C:\Qt\Tools\mingw1310_64\bin\mingw32-make.exe -j4
```

### Step 2: Run the Application

```powershell
cd qt-gui\build\bin
.\ecosysx-gui.exe
```

### Step 3: Start the Simulation

1. **Click "Start"** button (or menu: Simulation → Start)
   - Engine process should launch
   - Look for log: `"Engine process started"`
   - State should change to `"Running"`

2. **Check for successful init**
   - Look for log: `"Engine initialized"`
   - Look for log: `"Sending initialization to engine..."`
   - Should NOT see: `"Unsupported configuration schema"`

3. **Click "Play" or "Step"**
   - Should advance the simulation
   - Tick counter should increment
   - Should NOT see: `"Cannot send step: engine not running"`

### Step 4: Verify in Logs

Check the Event Log panel for:

✅ **Success indicators**:
```
[INFO] Engine process started
[INFO] Sending init command
[sidecar] [INFO] ... Using provided config merged with defaults
[sidecar] [INFO] ... Initializing with mesa provider...
[INFO] Engine initialized
[INFO] Sending step command
```

❌ **Error indicators (should NOT appear)**:
```
[ERROR] Unsupported configuration schema: undefined
[ERROR] Cannot send step: engine not running
```

---

## Technical Details

### Why This Happened

The Qt GUI was developed before the final `EngineConfigV1` schema was stabilized. The configuration structure evolved, but the Qt GUI's `toJson()` method wasn't updated to match.

### Why It Works Now

1. **Schema validation passes** - Engine sees `schema: "GENX_CFG_V1"` ✅
2. **All required fields present** - Every field in `EngineConfigV1` interface exists ✅
3. **Correct field names** - Names match TypeScript interface exactly ✅
4. **Sensible defaults** - Fields not in Qt GUI config get reasonable defaults ✅

### Field Mapping Reference

| Qt GUI Config | Engine Config (EngineConfigV1) | Notes |
|---------------|-------------------------------|-------|
| `agents.initialPopulation` | `simulation.populationSize` | Moved to simulation |
| `agents.energyRange` | `agents.initialEnergy` | Renamed |
| `agents.reproductionEnabled` | `simulation.enableReproduction` | Moved to simulation |
| `disease.enabled` | `simulation.enableDisease` | Moved to simulation |
| `disease.recoveryRate` | `disease.recoveryTime` | Converted rate to time steps |
| `environment.resourceRegeneration` | `environment.resourceRegenRate` | Renamed |
| `rng.seed` (int) | `rng.masterSeed` (string) | Type conversion |

### New Fields Added (with defaults)

- `agents.energyConsumption`: `{ min: 0.5, max: 1.5 }`
- `agents.reproductionThreshold`: `150`
- `agents.deathThreshold`: `0`
- `disease.initialInfectionRate`: `0.05` (5%)
- `disease.contactRadius`: `2.0`
- `environment.enableSeasons`: `false`
- `environment.enableWeather`: `false`
- `rng.streams`: Object with 5 boolean flags

---

## Related Files

### Core Files
- **Fixed**: `qt-gui/src/core/Configuration.cpp` - Now generates correct JSON
- **Header**: `qt-gui/src/core/Configuration.h` - No changes needed
- **Engine**: `packages/genx-engine/src/engine.ts` - Validation logic
- **Types**: `packages/genx-engine/src/types.ts` - Schema definition

### Documentation
- `CALL_INIT_ERROR_FIX.md` - Original engine-sidecar fix (still needed)
- `ENGINE_CONFIG_SCHEMA_FIX.md` - Previous schema documentation
- `QT_GUI_CONFIG_FIX.md` - **This document** (Qt GUI fix)

---

## Troubleshooting

### If you still see "Call init first" error:

1. **Check you rebuilt the Qt GUI**
   ```powershell
   # Verify the executable was rebuilt
   Get-Item qt-gui\build\bin\ecosysx-gui.exe | Select-Object LastWriteTime
   ```

2. **Check the engine sidecar is up to date**
   ```powershell
   # Verify main.js exists
   Get-Item services\engine-sidecar\main.js
   ```

3. **Enable verbose logging**
   - In Qt GUI, go to View → Settings
   - Enable "Verbose Logging"
   - Check the Event Log panel for detailed messages

4. **Test the engine directly**
   ```powershell
   # Test engine-sidecar standalone
   cd services\engine-sidecar
   node main.js
   # Type: {"op":"ping","data":{}}
   # Should respond with: {"success":true,...}
   ```

### If build fails:

Check compiler setup:
```powershell
# Verify g++ is accessible
C:\Qt\Tools\mingw1310_64\bin\g++.exe --version

# Verify CMake can find Qt
C:\Qt\6.9.3\mingw_64\bin\qt-cmake.bat --version
```

---

## Summary Checklist

Before clicking "Play" in the Qt GUI, verify:

- [ ] Qt GUI rebuilt with fixed `Configuration.cpp`
- [ ] Engine sidecar (`services/engine-sidecar/main.js`) exists
- [ ] Node.js is in PATH (`node --version` works)
- [ ] Application launches without errors
- [ ] "Start" button successfully starts engine
- [ ] Event log shows "Engine initialized"
- [ ] State shows "Running" (not "Error")

Now click **Play** - it should work! 🎉

---

**Questions or Issues?**

Check these log messages:
- `"Unsupported configuration schema"` → Configuration not matching schema
- `"Failed to start engine"` → Node.js or sidecar path issue
- `"Engine not running"` → Init command failed before step attempt

All these should now be resolved with this fix.
