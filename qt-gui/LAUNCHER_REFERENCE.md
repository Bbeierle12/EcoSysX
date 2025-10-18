# EcoSysX Launcher & Icon Reference

## Quick Launch Options

### Option 1: Desktop Shortcut (Recommended)
Create a desktop shortcut with proper icon:
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
.\create-desktop-shortcut.ps1
```
This creates:
- Desktop shortcut: "EcoSysX Simulator"
- Optional Start Menu entry

### Option 2: Simple Launcher Script
Double-click to launch:
```
qt-gui\launch.ps1
```

### Option 3: Debug Launcher
Launch with debug output:
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
.\debug-launch.ps1
```

### Option 4: Direct Executable
Navigate to and double-click:
```
qt-gui\build\bin\ecosysx-gui.exe
```

## Icon Files

### Location
```
qt-gui/resources/icons/
├── app.svg          # Vector icon (scalable)
├── app.ico          # Windows icon (multi-resolution)
└── README.md        # Icon documentation
```

### Icon Design
- **Theme**: Green ecosystem with interconnected nodes
- **Logo**: Central "X" representing EcoSysX
- **Format**: SVG (source), ICO (Windows)
- **Resolutions**: 16×16 to 256×256 pixels

### How Icon is Applied

1. **Embedded in Executable** (via CMake)
   - `qt-gui/src/CMakeLists.txt` includes `app.ico` as Windows resource
   - Icon automatically appears in taskbar, Alt+Tab, etc.

2. **Set in Application Code**
   - `qt-gui/src/main.cpp`: `app.setWindowIcon(QIcon(":/icons/icons/app.svg"))`
   - `qt-gui/src/ui/MainWindow.cpp`: `setWindowIcon(QIcon(":/icons/icons/app.svg"))`

3. **Qt Resource System**
   - `qt-gui/resources/resources.qrc` embeds icons into binary
   - Accessible via `:/icons/icons/app.svg` path

## File Structure

```
qt-gui/
├── launch.ps1                      # Simple launcher
├── debug-launch.ps1                # Debug launcher (existing)
├── create-desktop-shortcut.ps1     # Desktop shortcut creator (new)
├── DESKTOP_ICON_SETUP.md           # Icon documentation (existing)
├── resources/
│   ├── icons/
│   │   ├── app.svg                 # Vector icon
│   │   ├── app.ico                 # Windows icon
│   │   └── README.md               # Icon docs
│   └── resources.qrc               # Qt resource file
├── src/
│   ├── main.cpp                    # Sets application icon
│   ├── ui/MainWindow.cpp           # Sets window icon
│   └── CMakeLists.txt              # Includes icon resource
└── build/
    └── bin/
        └── ecosysx-gui.exe         # Built executable with icon
```

## Creating Desktop Shortcut Manually

If scripts don't work, create manually:

1. **Right-click** on Desktop → **New** → **Shortcut**
2. **Location**: 
   ```
   C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe
   ```
3. **Name**: `EcoSysX Simulator`
4. **Set Icon** (if needed):
   - Right-click shortcut → **Properties**
   - Click **Change Icon...**
   - Browse to: `qt-gui\resources\icons\app.ico`
   - Click **OK**

## Changing the Icon

### Edit Vector Icon
1. Open `qt-gui/resources/icons/app.svg` in:
   - Inkscape (free)
   - Adobe Illustrator
   - Any SVG editor

2. Save changes

3. Regenerate `.ico`:
   ```powershell
   python qt-gui/scripts/generate_icon.py
   ```

4. Rebuild application:
   ```powershell
   cd qt-gui/build
   cmake --build . --config Release
   ```

### Replace Icon
1. Replace `app.svg` and `app.ico` with your files
2. Keep same filenames
3. Rebuild

## Troubleshooting

### Icon Not Showing
**Windows caches icons** - Restart Explorer:
```powershell
Stop-Process -Name explorer -Force
Start-Process explorer
```

Or log out and back in.

### Shortcut Creation Fails
Run PowerShell as Administrator:
```powershell
Start-Process powershell -Verb RunAs
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui
.\create-desktop-shortcut.ps1
```

### Application Won't Launch
Verify build completed:
```powershell
Test-Path "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe"
```

If `False`, rebuild:
```powershell
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build
$env:PATH = "C:\Qt\Tools\mingw1310_64\bin;$env:PATH"
cmake --build . --config Release
```

## Platform-Specific Notes

### Windows (Current)
- ✅ `.ico` file embedded via resource compiler
- ✅ Shows in taskbar, Alt+Tab, Explorer
- ✅ Desktop shortcuts supported

### macOS (Future)
- Need `.icns` file
- Package as `.app` bundle
- Add to `Info.plist`

### Linux (Future)
- Use `.svg` or `.png`
- Install to `/usr/share/icons/hicolor/`
- Create `.desktop` file

## Related Documentation

- **`DESKTOP_ICON_SETUP.md`** - Complete icon setup guide
- **`BUILD_SUCCESS_REPORT.md`** - Build instructions
- **`VERIFICATION_GUIDE.md`** - Testing guide
- **`resources/icons/README.md`** - Icon specifications

## Quick Commands

```powershell
# Create desktop shortcut
.\create-desktop-shortcut.ps1

# Launch application
.\launch.ps1

# Launch with debugging
.\debug-launch.ps1

# Direct run
.\build\bin\ecosysx-gui.exe

# Rebuild application
cd build
cmake --build . --config Release
```

---

**Last Updated**: October 17, 2025  
**Icon Version**: v1.0 (Green Ecosystem Theme)
