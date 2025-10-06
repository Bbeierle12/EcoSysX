# EcoSysX Qt GUI - Quick Reference

## 🚀 Quick Commands

### Build
```powershell
# Windows
cd qt-gui
.\scripts\build.ps1                    # Debug build
.\scripts\build.ps1 -BuildType Release # Release build
.\scripts\build.ps1 -Clean             # Clean build

# Linux/macOS
cd qt-gui
./scripts/build.sh                     # Debug build
./scripts/build.sh Release             # Release build
./scripts/build.sh Debug clean         # Clean build
```

### Run
```powershell
# Windows
.\build\bin\Debug\ecosysx-gui.exe
.\build\bin\Release\ecosysx-gui.exe

# Linux/macOS
./build/bin/ecosysx-gui
```

### Test
```powershell
cd build
ctest --output-on-failure
ctest -R test_name --verbose
```

---

## 📂 File Locations

| What | Where |
|------|-------|
| Application entry | `src/main.cpp` |
| Core logic | `src/core/` |
| UI components | `src/ui/panels/`, `src/ui/widgets/` |
| Utilities | `src/utils/` |
| Tests | `tests/unit/`, `tests/integration/` |
| Test data | `tests/fixtures/` |
| Documentation | `docs/` |
| Build scripts | `scripts/` |
| Resources | `resources/` |

---

## 📝 Key Documents

| Document | Purpose |
|----------|---------|
| **START_HERE.md** | Visual overview and next steps |
| **README.md** | Complete 24-section development outline |
| **DEVELOPMENT_SETUP.md** | Environment setup for all platforms |
| **CODING_STANDARDS.md** | C++/Qt coding guidelines |
| **PROJECT_STRUCTURE.md** | Directory organization |
| **PHASE_1_CHECKLIST.md** | Detailed Phase 1 tasks |
| **docs/GETTING_STARTED.md** | Quick start guide |
| **docs/architecture/overview.md** | System architecture |

---

## 🔧 Development Workflow

### 1. Make Changes
Edit files in `src/`, `src/core/`, `src/ui/`, etc.

### 2. Build
```powershell
.\scripts\build.ps1
```

### 3. Test
```powershell
cd build
ctest
```

### 4. Run
```powershell
.\build\bin\Debug\ecosysx-gui.exe
```

### 5. Debug (if needed)
Open Qt Creator or Visual Studio, set breakpoints, run with debugger.

---

## 🏗️ Project Architecture (Quick View)

```
┌─────────────────────────────────────┐
│         Qt GUI Application          │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ Config   │  │ Metrics │ World  │ │
│  │ Panel    │  │ Panel   │ View   │ │
│  └──────────┘  └──────────────────┘ │
│  ┌───────────────────────────────┐  │
│  │     Engine Client (Worker)    │  │
│  └───────────────────────────────┘  │
└─────────────┬───────────────────────┘
              │ JSON-RPC (stdio/socket)
┌─────────────▼───────────────────────┐
│      Node.js Sidecar Process        │
│  ┌─────────────────────────────┐   │
│  │     GenesisEngine            │   │
│  │  (Agents, Mesa, Mason)       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 📊 Current Implementation Status

| Component | Status | Sprint |
|-----------|--------|--------|
| Main Window | ✅ Stub | Phase 1 |
| Engine Client | ⏳ Planned | Sprint 1 |
| Config Panel | ⏳ Planned | Sprint 1 |
| Event Log | ⏳ Planned | Sprint 1 |
| Snapshot Buffer | ⏳ Planned | Sprint 2 |
| Metrics Panel | ⏳ Planned | Sprint 2 |
| World View | ⏳ Planned | Sprint 3 |
| Packaging | ⏳ Planned | Sprint 4 |

---

## 🎯 Phase 1 Checklist (Abbreviated)

- [x] Create documentation
- [x] Set up build system
- [x] Create directory structure
- [x] Implement application stub
- [x] Create build scripts
- [ ] **Verify build works** ← YOU ARE HERE
- [ ] Add test framework
- [ ] Create first test

---

## 🐛 Common Issues & Solutions

### CMake can't find Qt6
```powershell
$env:Qt6_DIR = "C:\Qt\6.5.0\msvc2019_64"
```

### Missing DLLs at runtime
```powershell
# Add Qt to PATH
$env:Path += ";C:\Qt\6.5.0\msvc2019_64\bin"
```

### Build errors about MOC
Clean build and try again:
```powershell
.\scripts\build.ps1 -Clean
```

### Compiler not found
Install Visual Studio with C++ workload or MinGW.

---

## 🎓 Coding Conventions (Quick)

### Naming
- Classes: `PascalCase`
- Functions: `camelCase()`
- Variables: `camelCase`
- Members: `m_camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Style
- Indentation: 4 spaces
- Braces: K&R style (opening on same line)
- Line length: 100 characters max

### Example
```cpp
class MyClass {
public:
    void doSomething();
    
private:
    int m_memberVariable;
    static const int MAX_VALUE = 100;
};
```

---

## 🔗 External Resources

- [Qt 6 Documentation](https://doc.qt.io/qt-6/)
- [CMake Documentation](https://cmake.org/documentation/)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)

---

## 📞 Need More Help?

1. **Environment Setup**: Read `DEVELOPMENT_SETUP.md`
2. **Code Style**: Check `CODING_STANDARDS.md`
3. **Project Layout**: See `PROJECT_STRUCTURE.md`
4. **Architecture**: Review `docs/architecture/overview.md`
5. **Getting Started**: Try `docs/GETTING_STARTED.md`

---

## ✨ Next Steps

1. **Now**: Run `.\scripts\build.ps1`
2. **Then**: Run the application
3. **Next**: Review Sprint 1 tasks in `README.md` (Section 20)
4. **Future**: Implement EngineClient, Config Panel, Event Log

---

**Quick Start**: `cd qt-gui; .\scripts\build.ps1; .\build\bin\Debug\ecosysx-gui.exe`

**Phase 1 Status**: 🟢 85% Complete

**Happy Coding! 🚀**
