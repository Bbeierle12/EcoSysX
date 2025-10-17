#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build all EcoSysX components
.DESCRIPTION
    Orchestrates building of all components in dependency order:
    1. Core engine (genx-engine)
    2. Web application
    3. Qt GUI application
    4. Service sidecars
.PARAMETER Component
    Build specific component only (web, gui, engine, services)
.PARAMETER Configuration
    Build configuration for Qt GUI (dev, ci-mingw, release)
.EXAMPLE
    .\build-all.ps1
    .\build-all.ps1 -Component gui -Configuration release
#>

param(
    [string]$Component = "all",
    [string]$Configuration = "dev"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== EcoSysX Build All ===" -ForegroundColor Cyan
Write-Host "Component: $Component" -ForegroundColor Gray
Write-Host "Configuration: $Configuration" -ForegroundColor Gray
Write-Host ""

function Build-Engine {
    Write-Host "[1/4] Building genx-engine..." -ForegroundColor Yellow
    Push-Location "$RepoRoot\packages\genx-engine"
    try {
        npm ci
        npm run build
        Write-Host "✓ genx-engine built successfully" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Build-Web {
    Write-Host "[2/4] Building web application..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        npm ci
        npm run build
        Write-Host "✓ Web application built successfully" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Build-GUI {
    Write-Host "[3/4] Building Qt GUI application..." -ForegroundColor Yellow
    $preset = if ($IsLinux -or $IsMacOS) { "ci-unix" } else { $Configuration }
    Push-Location "$RepoRoot\qt-gui"
    try {
        & .\scripts\build.ps1 -Preset $preset
        Write-Host "✓ Qt GUI built successfully" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Build-Services {
    Write-Host "[4/4] Building service sidecars..." -ForegroundColor Yellow
    
    # Engine sidecar (Node.js)
    Write-Host "  Building engine-sidecar..." -ForegroundColor Gray
    Push-Location "$RepoRoot\services\engine-sidecar"
    try {
        npm ci
        Write-Host "  ✓ engine-sidecar ready" -ForegroundColor Green
    } finally {
        Pop-Location
    }
    
    # Agents sidecar (Julia) - just verify Project.toml exists
    Write-Host "  Verifying agents-sidecar..." -ForegroundColor Gray
    if (Test-Path "$RepoRoot\services\agents-sidecar\Project.toml") {
        Write-Host "  ✓ agents-sidecar ready (Julia project)" -ForegroundColor Green
    } else {
        Write-Warning "  agents-sidecar missing Project.toml"
    }
    
    Write-Host "✓ Services ready" -ForegroundColor Green
}

# Execute builds
try {
    switch ($Component.ToLower()) {
        "engine" { Build-Engine }
        "web" { Build-Web }
        "gui" { Build-GUI }
        "services" { Build-Services }
        "all" {
            Build-Engine
            Build-Web
            Build-GUI
            Build-Services
        }
        default {
            Write-Error "Unknown component: $Component. Valid: all, engine, web, gui, services"
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "=== Build Complete ===" -ForegroundColor Green
    Write-Host "All requested components built successfully." -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "=== Build Failed ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
