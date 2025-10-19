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

# Set Qt paths in environment
$qtPath = "C:\Qt\6.9.3\mingw_64\bin"
$mingwPath = "C:\Qt\Tools\mingw1310_64\bin"
$env:PATH = "$qtPath;$mingwPath;$env:PATH"

# Launch the application
Write-Host "🚀 Launching EcoSysX GUI..." -ForegroundColor Cyan
Write-Host "   Qt DLLs: $qtPath" -ForegroundColor Gray
Write-Host "   MinGW: $mingwPath" -ForegroundColor Gray
Write-Host ""

# Start the process with updated environment
$processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
$processStartInfo.FileName = (Resolve-Path $exePath)
$processStartInfo.WorkingDirectory = (Split-Path (Resolve-Path $exePath))
$processStartInfo.UseShellExecute = $true

$process = [System.Diagnostics.Process]::Start($processStartInfo)

if ($process) {
    Write-Host "✅ EcoSysX GUI launched successfully!" -ForegroundColor Green
    Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 To connect to the engine server:" -ForegroundColor Yellow
    Write-Host "   1. Make sure the engine server is running (npm run dev:engine)" -ForegroundColor Gray
    Write-Host "   2. Check status bar for 'Connected to engine server'" -ForegroundColor Gray
    Write-Host "   3. Click 'Start' to begin simulation" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to launch GUI" -ForegroundColor Red
    exit 1
}
