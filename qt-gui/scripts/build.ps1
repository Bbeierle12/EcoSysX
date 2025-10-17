# EcoSysX Qt GUI - Build Script for Windows PowerShell
# Now using CMake Presets for consistent configuration

param(
    [ValidateSet("dev", "dev-mingw", "dev-vs", "ci", "ci-mingw", "release")]
    [string]$Preset = "dev-mingw",
    [switch]$Clean,
    [switch]$Test
)

Write-Host "=== EcoSysX Qt GUI Build Script (CMake Presets) ===" -ForegroundColor Green

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "Project Directory: $ProjectDir"
Write-Host "Preset: $Preset"

Set-Location $ProjectDir

# Clean build if requested
if ($Clean) {
    Write-Host "Cleaning build directory..." -ForegroundColor Yellow
    cmake --build --preset $Preset --target clean 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Clean command not available, removing build directory..." -ForegroundColor Yellow
        $BuildDir = (cmake --preset $Preset --list-presets 2>&1 | Select-String "binaryDir").ToString().Split(":")[-1].Trim()
        if (Test-Path $BuildDir) {
            Remove-Item -Recurse -Force $BuildDir
        }
    }
}

# Configure with CMake preset
Write-Host "Configuring with preset '$Preset'..." -ForegroundColor Green
cmake --preset $Preset

if ($LASTEXITCODE -ne 0) {
    Write-Host "CMake configuration failed!" -ForegroundColor Red
    exit 1
}

# Build with CMake preset
Write-Host "Building..." -ForegroundColor Green
cmake --build --preset $Preset

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Run tests if requested
if ($Test) {
    Write-Host "Running tests..." -ForegroundColor Green
    ctest --preset $Preset
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Tests failed!" -ForegroundColor Red
        exit 1
    }
}

# Success message
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  Run application: cmake --build --preset $Preset --target run"
Write-Host "  Run tests:       ctest --preset $Preset"
Write-Host "  Clean build:     .\build.ps1 -Preset $Preset -Clean"
Write-Host ""
Write-Host "Available presets: dev-mingw, dev-vs, ci-mingw, release" -ForegroundColor Yellow
