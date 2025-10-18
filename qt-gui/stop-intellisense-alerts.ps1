# Quick Fix for IntelliSense Alerts
# Run this if you keep getting "Configure IntelliSense" alerts

Write-Host "=== Stopping IntelliSense Alerts ===" -ForegroundColor Cyan
Write-Host ""

# Verify files exist
$qtGuiDir = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui"
Set-Location $qtGuiDir

Write-Host "Checking configuration files..." -ForegroundColor Yellow
$allGood = $true

$files = @{
    "compile_commands.json" = "Compilation database"
    ".vscode\c_cpp_properties.json" = "C++ configuration"
    ".vscode\settings.json" = "Workspace settings"
}

foreach ($file in $files.Keys) {
    if (Test-Path $file) {
        Write-Host "  [OK] $($files[$file])" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($files[$file]) at $file" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "`nSome files are missing. Run: .\refresh-intellisense.ps1" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll configuration files present!" -ForegroundColor Green
Write-Host ""
Write-Host "=== MANUAL STEPS REQUIRED ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "VSCode cannot be controlled from PowerShell, so please do this manually:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Press Ctrl+Shift+P in VSCode" -ForegroundColor White
Write-Host "Step 2: Type and select: C/C++: Reset IntelliSense Database" -ForegroundColor White
Write-Host "Step 3: Press Ctrl+Shift+P again" -ForegroundColor White
Write-Host "Step 4: Type and select: Developer: Reload Window" -ForegroundColor White
Write-Host ""
Write-Host "This will stop the alerts. You only need to do this once!" -ForegroundColor Green
Write-Host ""
Write-Host "Alternative: Just close and reopen VSCode" -ForegroundColor Yellow
