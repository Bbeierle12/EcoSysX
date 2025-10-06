# EcoSysX Qt GUI - Build Script for Windows PowerShell

param(
    [string]$BuildType = "Debug",
    [switch]$Clean
)

Write-Host "=== EcoSysX Qt GUI Build Script ===" -ForegroundColor Green

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BuildDir = Join-Path $ProjectDir "build"

Write-Host "Project Directory: $ProjectDir"
Write-Host "Build Type: $BuildType"
Write-Host "Build Directory: $BuildDir"

# Clean build if requested
if ($Clean) {
    Write-Host "Cleaning build directory..." -ForegroundColor Yellow
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }
}

# Create build directory
if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

Set-Location $BuildDir

# Configure with CMake
Write-Host "Configuring with CMake..." -ForegroundColor Green
cmake .. -G "Visual Studio 17 2022" -A x64

if ($LASTEXITCODE -ne 0) {
    Write-Host "CMake configuration failed!" -ForegroundColor Red
    exit 1
}

# Build
Write-Host "Building..." -ForegroundColor Green
cmake --build . --config $BuildType

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Success message
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Executable: " -NoNewline
Write-Host "$BuildDir\bin\$BuildType\ecosysx-gui.exe" -ForegroundColor Green
Write-Host ""
Write-Host "To run: cd $BuildDir; .\bin\$BuildType\ecosysx-gui.exe"
Write-Host "To test: cd $BuildDir; ctest -C $BuildType --output-on-failure"
