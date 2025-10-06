# EcoSysX Qt GUI - Development Environment Setup

## Prerequisites

### Required Software

#### 1. Qt 6 Framework
- **Version**: Qt 6.2 or later (Qt 6.5+ recommended)
- **Components needed**:
  - Qt Core
  - Qt Widgets
  - Qt Network
  - Qt GUI
  - Qt Creator (IDE - recommended but optional)

**Installation**:
- **Windows**: Download Qt Online Installer from https://www.qt.io/download-qt-installer
- **macOS**: `brew install qt@6` or use Qt Online Installer
- **Linux**: 
  ```bash
  # Ubuntu/Debian
  sudo apt-get install qt6-base-dev qt6-tools-dev
  
  # Fedora
  sudo dnf install qt6-qtbase-devel qt6-qttools-devel
  ```

#### 2. CMake
- **Version**: 3.16 or later (3.20+ recommended)
- **Installation**:
  - **Windows**: Download from https://cmake.org/download/ or `choco install cmake`
  - **macOS**: `brew install cmake`
  - **Linux**: `sudo apt-get install cmake` or `sudo dnf install cmake`

#### 3. C++ Compiler
- **Windows**: Visual Studio 2019 or later (Community Edition is fine)
  - Or MSVC Build Tools
  - Or MinGW-w64 (must match Qt build)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: GCC 7+ or Clang 6+
  ```bash
  sudo apt-get install build-essential  # Ubuntu/Debian
  sudo dnf install gcc-c++              # Fedora
  ```

#### 4. Node.js (for sidecar)
- **Version**: 18.x or later
- **Installation**:
  - **Windows**: Download from https://nodejs.org/ or `choco install nodejs`
  - **macOS**: `brew install node`
  - **Linux**: Use NodeSource repository or `nvm`

#### 5. Git
- **Version**: Latest stable
- For version control and repository management

### Optional Tools

#### Qt Creator
- Integrated IDE with Qt-specific features
- GUI form designer
- CMake integration
- Download from https://www.qt.io/download-open-source

#### Visual Studio Code
- Lightweight alternative
- Install extensions:
  - C/C++ (Microsoft)
  - CMake Tools (Microsoft)
  - Qt tools (tonka3000)

#### Development Tools
- **Valgrind** (Linux/macOS): Memory leak detection
- **Address Sanitizer**: Memory error detection (built into GCC/Clang)
- **Qt Designer**: Standalone UI designer (included with Qt)

## Initial Project Setup

### 1. Clone Repository
```bash
cd /path/to/projects
git clone <repository-url> EcoSysX
cd EcoSysX/qt-gui
```

### 2. Configure Qt Environment

#### Windows (PowerShell)
```powershell
# Add Qt to PATH (adjust version and path as needed)
$env:Path += ";C:\Qt\6.5.0\msvc2019_64\bin"
$env:Qt6_DIR = "C:\Qt\6.5.0\msvc2019_64"
```

#### macOS/Linux (Bash)
```bash
# Add Qt to PATH (adjust path as needed)
export Qt6_DIR=/usr/local/opt/qt@6  # macOS with Homebrew
# or
export Qt6_DIR=/usr/lib/x86_64-linux-gnu/cmake/Qt6  # Linux
```

### 3. Install Node.js Dependencies (Parent Project)
```bash
cd ..  # Back to EcoSysX root
npm install
```

### 4. Create Build Directory
```bash
cd qt-gui
mkdir build
cd build
```

### 5. Configure with CMake

#### Windows
```powershell
# Using Visual Studio
cmake .. -G "Visual Studio 17 2022" -A x64

# Using MinGW
cmake .. -G "MinGW Makefiles"
```

#### macOS/Linux
```bash
# Debug build
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Release build
cmake .. -DCMAKE_BUILD_TYPE=Release
```

### 6. Build the Project

#### Windows
```powershell
# Visual Studio
cmake --build . --config Debug

# MinGW
cmake --build .
```

#### macOS/Linux
```bash
cmake --build . -j$(nproc)  # Use all CPU cores
```

### 7. Run the Application
```bash
# From build directory
./bin/ecosysx-gui  # Linux/macOS
.\bin\Debug\ecosysx-gui.exe  # Windows Debug
.\bin\Release\ecosysx-gui.exe  # Windows Release
```

## Development Workflow

### Using Qt Creator

1. **Open Project**:
   - File → Open File or Project
   - Select `qt-gui/CMakeLists.txt`

2. **Configure Kit**:
   - Select appropriate Qt kit (Desktop Qt 6.x)
   - Choose build directory

3. **Build**:
   - Press `Ctrl+B` (Windows/Linux) or `Cmd+B` (macOS)

4. **Run**:
   - Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (macOS)

5. **Debug**:
   - Press `F5` to start debugging

### Using Visual Studio Code

1. **Open Folder**: `qt-gui/`

2. **Configure CMake**:
   - Press `Ctrl+Shift+P`
   - Run "CMake: Configure"

3. **Select Build Type**:
   - Press `Ctrl+Shift+P`
   - Run "CMake: Select Variant" → Debug/Release

4. **Build**:
   - Press `F7` or run "CMake: Build"

5. **Run**:
   - Press `Shift+F5` or use Run configuration

### Using Command Line

```bash
# Configure (first time only)
cd qt-gui
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug

# Subsequent builds
cmake --build .

# Run
./bin/ecosysx-gui

# Run tests
ctest --output-on-failure

# Clean build
rm -rf * && cmake .. && cmake --build .
```

## Verifying Installation

### Check CMake Configuration
```bash
cd qt-gui/build
cmake .. 2>&1 | grep -E "Qt6|Found"
```

Should show:
```
-- Found Qt6: 6.x.x
-- Qt6_VERSION: 6.x.x
```

### Check Qt Installation
```bash
qmake --version  # Should show Qt version
moc --version    # Qt Meta-Object Compiler
```

### Build Test Project
Create a minimal test to verify Qt works:
```bash
cd qt-gui
mkdir test-qt && cd test-qt

# Create test.cpp
cat > test.cpp << 'EOF'
#include <QApplication>
#include <QPushButton>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QPushButton button("Hello Qt!");
    button.show();
    return app.exec();
}
EOF

# Compile and run
qmake -project
qmake
make
./test-qt  # or .\release\test-qt.exe on Windows
```

## Troubleshooting

### CMake can't find Qt
**Problem**: `Could not find a package configuration file provided by "Qt6"`

**Solutions**:
1. Set `Qt6_DIR` environment variable
2. Pass to CMake: `cmake .. -DQt6_DIR=/path/to/qt6`
3. Add Qt to PATH

### Compiler not found
**Problem**: `No CMAKE_CXX_COMPILER could be found`

**Solutions**:
1. Install Visual Studio (Windows), Xcode (macOS), or GCC (Linux)
2. Specify compiler: `cmake .. -DCMAKE_CXX_COMPILER=g++`

### MOC errors
**Problem**: Meta-object compilation fails

**Solutions**:
1. Ensure `set(CMAKE_AUTOMOC ON)` in CMakeLists.txt
2. Clean build directory: `rm -rf build/*`
3. Rebuild: `cmake .. && cmake --build .`

### Qt libraries not found at runtime
**Problem**: Application fails to start, missing Qt DLLs

**Solutions (Windows)**:
1. Add Qt bin directory to PATH
2. Use windeployqt: `windeployqt --debug path/to/ecosysx-gui.exe`
3. Copy required DLLs to executable directory

**Solutions (Linux)**:
1. Set `LD_LIBRARY_PATH`: `export LD_LIBRARY_PATH=/path/to/qt/lib:$LD_LIBRARY_PATH`
2. Install Qt system-wide: `sudo apt-get install qt6-base-dev`

**Solutions (macOS)**:
1. Use macdeployqt: `macdeployqt EcoSysX.app`
2. Set `DYLD_LIBRARY_PATH` (not recommended for production)

## Editor Configuration

### Visual Studio Code Settings
Create `.vscode/settings.json`:
```json
{
    "cmake.configureOnOpen": true,
    "cmake.buildDirectory": "${workspaceFolder}/build",
    "C_Cpp.default.configurationProvider": "ms-vscode.cmake-tools",
    "files.associations": {
        "*.ui": "xml"
    }
}
```

### Qt Creator Settings
1. Tools → Options → Kits
2. Ensure Desktop Qt 6.x kit is configured
3. Build & Run → CMake: Verify CMake binary path

## Next Steps

1. Review [CODING_STANDARDS.md](CODING_STANDARDS.md)
2. Explore [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
3. Read main [README.md](README.md) for project overview
4. Start with Sprint 1 tasks
5. Run existing tests: `ctest` in build directory

## Additional Resources

- [Qt Documentation](https://doc.qt.io/qt-6/)
- [CMake Documentation](https://cmake.org/documentation/)
- [Qt for Beginners](https://doc.qt.io/qt-6/qtwidgets-tutorials-notepad-example.html)
- [CMake Qt Tutorial](https://doc.qt.io/qt-6/cmake-get-started.html)

## Platform-Specific Notes

### Windows
- Use 64-bit Qt build matching your compiler
- Run CMake from Qt command prompt or set paths manually
- Consider using vcpkg for dependency management

### macOS
- Xcode Command Line Tools required
- Homebrew recommended for dependencies
- Code signing needed for distribution

### Linux
- Install -dev packages for Qt
- May need to install additional dependencies: `libxcb-*`, `libgl-dev`
- Different distributions have different Qt package names

---

If you encounter issues not covered here, check the project's issue tracker or contact the development team.
