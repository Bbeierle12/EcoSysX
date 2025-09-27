# EcoSysX v0-Baseline Artifacts Package
**Version**: v0-baseline  
**Git Commit**: cfd3e8e  
**Date**: 2025-09-27  
**Status**: ✅ STABLE

## Package Contents

### 📋 Configuration & Schema
- `v0-baseline-schema.json` - Complete simulator configuration and parameters
- Key settings: memory caps, adaptive controls, performance thresholds

### 📊 Golden Reference Log
- `v0-baseline-golden-log.md` - Behavioral specification and test protocol
- Expected patterns for 2000-step simulation runs
- Performance benchmarks and stability indicators
- Manual test guidelines for comparison validation

### 🏷️ Version Control
- Git tag: `v0-baseline`
- Commit hash: `cfd3e8e` 
- Branch: `main`

### 📁 Source Code Snapshot
All baseline functionality included in tagged commit:
- `src/EcosystemSimulator.jsx` - Main simulator with all stabilizations
- `CRASH_ANALYSIS_SUMMARY.md` - Complete analysis and fixes documentation

## Retrieval Instructions

### Access Baseline Code
```bash
git checkout v0-baseline
# or
git show v0-baseline:src/EcosystemSimulator.jsx
```

### View Configuration
```bash
cat baseline-artifacts/v0-baseline-schema.json | jq .
```

### Run Baseline Test
```bash
npm run dev
# Follow manual test protocol in v0-baseline-golden-log.md
```

## Comparison Protocol

### For Future Versions
1. **Checkout baseline**: `git checkout v0-baseline`
2. **Run 2000-step test**: Follow golden log protocol
3. **Record metrics**: Population, performance, stability
4. **Switch to new version**: `git checkout [new-version]`
5. **Run identical test**: Same protocol, compare results
6. **Validate**: Ensure no behavioral regressions

### Key Success Criteria
- ✅ Population dynamics match expected ranges
- ✅ No crashes before 2000 steps (critical)
- ✅ Memory usage remains bounded
- ✅ Performance meets or exceeds baseline
- ✅ Core behaviors preserved

## Baseline Feature Set

### Stability Features ✅
- Differential mesh rendering
- Memory bounds with LRU pruning
- Environment update ordering fix
- Watchdog early warning system

### Adaptive Controls ✅  
- Complexity-based reproduction gating
- Runtime parameter adjustment
- Log compression and management
- Performance monitoring

### Debug Capabilities ✅
- Runtime debug panel
- System metrics display
- Prune statistics tracking
- Export functionality

## Archival Information
- **Purpose**: Stable reference point for EcoSysX development
- **Use Case**: Regression testing and behavioral validation
- **Maintenance**: Static baseline - do not modify
- **Next Steps**: Compare all future versions against this baseline

---
**✅ v0-Baseline Package Complete**  
All artifacts stored and ready for retrieval.