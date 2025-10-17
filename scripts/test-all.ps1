#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run all EcoSysX tests
.DESCRIPTION
    Orchestrates testing of all components:
    1. Core engine tests (genx-engine)
    2. Web application tests
    3. Qt GUI tests (unit + integration)
    4. Service tests
.PARAMETER Component
    Test specific component only (web, gui, engine, services)
.PARAMETER Coverage
    Generate coverage reports
.EXAMPLE
    .\test-all.ps1
    .\test-all.ps1 -Component gui
    .\test-all.ps1 -Coverage
#>

param(
    [string]$Component = "all",
    [switch]$Coverage
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$TestsPassed = 0
$TestsFailed = 0

Write-Host "=== EcoSysX Test All ===" -ForegroundColor Cyan
Write-Host "Component: $Component" -ForegroundColor Gray
Write-Host "Coverage: $Coverage" -ForegroundColor Gray
Write-Host ""

function Test-Engine {
    Write-Host "[1/4] Testing genx-engine..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\packages\genx-engine"
    try {
        if ($Coverage) {
            npm test -- --coverage
        } else {
            npm test
        }
        Write-Host "✓ genx-engine tests passed" -ForegroundColor Green
        $script:TestsPassed++
    } catch {
        Write-Host "✗ genx-engine tests failed" -ForegroundColor Red
        $script:TestsFailed++
        throw
    } finally {
        Pop-Location
    }
}

function Test-Web {
    Write-Host "[2/4] Testing web application..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        if ($Coverage) {
            npm test -- --coverage
        } else {
            npm test
        }
        Write-Host "✓ Web application tests passed" -ForegroundColor Green
        $script:TestsPassed++
    } catch {
        Write-Host "✗ Web application tests failed" -ForegroundColor Red
        $script:TestsFailed++
        throw
    } finally {
        Pop-Location
    }
}

function Test-GUI {
    Write-Host "[3/4] Testing Qt GUI application..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\qt-gui"
    try {
        # Use ci-mingw preset on Windows, ci-unix on Linux/Mac
        $preset = if ($IsLinux -or $IsMacOS) { "ci-unix" } else { "ci-mingw" }
        
        # Build if needed
        if (-not (Test-Path "build\bin\*.exe") -and -not (Test-Path "build/bin/*")) {
            Write-Host "  Building Qt GUI first..." -ForegroundColor Gray
            & .\scripts\build.ps1 -Preset $preset
        }
        
        # Run tests
        cmake --build build --target test
        Write-Host "✓ Qt GUI tests passed" -ForegroundColor Green
        $script:TestsPassed++
    } catch {
        Write-Host "✗ Qt GUI tests failed" -ForegroundColor Red
        $script:TestsFailed++
        throw
    } finally {
        Pop-Location
    }
}

function Test-Services {
    Write-Host "[4/4] Testing service sidecars..." -ForegroundColor Yellow
    
    # Engine sidecar tests
    Write-Host "  Testing engine-sidecar..." -ForegroundColor Gray
    Push-Location "$RepoRoot\services\engine-sidecar"
    try {
        npm test
        Write-Host "  ✓ engine-sidecar tests passed" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ engine-sidecar tests failed" -ForegroundColor Red
        throw
    } finally {
        Pop-Location
    }
    
    Write-Host "✓ Service tests completed" -ForegroundColor Green
    $script:TestsPassed++
}

# Execute tests
try {
    switch ($Component.ToLower()) {
        "engine" { Test-Engine }
        "web" { Test-Web }
        "gui" { Test-GUI }
        "services" { Test-Services }
        "all" {
            Test-Engine
            Test-Web
            Test-GUI
            Test-Services
        }
        default {
            Write-Error "Unknown component: $Component. Valid: all, engine, web, gui, services"
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "=== Test Results ===" -ForegroundColor Green
    Write-Host "Components Passed: $TestsPassed" -ForegroundColor Green
    Write-Host "Components Failed: $TestsFailed" -ForegroundColor $(if ($TestsFailed -gt 0) { "Red" } else { "Gray" })
    
    if ($TestsFailed -gt 0) {
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "=== Tests Failed ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Components Passed: $TestsPassed" -ForegroundColor Gray
    Write-Host "Components Failed: $TestsFailed" -ForegroundColor Red
    exit 1
}
