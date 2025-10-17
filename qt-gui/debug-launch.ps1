# Debug launcher for EcoSysX GUI
# Captures error messages and displays them

Write-Host "=== EcoSysX GUI Debug Launcher ===" -ForegroundColor Cyan
Write-Host "Starting application..." -ForegroundColor Green

$exePath = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Application not found at: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host "Executable: $exePath" -ForegroundColor Gray
Write-Host "Icon resources embedded: " -NoNewline
if (Test-Path "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\resources\icons\app.svg") {
    Write-Host "YES" -ForegroundColor Green
} else {
    Write-Host "NO" -ForegroundColor Red
}

Write-Host "`nLaunching application (press Ctrl+C to stop)..." -ForegroundColor Yellow
Write-Host "-------------------------------------------`n" -ForegroundColor Gray

try {
    & $exePath
    $exitCode = $LASTEXITCODE
    
    Write-Host "`n-------------------------------------------" -ForegroundColor Gray
    if ($exitCode -eq 0) {
        Write-Host "Application exited normally (code: $exitCode)" -ForegroundColor Green
    } else {
        Write-Host "Application exited with error code: $exitCode" -ForegroundColor Red
        Write-Host "`nCommon exit codes:" -ForegroundColor Yellow
        Write-Host "  -1073741515 (0xC0000135): Missing DLL dependency" -ForegroundColor Gray
        Write-Host "  -1073741511 (0xC0000139): Entry point not found" -ForegroundColor Gray
        Write-Host "  1: General application error" -ForegroundColor Gray
    }
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
