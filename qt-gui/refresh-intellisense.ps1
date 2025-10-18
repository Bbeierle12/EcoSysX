# IntelliSense Refresh Script
# Run this script when IntelliSense is not working properly

$ErrorActionPreference = "Continue"

Write-Host "=== EcoSysX Qt GUI - IntelliSense Refresh ===" -ForegroundColor Cyan

$QtGuiDir = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui"
Set-Location $QtGuiDir

# Step 1: Check compile commands
Write-Host "`n[1/4] Checking compile_commands.json..." -ForegroundColor Yellow

if (Test-Path "build\compile_commands.json") {
    Write-Host "  [OK] Found existing compile_commands.json" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] compile_commands.json not found, running CMake..." -ForegroundColor Yellow
    
    Push-Location build
    $env:PATH = "C:\Qt\6.9.3\mingw_64\bin;C:\Qt\Tools\mingw1310_64\bin;$env:PATH"
    
    $cmakeArgs = @(
        ".."
        "-G", "MinGW Makefiles"
        "-DCMAKE_PREFIX_PATH=C:/Qt/6.9.3/mingw_64"
        "-DCMAKE_BUILD_TYPE=Debug"
        "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON"
        "-DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe"
        "-DCMAKE_MAKE_PROGRAM=C:/Qt/Tools/mingw1310_64/bin/mingw32-make.exe"
    )
    
    & "C:\Qt\Tools\CMake_64\bin\cmake.exe" @cmakeArgs
    Pop-Location
}

# Step 2: Copy to root directory
Write-Host "`n[2/4] Copying compile_commands.json to root..." -ForegroundColor Yellow

if (Test-Path "build\compile_commands.json") {
    Copy-Item "build\compile_commands.json" . -Force
    Write-Host "  [OK] Copied to qt-gui root directory" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Failed to find compile_commands.json" -ForegroundColor Red
}

# Step 3: Verify configuration files
Write-Host "`n[3/4] Verifying VSCode configuration..." -ForegroundColor Yellow

$configFiles = @(
    ".vscode\c_cpp_properties.json"
    ".vscode\settings.json"
    ".vscode\cmake-kits.json"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file exists" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $file" -ForegroundColor Red
    }
}

# Step 4: Instructions
Write-Host "`n[4/4] Next Steps:" -ForegroundColor Yellow
Write-Host "  1. In VSCode, press Ctrl+Shift+P" -ForegroundColor Cyan
Write-Host "  2. Run: C/C++: Reset IntelliSense Database" -ForegroundColor Cyan
Write-Host "  3. Run: Developer: Reload Window" -ForegroundColor Cyan
Write-Host "  4. Open any .h or .cpp file to test IntelliSense" -ForegroundColor Cyan

Write-Host "`n=== IntelliSense Refresh Complete ===" -ForegroundColor Green
Write-Host "`nIf issues persist, see INTELLISENSE_SETUP.md for troubleshooting" -ForegroundColor Yellow
