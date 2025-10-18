# C/C++ IntelliSense Configuration Guide

## Overview

This document explains the C/C++ IntelliSense configuration for the EcoSysX Qt GUI project. IntelliSense provides code completion, error highlighting, and navigation features in VSCode.

## Configuration Files

### 1. `.vscode/c_cpp_properties.json`

Configures the C/C++ extension include paths, compiler settings, and compile commands database.

**Key Settings:**
- **includePath**: Qt include directories and system headers
- **compilerPath**: Path to MinGW g++ compiler
- **compileCommands**: Path to CMake-generated compile commands
- **intelliSenseMode**: `windows-gcc-x64` for MinGW compiler

### 2. `.vscode/settings.json`

Workspace-specific settings for CMake and C++ tools.

**Key Settings:**
- **cmake.configureOnOpen**: Auto-configure CMake on workspace open
- **CMAKE_EXPORT_COMPILE_COMMANDS**: Generate compile_commands.json
- **C_Cpp.default.configurationProvider**: Use CMake Tools provider
- **File associations**: Maps Qt headers to C++ language

### 3. `.vscode/cmake-kits.json`

Defines CMake kit for Qt 6.9.3 with MinGW compiler.

## Setup Instructions

### Initial Setup

1. **Install Required VSCode Extensions:**
   - C/C++ Extension Pack (ms-vscode.cpptools-extension-pack)
   - CMake Tools (ms-vscode.cmake-tools)

2. **Configure CMake to Export Compile Commands:**
   
   The project's `CMakeLists.txt` already includes:
   ```cmake
   set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
   ```

3. **Build the Project:**
   
   Run CMake configuration to generate `compile_commands.json`:
   ```powershell
   cd qt-gui\build
   $env:PATH = "C:\Qt\6.9.3\mingw_64\bin;C:\Qt\Tools\mingw1310_64\bin;$env:PATH"
   C:\Qt\Tools\CMake_64\bin\cmake.exe .. -G "MinGW Makefiles" `
     -DCMAKE_PREFIX_PATH="C:/Qt/6.9.3/mingw_64" `
     -DCMAKE_BUILD_TYPE=Debug `
     -DCMAKE_EXPORT_COMPILE_COMMANDS=ON `
     -DCMAKE_CXX_COMPILER="C:/Qt/Tools/mingw1310_64/bin/g++.exe" `
     -DCMAKE_MAKE_PROGRAM="C:/Qt/Tools/mingw1310_64/bin/mingw32-make.exe"
   ```

4. **Copy Compile Commands to Root:**
   ```powershell
   Copy-Item build\compile_commands.json . -Force
   ```

### Verification

1. **Check IntelliSense Status:**
   - Open any C++ file (e.g., `src/core/EngineClient.h`)
   - Look at the bottom status bar for "C/C++" indicator
   - Click it to see configuration status

2. **Test Code Completion:**
   - Type `QObject::` and verify Qt methods appear
   - Hover over Qt classes to see documentation
   - Use "Go to Definition" (F12) on Qt classes

3. **Check for Errors:**
   - Qt header includes (e.g., `#include <QObject>`) should not show errors
   - No "Include path not found" warnings

## Troubleshooting

### Problem: "Cannot find QObject"

**Solution:**
1. Verify Qt installation path in `c_cpp_properties.json`
2. Check that `CMAKE_PREFIX_PATH` points to Qt installation
3. Rebuild project to regenerate compile commands

### Problem: IntelliSense not working after CMake changes

**Solution:**
1. Reload VSCode window (Ctrl+Shift+P → "Reload Window")
2. Delete `build/` directory and reconfigure:
   ```powershell
   Remove-Item -Recurse -Force build\*
   # Then reconfigure as shown above
   ```
3. Trigger IntelliSense configuration update:
   - Press Ctrl+Shift+P
   - Run "C/C++: Reset IntelliSense Database"

### Problem: Compile commands out of sync

**Solution:**

After modifying `CMakeLists.txt` or adding new files:
```powershell
cd qt-gui\build
cmake .. -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
Copy-Item compile_commands.json .. -Force
```

### Problem: Wrong configuration active

**Solution:**
1. Click on the configuration name in the status bar
2. Select "Win32-Qt6-MinGW" configuration
3. Or press Ctrl+Shift+P → "C/C++: Select a Configuration"

## File Locations

- **Compile Commands**: `qt-gui/compile_commands.json` (copy) and `qt-gui/build/compile_commands.json` (source)
- **VSCode Config**: `qt-gui/.vscode/`
- **CMake Cache**: `qt-gui/build/CMakeCache.txt`

## Automated Build Script

Use the provided build script which handles CMake configuration:

```powershell
# From qt-gui directory
.\scripts\build.ps1 -Preset dev-mingw -Clean
```

Note: After building, manually copy compile commands:
```powershell
Copy-Item build\compile_commands.json . -Force
```

## Include Paths Reference

The following include paths are configured for IntelliSense:

### Project Paths
- `${workspaceFolder}/src/**`
- `${workspaceFolder}/build/src/**` (generated MOC files)

### Qt 6.9.3 Paths
- `C:/Qt/6.9.3/mingw_64/include` (Qt base)
- `C:/Qt/6.9.3/mingw_64/include/QtCore`
- `C:/Qt/6.9.3/mingw_64/include/QtWidgets`
- `C:/Qt/6.9.3/mingw_64/include/QtGui`
- `C:/Qt/6.9.3/mingw_64/include/QtNetwork`
- `C:/Qt/6.9.3/mingw_64/include/QtCharts`
- `C:/Qt/6.9.3/mingw_64/include/QtTest`

### MinGW Paths
- `C:/Qt/Tools/mingw1310_64/lib/gcc/x86_64-w64-mingw32/13.1.0/include`
- `C:/Qt/Tools/mingw1310_64/lib/gcc/x86_64-w64-mingw32/13.1.0/include/c++`
- `C:/Qt/Tools/mingw1310_64/x86_64-w64-mingw32/include`

## CMake Integration

The CMake Tools extension is configured as the configuration provider. This means:

1. **Automatic Detection**: CMake Tools automatically detects compiler flags and includes
2. **Sync with Build**: Configuration stays in sync with CMake configuration
3. **Multi-Config Support**: Can switch between Debug/Release configurations

To select CMake kit:
1. Press Ctrl+Shift+P
2. Run "CMake: Select a Kit"
3. Choose "Qt 6.9.3 MinGW 64-bit"

## Best Practices

1. **Keep compile_commands.json Updated:**
   - Regenerate after adding new files
   - Update after modifying CMakeLists.txt
   - Copy to root directory after regeneration

2. **Use CMake Configuration Provider:**
   - Preferred over manual include path configuration
   - Automatically handles complex build configurations

3. **Reload Window After Major Changes:**
   - Close and reopen VSCode after Qt installation
   - Reload window after changing compiler paths

4. **Check IntelliSense Status Regularly:**
   - Monitor status bar for configuration issues
   - Act immediately on "Include errors" warnings

## Additional Resources

- [VSCode C++ Documentation](https://code.visualstudio.com/docs/cpp/cpp-ide)
- [CMake Tools Documentation](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/README.md)
- [Qt Documentation](https://doc.qt.io/)
- Project docs: `qt-gui/DEVELOPMENT_SETUP.md`

## Summary

The IntelliSense configuration is now complete with:
- ✅ Proper include paths for Qt and MinGW
- ✅ Compile commands database generated by CMake
- ✅ CMake Tools integration configured
- ✅ File associations for Qt headers
- ✅ Compiler and build tool paths set

IntelliSense should now provide full code intelligence for Qt C++ development in EcoSysX.
