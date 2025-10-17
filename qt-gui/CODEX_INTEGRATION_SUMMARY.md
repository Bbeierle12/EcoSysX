# Integration Plan Summary for Codex

**Date**: October 17, 2025  
**Status**: Plan Created & Documented  
**Codex Task**: Qt GUI ↔ Engine Sidecar Integration

---

## 📋 Documents Created

### 1. **INTEGRATION_PLAN.md** (Main Plan)
**Purpose**: Comprehensive phased integration plan  
**Location**: `qt-gui/INTEGRATION_PLAN.md`

**Contains**:
- 5 Milestones (M1-M5) with detailed tasks
- Protocol alignment requirements
- Testing strategy (unit + integration)
- Performance targets
- Build & packaging steps
- UX polish requirements
- Documentation updates
- Acceptance criteria
- Priority-ordered task checklist (24 tasks)

**Key Sections**:
- M1: Protocol + I/O alignment (Active)
- M2: Tests revived and passing
- M3: UI polish + auto-snapshot loop
- M4: Performance validated (10k agents)
- M5: Packaging + docs ready

---

### 2. **PROTOCOL_QUICKREF.md** (Quick Reference)
**Purpose**: Fast lookup for JSON-RPC protocol  
**Location**: `qt-gui/PROTOCOL_QUICKREF.md`

**Contains**:
- Request/response format templates
- All 5 operations (ping, init, step, snapshot, stop)
- Code snippets for EngineClient.cpp changes
- Test stub implementation
- Common pitfalls and corrections
- Implementation checklist

**Use When**:
- Writing protocol-related code
- Debugging request/response issues
- Creating test cases
- Verifying message formats

---

### 3. **ENGINE_GUI_INTEGRATION_COMPLETE.md** (Status Report)
**Purpose**: Overall integration status  
**Location**: Root `ENGINE_GUI_INTEGRATION_COMPLETE.md`

**Contains**:
- What was accomplished (sidecar creation)
- Architecture overview
- Current status (bridge ready, provider pending)
- Next steps for full integration
- Troubleshooting guide

---

## 🎯 Current Focus (M1: Protocol Alignment)

### Priority Tasks for Codex

#### 1. EngineClient Protocol Updates
**File**: `qt-gui/src/core/EngineClient.cpp`

**Changes Needed**:
```cpp
// 1. Set SeparateChannels mode (line ~15)
m_process->setProcessChannelMode(QProcess::SeparateChannels);

// 2. Change "params" to "data" in all send methods
// OLD: message["params"] = configData;
// NEW: message["data"] = configData;

// 3. Update processLine() to parse new response format
QJsonObject response = doc.object();
bool success = response["success"].toBool();
if (!success) {
    emit errorOccurred(response["error"].toString());
    return;
}
QJsonObject data = response["data"].toObject();
int tick = data["tick"].toInt();
```

#### 2. Request Format Updates
**Locations**: sendInit(), sendStep(), requestSnapshot(), sendStop()

**Pattern**:
```cpp
QJsonObject message;
message["op"] = "operation_name";
message["data"] = QJsonObject{...};  // Not "params"!
sendMessage(message);
```

#### 3. Response Parsing
**Location**: processLine()

**Extract Pattern**:
```cpp
// Get data object first
QJsonObject data = response["data"].toObject();

// Then extract fields from data
int tick = data["tick"].toInt();
QJsonObject metrics = data["metrics"].toObject();
QJsonObject snapshot = data["snapshot"].toObject();
```

---

## 🧪 Testing Strategy

### Phase 1: Stub Testing
1. Create `test-engine-stub.mjs` (provided in PROTOCOL_QUICKREF.md)
2. Place in `qt-gui/tests/`
3. Make executable: `chmod +x test-engine-stub.mjs`
4. Update EngineClient to use stub for tests

### Phase 2: Unit Tests
1. Rewrite `tst_engineclient.cpp` for new API
2. Add parser tests for JSON handling
3. Create `tst_metricspanel.cpp`
4. Create `tst_visualizationwidget.cpp`

### Phase 3: Integration Tests
1. Restore `tst_engine_integration.cpp`
2. Use stub engine for CI/CD
3. Gate on Node.js availability

---

## 📊 Success Metrics

### Immediate (M1 Complete)
- [ ] All commands use `data` field ✅
- [ ] All responses parsed from `data` object ✅
- [ ] SeparateChannels mode enabled ✅
- [ ] Error handling robust ✅
- [ ] Auto-snapshot after step working ✅

### Short-term (M2 Complete)
- [ ] All unit tests passing
- [ ] Integration test with stub working
- [ ] No regressions in existing functionality

### Long-term (M5 Complete)
- [ ] 60 FPS @ 10k agents
- [ ] Windows packaging complete
- [ ] Full documentation updated
- [ ] End-to-end UX validated

---

## 🔧 Tools & Resources

### For Codex to Use

1. **Protocol Reference**: `PROTOCOL_QUICKREF.md`
   - Copy exact JSON formats
   - Use code snippets directly
   - Follow common pitfalls section

2. **Integration Plan**: `INTEGRATION_PLAN.md`
   - Check task checklist (Phase 1, items 1-6)
   - Review acceptance criteria
   - Update progress as you go

3. **Test Stub**: `PROTOCOL_QUICKREF.md` (bottom section)
   - Copy test-engine-stub.mjs implementation
   - Use for local testing
   - Adapt for integration tests

4. **Current Code**:
   - `qt-gui/src/core/EngineClient.cpp` (main target)
   - `qt-gui/src/core/EngineClient.h` (may need signal updates)
   - `services/engine-sidecar/main.js` (reference implementation)

---

## 🚨 Critical Requirements

### Must-Have for M1
1. ✅ **Use `data` field** - Not `params`
2. ✅ **Check `success` first** - Before accessing data
3. ✅ **SeparateChannels** - stdout=JSON, stderr=logs
4. ✅ **Robust parsing** - Handle errors gracefully
5. ✅ **Auto-snapshot** - Request after each step

### Must-Avoid
1. ❌ Don't use `params` field
2. ❌ Don't access response fields directly (use `data` object)
3. ❌ Don't mix stdout/stderr
4. ❌ Don't assume success without checking
5. ❌ Don't block UI thread

---

## 📝 Communication Protocol

### Codex Updates Format
When completing tasks, update with:

```markdown
## Task: [Task Name]
**Status**: ✅ Complete | 🟡 In Progress | ❌ Failed
**Files Changed**: 
- path/to/file.cpp (lines X-Y)
- path/to/file.h (lines A-B)

**Changes Made**:
- Changed X to Y
- Added Z functionality
- Fixed issue with W

**Testing**:
- [ ] Compiled successfully
- [ ] Unit tests pass
- [ ] Manual test result: [describe]

**Next Task**: [What's next]
```

### Progress Tracking
Update `INTEGRATION_PLAN.md`:
- Check off completed tasks [ ] → [x]
- Update milestone status (⬜ → 🟡 → ✅)
- Note any blockers or issues

---

## 🎯 Immediate Next Steps for Codex

### Step 1: Protocol Alignment (Today)
1. Open `qt-gui/src/core/EngineClient.cpp`
2. Change `setProcessChannelMode` to `SeparateChannels`
3. Find all `message["params"]` → change to `message["data"]`
4. Update `processLine()` to parse `success` + `data` object
5. Test compilation

### Step 2: Response Handling (Today)
1. Update signal emissions with correct data extraction
2. Add JSON parse error handling
3. Implement auto-snapshot after step
4. Test with manual JSON input

### Step 3: Testing (Tomorrow)
1. Create test-engine-stub.mjs from PROTOCOL_QUICKREF.md
2. Test manually: `node test-engine-stub.mjs`
3. Update EngineClient to use stub for testing
4. Verify init → step → snapshot → stop cycle

---

## 📚 Reference Documents

### Internal Docs (This Repo)
- `INTEGRATION_PLAN.md` - Main plan (this is your roadmap)
- `PROTOCOL_QUICKREF.md` - Protocol reference (use this constantly)
- `ENGINE_GUI_INTEGRATION_COMPLETE.md` - Status overview
- `services/engine-sidecar/README.md` - Sidecar API docs
- `qt-gui/PHASE_2_SUMMARY_FINAL.md` - Qt GUI architecture

### External Refs
- Qt JSON docs: https://doc.qt.io/qt-6/qjson.html
- QProcess docs: https://doc.qt.io/qt-6/qprocess.html
- Node.js readline: https://nodejs.org/api/readline.html

---

## 🎉 Summary

**What You Have**:
- ✅ Complete integration plan (5 milestones, 24 tasks)
- ✅ Protocol quick reference with code snippets
- ✅ Test stub implementation
- ✅ Working sidecar (Node.js)
- ✅ Working GUI (Qt)

**What Needs Doing** (Your Focus):
- 🟡 Protocol alignment (M1) - **Active Now**
- ⏳ Test suite updates (M2) - **Next**
- ⏳ Performance validation (M3-M4) - **Later**
- ⏳ Packaging & docs (M5) - **Final**

**Expected Timeline**:
- M1: This week (protocol alignment)
- M2: Next week (tests)
- M3-M4: Week 3-4 (performance)
- M5: Week 5 (packaging)

**Success Looks Like**:
- GUI launches and connects to sidecar ✅
- Commands flow both directions ✅
- Metrics update in real-time ✅
- Visualization shows agents ✅
- No UI freezes ✅
- All tests pass ✅

---

**Go forth and integrate! You have all the information you need.** 🚀

*Generated: October 17, 2025*  
*For: Codex Integration Work*  
*Status: Ready to Execute*
