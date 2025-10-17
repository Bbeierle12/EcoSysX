# Quick Start: Build Environment Installation

**Goal:** Install C++ compiler and Qt 6 to build the EcoSysX Qt GUI

**Status:** CMake already installed ✅ | Need: Compiler + Qt ⚠️

---

## ⭐ RECOMMENDED: Qt Online Installer (All-in-One)

This is the **easiest option** - installs both Qt and a compatible compiler in one go.

### Step 1: Download Qt Installer
Visit: https://www.qt.io/download-qt-installer

Or direct link: https://d13lb3tujbc8s0.cloudfront.net/onlineinstallers/qt-unified-windows-x64-online.exe

### Step 2: Run Installer
1. Run the downloaded `.exe`
2. Create Qt account (free) or log in
3. Accept open-source license

### Step 3: Select Components
When you reach "Select Components", choose:

```
Qt/
  └─ Qt 6.5.3 (or latest 6.x)
      ├─ ✅ MinGW 11.2.0 64-bit
      ├─ ✅ Qt Charts
      ├─ ✅ Sources (optional but recommended)
      └─ Additional Libraries
          └─ ✅ Qt Test

Developer and Designer Tools/
  ├─ ✅ MinGW 11.2.0 64-bit
  ├─ ✅ CMake 3.24.2 64-bit (optional, you have 4.1.2)
  └─ ✅ Ninja 1.11.1 (optional but useful)
```

**Installation Size:** ~6-8 GB  
**Installation Time:** 20-40 minutes (depends on internet speed)

### Step 4: Add Qt to PATH

After installation, add Qt's bin directory to your PATH:

```powershell
# Check your Qt installation path (usually C:\Qt\6.5.3\mingw_64)
$QtPath = "C:\Qt\6.5.3\mingw_64\bin"

# Add to PATH for current session
$env:PATH += ";$QtPath"

# Add permanently (run as Administrator or add via System Properties)
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$QtPath", "User")
```

### Step 5: Verify Installation

```powershell
# Check Qt
qmake --version
# Should show: QMake version 3.1, Using Qt version 6.5.3

# Check compiler
g++ --version
# Should show: g++ (MinGW...) 11.2.0

# Check CMake (already installed)
cmake --version
# Should show: cmake version 4.1.2
```

---

## 🚀 Build the Project

### Step 1: Navigate to Project
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
```

### Step 2: Configure with CMake
```powershell
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -G "MinGW Makefiles"
```

**Expected output:**
```
-- The CXX compiler identification is GNU 11.2.0
-- Qt version: 6.5.3
-- Configuring done
-- Generating done
-- Build files written to: C:/Users/Bbeie/Github/EcoSysX/EcoSysX/qt-gui/build
```

### Step 3: Build
```powershell
cmake --build build --config Release
```

**Expected output:**
```
[ 10%] Building CXX object src/CMakeFiles/ecosysx-gui.dir/main.cpp.obj
[ 20%] Building CXX object src/CMakeFiles/ecosysx-gui.dir/core/EngineClient.cpp.obj
...
[100%] Built target ecosysx-gui
```

**Build time:** 2-5 minutes

### Step 4: Run Tests
```powershell
cd build
ctest -C Release --output-on-failure
```

**Expected output:**
```
Test project C:/Users/Bbeie/Github/EcoSysX/EcoSysX/qt-gui/build
    Start  1: tst_engineclient
1/6 Test  #1: tst_engineclient ..................   Passed    2.45 sec
    Start  2: tst_configuration
2/6 Test  #2: tst_configuration .................   Passed    1.23 sec
    Start  3: tst_validation_utils
3/6 Test  #3: tst_validation_utils ..............   Passed    0.56 sec
    Start  4: tst_snapshotbuffer
4/6 Test  #4: tst_snapshotbuffer ................   Passed    1.89 sec
    Start  5: tst_mainwindow_integration
5/6 Test  #5: tst_mainwindow_integration ........   Passed    3.12 sec
    Start  6: tst_engine_integration
6/6 Test  #6: tst_engine_integration ............   Passed    4.67 sec

100% tests passed, 0 tests failed out of 6

Total Test time (real) =  14.02 sec
```

### Step 5: Run Application
```powershell
cd ..
.\build\bin\Release\ecosysx-gui.exe
```

**Expected:** Application window opens with full UI!

---

## 🔧 Alternative: Visual Studio + Qt (Windows)

If you prefer Visual Studio over MinGW:

### Option A: Install Visual Studio First
1. Download VS 2022 Community: https://visualstudio.microsoft.com/downloads/
2. Select workload: "Desktop development with C++"
3. Install Qt separately (Qt Online Installer, select MSVC instead of MinGW)
4. Use CMake generator: `-G "Visual Studio 17 2022"`

### Option B: Use Qt with VS
1. Install Qt (as above) but select "MSVC 2022 64-bit" instead of MinGW
2. Install "Qt VS Tools" extension in Visual Studio
3. Open project in VS or use CMake

---

## 📝 Troubleshooting

### CMake can't find Qt
```powershell
# Set Qt6_DIR explicitly
cmake -B build -S . -DQt6_DIR="C:/Qt/6.5.3/mingw_64/lib/cmake/Qt6"
```

### qmake not recognized
Add Qt bin to PATH (see Step 4 above).

### g++ not recognized
Add MinGW bin to PATH:
```powershell
$env:PATH += ";C:\Qt\Tools\mingw1120_64\bin"
```

### Tests fail: "Node.js not found"
Integration tests need Node.js:
```powershell
winget install OpenJS.NodeJS
# Or download from: https://nodejs.org/
```

### Build errors about "Qt6Charts not found"
Make sure you selected "Qt Charts" during Qt installation.
You can re-run the installer and add it.

---

## ✅ Success Checklist

After installation, verify:
- [ ] `qmake --version` works
- [ ] `g++ --version` works (or `cl` for MSVC)
- [ ] `cmake --version` shows 4.1.2
- [ ] CMake configuration succeeds
- [ ] Project builds without errors
- [ ] Tests pass (at least 76 unit tests)
- [ ] Application launches and shows UI

---

## 🎯 Quick Command Reference

```powershell
# Configure
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -G "MinGW Makefiles"

# Build
cmake --build build --config Release

# Test
cd build && ctest -C Release --output-on-failure

# Run
.\build\bin\Release\ecosysx-gui.exe

# Clean build
Remove-Item -Recurse -Force build
cmake -B build -S . -DCMAKE_BUILD_TYPE=Release -G "MinGW Makefiles"
cmake --build build --config Release
```

---

## 📞 Need Help?

### Common Issues
1. **Qt not found:** Set `Qt6_DIR` environment variable
2. **Compiler not found:** Add to PATH
3. **Charts module missing:** Re-run Qt installer, add Qt Charts
4. **Tests fail:** Check Node.js installed for integration tests

### Check Your Setup
```powershell
# Diagnostic script
Write-Host "=== Build Environment Check ==="
Write-Host "CMake: $(cmake --version 2>&1 | Select-Object -First 1)"
Write-Host "Qt: $(qmake --version 2>&1 | Select-Object -First 1)"
Write-Host "Compiler: $(g++ --version 2>&1 | Select-Object -First 1)"
Write-Host "Node: $(node --version 2>&1)"
```

---

**Estimated Total Time:** 30-60 minutes (mostly download/install time)

**Next:** Once installed, see `PRIORITY_TASKS_COMPLETE.md` for next steps!
