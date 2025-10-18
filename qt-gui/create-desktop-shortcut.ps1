# Create Desktop Shortcut for EcoSysX GUI
# Run this script to create a desktop shortcut with the proper icon

$ErrorActionPreference = "Stop"

Write-Host "=== EcoSysX Desktop Shortcut Creator ===" -ForegroundColor Cyan
Write-Host ""

# Paths
$exePath = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin\ecosysx-gui.exe"
$iconPath = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\resources\icons\app.ico"
$workingDir = "C:\Users\Bbeie\Github\EcoSysX\EcoSysX\qt-gui\build\bin"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "EcoSysX Simulator.lnk"

# Verify files exist
if (-not (Test-Path $exePath)) {
    Write-Host "❌ ERROR: Application not found at:" -ForegroundColor Red
    Write-Host "   $exePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please build the application first:" -ForegroundColor Yellow
    Write-Host "   cd qt-gui\build" -ForegroundColor Gray
    Write-Host "   cmake --build . --config Release" -ForegroundColor Gray
    exit 1
}

if (-not (Test-Path $iconPath)) {
    Write-Host "⚠️  WARNING: Icon file not found at:" -ForegroundColor Yellow
    Write-Host "   $iconPath" -ForegroundColor Yellow
    Write-Host "   Shortcut will use default executable icon." -ForegroundColor Yellow
    $iconPath = $exePath
}

Write-Host "Creating desktop shortcut..." -ForegroundColor Green
Write-Host "  Target:    $exePath" -ForegroundColor Gray
Write-Host "  Icon:      $iconPath" -ForegroundColor Gray
Write-Host "  Location:  $shortcutPath" -ForegroundColor Gray
Write-Host ""

# Create WScript Shell object
$WScriptShell = New-Object -ComObject WScript.Shell

# Create shortcut
$Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $exePath
$Shortcut.WorkingDirectory = $workingDir
$Shortcut.IconLocation = $iconPath
$Shortcut.Description = "EcoSysX Ecosystem Simulator - Agent-Based Modeling GUI"
$Shortcut.WindowStyle = 1  # Normal window
$Shortcut.Save()

Write-Host "✅ Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now launch EcoSysX from:" -ForegroundColor Cyan
Write-Host "  • Desktop shortcut: 'EcoSysX Simulator'" -ForegroundColor White
Write-Host "  • Direct executable: qt-gui\build\bin\ecosysx-gui.exe" -ForegroundColor White
Write-Host ""

# Optional: Offer to create Start Menu shortcut
$createStartMenu = Read-Host "Would you like to create a Start Menu shortcut too? (y/n)"

if ($createStartMenu -eq "y" -or $createStartMenu -eq "Y") {
    $startMenuPath = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\EcoSysX Simulator.lnk"
    
    $Shortcut2 = $WScriptShell.CreateShortcut($startMenuPath)
    $Shortcut2.TargetPath = $exePath
    $Shortcut2.WorkingDirectory = $workingDir
    $Shortcut2.IconLocation = $iconPath
    $Shortcut2.Description = "EcoSysX Ecosystem Simulator - Agent-Based Modeling GUI"
    $Shortcut2.WindowStyle = 1
    $Shortcut2.Save()
    
    Write-Host "✅ Start Menu shortcut created!" -ForegroundColor Green
    Write-Host "   Search for 'EcoSysX' in Windows Start Menu" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Cyan
