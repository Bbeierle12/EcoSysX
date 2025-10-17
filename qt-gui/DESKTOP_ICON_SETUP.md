# EcoSysX Desktop Icon Setup

## Overview

Your EcoSysX simulator now has a professional desktop icon configured! The icon features a green ecosystem theme with an "X" representing EcoSysX and interconnected nodes symbolizing the agent-based modeling system.

## What Was Added

### Icon Files Created

1. **`qt-gui/resources/icons/app.svg`** - Scalable vector icon
   - Green gradient background representing ecosystems
   - Interconnected nodes showing agent relationships
   - Central "X" for EcoSysX branding
   - Professional, modern design

2. **`qt-gui/resources/icons/app.ico`** - Windows icon file  
   - Multiple resolutions (16x16 to 256x256)
   - Optimized for Windows taskbar and desktop
   - Created from the SVG source

### Code Integration

1. **Qt Resource File** (`qt-gui/resources/resources.qrc`)
   - Embeds icon into the compiled application
   - Makes icon available via Qt resource system

2. **Application Code Updates**
   - `qt-gui/src/main.cpp`: Sets global application icon
   - `qt-gui/src/ui/MainWindow.cpp`: Sets window icon
   - `qt-gui/src/CMakeLists.txt`: Includes Windows `.ico` resource

## How to Rebuild with the Icon

### Option 1: Using Qt Creator (Recommended)

1. Open `qt-gui/CMakeLists.txt` in Qt Creator
2. Configure project with MinGW kit
3. Build → Rebuild All

### Option 2: Using Qt Command Prompt

```powershell
# Open "Qt 6.9.3 (MinGW)" command prompt from Start menu
cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build

# Clean and reconfigure
cmake --build . --target clean
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --config Release
```

### Option 3: Direct MinGW Build

```powershell
# Ensure MinGW is in your PATH
$env:PATH = "C:\Qt\Tools\mingw1310_64\bin;$env:PATH"

cd C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build
mingw32-make clean
cmake .. -G "MinGW Makefiles"
mingw32-make -j4
```

## Verifying the Icon

After rebuilding:

### In the Application

1. Launch `qt-gui/build/bin/ecosysx-gui.exe`
2. Check the window title bar - should show the green ecosystem icon
3. Check the taskbar - icon should appear there too
4. Alt+Tab - icon should appear in the task switcher

### On the Desktop

To create a desktop shortcut:

1. Right-click on Desktop → New → Shortcut
2. Browse to: `C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe`
3. Click Next, name it "EcoSysX Simulator"
4. Click Finish
5. The icon should automatically appear!

If the icon doesn't show:
1. Right-click shortcut → Properties
2. Click "Change Icon..."
3. Browse to `qt-gui\resources\icons\app.ico`
4. Select the icon and click OK

## Customizing the Icon

Want to change the icon design?

### Edit the SVG

1. Open `qt-gui/resources/icons/app.svg` in:
   - Inkscape (free, open-source)
   - Adobe Illustrator
   - Any vector graphics editor

2. Make your changes

3. Regenerate the `.ico` file:
   ```powershell
   python qt-gui/scripts/create_placeholder_icon.py
   ```

4. Rebuild the application

### Use a Different Icon

1. Replace `app.svg` and `app.ico` with your files
2. Keep the same filenames
3. Rebuild

## Troubleshooting

### Icon Not Showing After Build

- **Windows caches icons**: Log out and back in, or restart Explorer
  ```powershell
  Stop-Process -Name explorer -Force
  Start-Process explorer
  ```

- **Check build output**: Make sure `resources.qrc` was processed
  ```
  [3%] Automatic RCC for ../resources/resources.qrc
  ```

- **Verify resource**: Check that icon is embedded
  ```cpp
  QResource::registerResource(":/icons/icons/app.svg");
  ```

### Build Errors Related to Icon

If you get `.rc` file errors:

1. Comment out the Windows icon section in `qt-gui/src/CMakeLists.txt`:
   ```cmake
   # Windows icon resource
   #if(WIN32)
   #    ...
   #endif()
   ```

2. The SVG icon via Qt resources will still work

3. Report the issue for investigation

### Icon Quality Issues

The placeholder `.ico` was generated programmatically. For best quality:

1. Use an online converter: https://convertio.co/svg-ico/
2. Upload `qt-gui/resources/icons/app.svg`
3. Download the converted `.ico`
4. Replace `qt-gui/resources/icons/app.ico`
5. Rebuild

## Technical Details

### Icon Specifications

- **SVG**: 256x256px viewBox, scalable to any size
- **ICO**: Multiple resolutions embedded
  - 16x16 - Small icons, file lists
  - 32x32 - Standard toolbar, small windows
  - 48x48 - Large icons, Windows Explorer
  - 64x64 - Extra large icons
  - 128x128 - High DPI displays
  - 256x256 - Ultra high DPI, Windows 10/11

### Resource System

Qt's resource system (`.qrc` files) embeds files into the executable:

- **Advantages**: No external file dependencies, faster loading
- **Access**: Via `:/` prefix (e.g., `:/icons/icons/app.svg`)
- **Compile time**: Resources are compiled into the binary

### Platform Differences

- **Windows**: Uses `.ico` files (via `.rc` resource compiler)
- **macOS**: Uses `.icns` files (in app bundle)
- **Linux**: Uses `.png` or `.svg` (from freedesktop.org standards)

This implementation handles Windows. macOS and Linux support can be added similarly.

## Next Steps

### Create macOS Icon (Future)

```bash
# Generate .icns from SVG
mkdir app.iconset
sips -z 16 16 app.svg --out app.iconset/icon_16x16.png
sips -z 32 32 app.svg --out app.iconset/icon_16x16@2x.png
# ... more sizes ...
iconutil -c icns app.iconset
```

### Create Linux Icon (Future)

```cmake
# In CMakeLists.txt
install(FILES resources/icons/app.svg
        DESTINATION share/icons/hicolor/scalable/apps
        RENAME ecosysx.svg)
```

### Add More Icons

The `resources/icons/README.md` lists other icons needed:
- Start/Stop/Pause buttons
- Panel icons
- Action icons

Use the same pattern:
1. Add SVG to `resources/icons/`
2. Reference in `resources/resources.qrc`
3. Use in code: `QIcon(":/icons/icons/filename.svg")`

---

**Congratulations!** Your EcoSysX simulator now has a professional, branded desktop icon that will make it stand out on your desktop and taskbar. 🎉🌿
