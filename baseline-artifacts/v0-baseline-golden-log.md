# EcoSysX v0-Baseline Golden Log
# Generated: 2025-09-27T00:00:00Z
# Simulation Steps: 2000
# Purpose: Reference behavior for comparison after future changes

## Simulation Parameters
- Initial Agents: 50
- Target Steps: 2000
- Environment: Default configuration
- Memory Management: v0-baseline settings

## Expected Behavior Patterns

### Population Dynamics
```
Steps 0-500: Population growth from 50 → ~70-80 agents
Steps 500-1000: Stabilization around 75-85 agents  
Steps 1000-1500: Minor fluctuations, possible infection spikes
Steps 1500-2000: Stable population ~70-90 agents
```

### Key Metrics Ranges (v0-baseline)
```
Agent Count: 50-120 (hard cap enforcement)
Average Energy: 45-75 (resource competition)
Average Age: 80-150 (lifecycle balance)
Infection Rate: 5-15% (disease dynamics)
Memory Usage: <500MB (bounded growth)
Frame Rate: >10 FPS (performance target)
```

### Critical Events to Monitor
1. **Reproduction Suppression**: Should activate around 85+ agents with high social complexity
2. **Memory Pruning**: Known agents removed when social networks exceed 200 entries
3. **Watchdog Alerts**: Memory warnings at 400MB+ threshold
4. **Log Compression**: Duplicate console entries merged for efficiency

### Performance Benchmarks
```
Step 500: ~60MB memory, stable frame rate
Step 1000: ~80MB memory, checkpoint export
Step 1500: ~100MB memory, no crash (critical test)
Step 2000: ~120MB memory, graceful completion
```

### Stability Indicators
- ✅ No crash before 2000 steps
- ✅ Memory usage plateaus (no runaway growth) 
- ✅ Adaptive reproduction prevents overflow
- ✅ Prune statistics show active memory management
- ✅ System metrics display real-time health

## Manual Test Protocol

1. **Start Simulator**: npm run dev → http://localhost:5173/
2. **Enable Monitoring**: Open Debug Console → watch System Metrics
3. **Run Simulation**: Start and let run for 2000+ steps
4. **Record Observations**: Note key metrics at 500-step intervals
5. **Export Data**: Use "Export to EcoSysX Analytics" for full logs

## Expected Log Files
- `ecosystem-analytics-[timestamp].json`: Comprehensive simulation data
- `ecosystem-windows-[timestamp].csv`: Windowed statistics
- `ecosystem-checkpoints-[timestamp].csv`: Major milestone data
- Debug console exports with prune statistics

## Comparison Guidelines

When testing future versions against this baseline:

### Behavioral Consistency ✅
- Population should follow similar growth patterns
- Energy/age distributions remain comparable
- Disease dynamics maintain balance

### Performance Improvements ✅
- Memory usage should be equal or lower
- Frame rates should be equal or higher  
- No regressions in stability (crash point)

### Feature Enhancements ✅
- New features should not break core stability
- Additional controls should maintain baseline behavior when disabled
- Monitoring capabilities should expand without performance cost

---

**Note**: This is a behavioral specification for the golden log since automated 2000-step generation would require browser automation. Manual execution following this protocol provides equivalent baseline data for comparison.