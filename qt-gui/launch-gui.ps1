# EcoSysX Qt GUI Launcher with Diagnostics
# This script properly sets up the environment and launches the GUI

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  EcoSysX Qt GUI Launcher" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Change to qt-gui directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Paths
$exePath = "build\bin\ecosysx-gui.exe"
$qtBinPath = "C:\Qt\6.9.3\mingw_64\bin"
$mingwBinPath = "C:\Qt\Tools\mingw1310_64\bin"

# Step 1: Check if executable exists
Write-Host "[1/5] Checking executable..." -ForegroundColor Yellow
if (-not (Test-Path $exePath)) {
    Write-Host "   ❌ ERROR: Executable not found at: $exePath" -ForegroundColor Red
    Write-Host "   Please build the project first:" -ForegroundColor Red
    Write-Host "   cmake --build build --config Release" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "   ✅ Executable found" -ForegroundColor Green

# Step 2: Check Qt installation
Write-Host "[2/5] Checking Qt installation..." -ForegroundColor Yellow
if (-not (Test-Path $qtBinPath)) {
    Write-Host "   ❌ ERROR: Qt not found at: $qtBinPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "   ✅ Qt found at $qtBinPath" -ForegroundColor Green

# Step 3: Check Qt6WebSockets DLL
Write-Host "[3/5] Checking Qt6WebSockets..." -ForegroundColor Yellow
$websocketDll = Join-Path $qtBinPath "Qt6WebSockets.dll"
if (-not (Test-Path $websocketDll)) {
    Write-Host "   ❌ ERROR: Qt6WebSockets.dll not found" -ForegroundColor Red
    Write-Host "   Qt WebSockets module is required" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "   ✅ Qt6WebSockets.dll found" -ForegroundColor Green

# Step 4: Set environment
Write-Host "[4/5] Setting up environment..." -ForegroundColor Yellow
$env:PATH = "$qtBinPath;$mingwBinPath;$env:PATH"
$env:QT_PLUGIN_PATH = "C:\Qt\6.9.3\mingw_64\plugins"
Write-Host "   ✅ Environment configured" -ForegroundColor Green

# Step 5: Launch application
Write-Host "[5/5] Launching GUI..." -ForegroundColor Yellow
Write-Host ""

try {
    $fullExePath = Resolve-Path $exePath
    $workingDir = Split-Path $fullExePath
    
    Write-Host "🚀 Starting EcoSysX GUI..." -ForegroundColor Cyan
    Write-Host "   Executable: $fullExePath" -ForegroundColor Gray
    Write-Host "   Working Directory: $workingDir" -ForegroundColor Gray
    Write-Host ""
    
    # Launch with proper environment
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $fullExePath
    $processInfo.WorkingDirectory = $workingDir
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $false
    
    # Add environment variables
    $processInfo.EnvironmentVariables["PATH"] = $env:PATH
    $processInfo.EnvironmentVariables["QT_PLUGIN_PATH"] = $env:QT_PLUGIN_PATH
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    # Event handlers for output
    $outputHandler = {
        if (-not [string]::IsNullOrEmpty($EventArgs.Data)) {
            Write-Host $EventArgs.Data -ForegroundColor Gray
        }
    }
    
    $errorHandler = {
        if (-not [string]::IsNullOrEmpty($EventArgs.Data)) {
            Write-Host $EventArgs.Data -ForegroundColor Red
        }
    }
    
    Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputHandler | Out-Null
    Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorHandler | Out-Null
    
    $started = $process.Start()
    
    if ($started) {
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        Write-Host "✅ GUI launched successfully!" -ForegroundColor Green
        Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Next Steps:" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  1. Ensure engine server is running:" -ForegroundColor White
        Write-Host "     npm run dev:engine" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Check GUI status bar shows:" -ForegroundColor White
        Write-Host "     'Connected to engine server'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Click 'Start' button to begin simulation" -ForegroundColor White
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop monitoring output..." -ForegroundColor DarkGray
        
        # Wait for process (optional - can be backgrounded)
        # $process.WaitForExit()
        
    } else {
        Write-Host "❌ Failed to start process" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ ERROR launching GUI:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Stack trace:" -ForegroundColor DarkGray
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    Read-Host "Press Enter to exit"
    exit 1
}
