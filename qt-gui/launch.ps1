# Simple Launcher for EcoSysX GUI
# Double-click this file to run the application

$ErrorActionPreference = "Stop"

# Path to executable
$exePath = "build\bin\ecosysx-gui.exe"

# Change to qt-gui directory (where this script is located)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if executable exists
if (-not (Test-Path $exePath)) {
    $msg = @"
ERROR: Application not built yet!

The executable was not found at: $exePath

Please build the application first:
1. Open PowerShell in the qt-gui directory
2. Run: cd build
3. Run: cmake --build . --config Release

Or open qt-gui\BUILD_SUCCESS_REPORT.md for detailed instructions.
"@
    [System.Windows.Forms.MessageBox]::Show($msg, "EcoSysX - Build Required", 
        [System.Windows.Forms.MessageBoxButtons]::OK, 
        [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

# Launch the application
Write-Host "🚀 Launching EcoSysX GUI..." -ForegroundColor Cyan
Start-Process -FilePath (Resolve-Path $exePath) -WorkingDirectory (Split-Path (Resolve-Path $exePath))
