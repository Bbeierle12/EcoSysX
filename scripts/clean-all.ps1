#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Clean all EcoSysX build artifacts
.DESCRIPTION
    Removes build outputs, node_modules, coverage, and caches
.PARAMETER Component
    Clean specific component only (web, gui, engine, services)
.PARAMETER KeepDeps
    Keep node_modules and package-lock.json files
.EXAMPLE
    .\clean-all.ps1
    .\clean-all.ps1 -Component gui
    .\clean-all.ps1 -KeepDeps
#>

param(
    [string]$Component = "all",
    [switch]$KeepDeps
)

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== EcoSysX Clean All ===" -ForegroundColor Cyan
Write-Host "Component: $Component" -ForegroundColor Gray
Write-Host "Keep Dependencies: $KeepDeps" -ForegroundColor Gray
Write-Host ""

function Remove-IfExists {
    param([string]$Path)
    if (Test-Path $Path) {
        Write-Host "  Removing: $Path" -ForegroundColor Gray
        Remove-Item -Recurse -Force $Path
    }
}

function Clean-Engine {
    Write-Host "[1/4] Cleaning genx-engine..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\packages\genx-engine"
    try {
        Remove-IfExists "dist"
        Remove-IfExists "coverage"
        Remove-IfExists ".vitest"
        if (-not $KeepDeps) {
            Remove-IfExists "node_modules"
        }
        Write-Host "✓ genx-engine cleaned" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Clean-Web {
    Write-Host "[2/4] Cleaning web application..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        Remove-IfExists "dist"
        Remove-IfExists "coverage"
        Remove-IfExists ".vitest"
        if (-not $KeepDeps) {
            Remove-IfExists "node_modules"
        }
        Write-Host "✓ Web application cleaned" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Clean-GUI {
    Write-Host "[3/4] Cleaning Qt GUI application..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\qt-gui"
    try {
        Remove-IfExists "build"
        Write-Host "✓ Qt GUI cleaned" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Clean-Services {
    Write-Host "[4/4] Cleaning service sidecars..." -ForegroundColor Yellow
    
    # Engine sidecar
    Push-Location "$RepoRoot\services\engine-sidecar"
    try {
        if (-not $KeepDeps) {
            Remove-IfExists "node_modules"
        }
    } finally {
        Pop-Location
    }
    
    # LLama service
    Push-Location "$RepoRoot\services\llama-service"
    try {
        if (-not $KeepDeps) {
            Remove-IfExists "node_modules"
        }
    } finally {
        Pop-Location
    }
    
    Write-Host "✓ Services cleaned" -ForegroundColor Green
}

# Execute cleaning
switch ($Component.ToLower()) {
    "engine" { Clean-Engine }
    "web" { Clean-Web }
    "gui" { Clean-GUI }
    "services" { Clean-Services }
    "all" {
        Clean-Engine
        Clean-Web
        Clean-GUI
        Clean-Services
    }
    default {
        Write-Error "Unknown component: $Component. Valid: all, engine, web, gui, services"
        exit 1
    }
}

Write-Host ""
Write-Host "=== Clean Complete ===" -ForegroundColor Green
