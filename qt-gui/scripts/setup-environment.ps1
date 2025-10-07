# EcoSysX Qt GUI - Setup Environment Script
# This script helps install the necessary build tools

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('VisualStudio', 'MinGW', 'Qt', 'Check')]
    [string]$Action = 'Check'
)

Write-Host "=== EcoSysX Build Environment Setup ===" -ForegroundColor Green
Write-Host ""

function Test-CommandExists {
    param($command)
    $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
}

function Show-Status {
    Write-Host "`n=== Current Environment Status ===" -ForegroundColor Cyan
    
    # Check CMake
    if (Test-CommandExists cmake) {
        $cmakeVersion = (cmake --version 2>$null | Select-Object -First 1)
        Write-Host "[✓] CMake: $cmakeVersion" -ForegroundColor Green
    } else {
        Write-Host "[✗] CMake: Not found" -ForegroundColor Red
    }
    
    # Check C++ Compiler
    $compilerFound = $false
    if (Test-CommandExists cl) {
        $clVersion = (cl 2>&1 | Select-String "Version" | Select-Object -First 1)
        Write-Host "[✓] MSVC: $clVersion" -ForegroundColor Green
        $compilerFound = $true
    } elseif (Test-CommandExists g++) {
        $gccVersion = (g++ --version | Select-Object -First 1)
        Write-Host "[✓] GCC: $gccVersion" -ForegroundColor Green
        $compilerFound = $true
    } else {
        Write-Host "[✗] C++ Compiler: Not found" -ForegroundColor Red
    }
    
    # Check Qt
    $qtFound = $false
    $qtPaths = @(
        "C:\Qt\6.*\msvc*\bin\qmake.exe",
        "C:\Qt\6.*\mingw*\bin\qmake.exe",
        "$env:LOCALAPPDATA\Qt\6.*\bin\qmake.exe"
    )
    
    foreach ($pattern in $qtPaths) {
        $qmake = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($qmake) {
            $qtVersion = (& $qmake.FullName -v | Select-String "Qt version" | Select-Object -First 1)
            Write-Host "[✓] Qt: $qtVersion" -ForegroundColor Green
            Write-Host "    Path: $($qmake.DirectoryName)" -ForegroundColor Gray
            $qtFound = $true
            break
        }
    }
    
    if (-not $qtFound) {
        Write-Host "[✗] Qt 6: Not found" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Summary
    if ($compilerFound -and $qtFound) {
        Write-Host "✓ Environment is ready to build!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠ Missing required components" -ForegroundColor Yellow
        return $false
    }
}

function Install-VisualStudio {
    Write-Host "`n=== Installing Visual Studio 2022 Community ===" -ForegroundColor Cyan
    Write-Host "This will download and install Visual Studio with C++ tools." -ForegroundColor Yellow
    Write-Host "Size: ~7-10 GB | Time: ~30-60 minutes" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Continue? (Y/N)"
    if ($confirm -ne 'Y') {
        Write-Host "Cancelled." -ForegroundColor Red
        return
    }
    
    Write-Host "Installing Visual Studio 2022 Community..." -ForegroundColor Green
    winget install --id Microsoft.VisualStudio.2022.Community --silent `
        --override "--quiet --add Microsoft.VisualStudio.Workload.NativeDesktop --includeRecommended"
    
    Write-Host "`nVisual Studio installed!" -ForegroundColor Green
    Write-Host "Please reboot your computer before building." -ForegroundColor Yellow
}

function Install-MinGW {
    Write-Host "`n=== Installing MSYS2/MinGW ===" -ForegroundColor Cyan
    Write-Host "This will install MSYS2 with MinGW-w64 GCC compiler." -ForegroundColor Yellow
    Write-Host "Size: ~1-2 GB | Time: ~15-20 minutes" -ForegroundColor Yellow
    Write-Host ""
    
    $confirm = Read-Host "Continue? (Y/N)"
    if ($confirm -ne 'Y') {
        Write-Host "Cancelled." -ForegroundColor Red
        return
    }
    
    Write-Host "Installing MSYS2..." -ForegroundColor Green
    winget install --id=MSYS2.MSYS2 -e
    
    Write-Host "`nMSYS2 installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open MSYS2 terminal (Start Menu > MSYS2 MINGW64)" -ForegroundColor White
    Write-Host "2. Run: pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-make" -ForegroundColor White
    Write-Host "3. Add to PATH: C:\msys64\mingw64\bin" -ForegroundColor White
    Write-Host "4. Restart PowerShell" -ForegroundColor White
}

function Install-Qt {
    Write-Host "`n=== Installing Qt ===" -ForegroundColor Cyan
    Write-Host "Qt Online Installer must be downloaded manually." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor White
    Write-Host "1. Download from: https://www.qt.io/download-qt-installer" -ForegroundColor Gray
    Write-Host "2. Run installer" -ForegroundColor Gray
    Write-Host "3. Select Qt 6.5+ (or latest 6.x)" -ForegroundColor Gray
    Write-Host "4. Components to install:" -ForegroundColor Gray
    Write-Host "   - MSVC 2019/2022 64-bit (if using Visual Studio)" -ForegroundColor Gray
    Write-Host "   - MinGW 11.2.0 64-bit (if using MinGW)" -ForegroundColor Gray
    Write-Host "   - Qt Charts" -ForegroundColor Gray
    Write-Host "   - Qt Test" -ForegroundColor Gray
    Write-Host "   - Developer Tools" -ForegroundColor Gray
    Write-Host ""
    
    $open = Read-Host "Open download page in browser? (Y/N)"
    if ($open -eq 'Y') {
        Start-Process "https://www.qt.io/download-qt-installer"
    }
}

# Main logic
switch ($Action) {
    'Check' {
        $ready = Show-Status
        
        if (-not $ready) {
            Write-Host "`n=== Recommended Installation ===" -ForegroundColor Cyan
            Write-Host "1. Install Visual Studio: .\setup-environment.ps1 -Action VisualStudio" -ForegroundColor White
            Write-Host "2. Install Qt: .\setup-environment.ps1 -Action Qt" -ForegroundColor White
            Write-Host ""
            Write-Host "Or for lightweight:" -ForegroundColor Cyan
            Write-Host "1. Install MinGW: .\setup-environment.ps1 -Action MinGW" -ForegroundColor White
            Write-Host "2. Install Qt: .\setup-environment.ps1 -Action Qt" -ForegroundColor White
        } else {
            Write-Host "You can now build the project:" -ForegroundColor Green
            Write-Host "  cmake -B build -S . -DCMAKE_BUILD_TYPE=Release" -ForegroundColor White
            Write-Host "  cmake --build build --config Release" -ForegroundColor White
        }
    }
    
    'VisualStudio' {
        Install-VisualStudio
    }
    
    'MinGW' {
        Install-MinGW
    }
    
    'Qt' {
        Install-Qt
    }
}

Write-Host ""
Write-Host "For detailed instructions, see BUILD_STATUS.md" -ForegroundColor Gray
Write-Host ""
