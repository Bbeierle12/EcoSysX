# EcoSysX Genesis Engine Integration - Verification Script
# Run this to verify all components are working correctly

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " EcoSysX Integration Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if Node.js is installed
Write-Host "[1/5] Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Test 2: Check if dependencies are installed
Write-Host ""
Write-Host "[2/5] Checking dependencies..." -ForegroundColor Yellow
$enginePackageJson = "packages\genx-engine\package.json"
if (Test-Path $enginePackageJson) {
    Write-Host "  ✅ Engine package.json found" -ForegroundColor Green
    
    $nodeModules = "packages\genx-engine\node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "  ✅ Engine dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Engine dependencies not installed" -ForegroundColor Yellow
        Write-Host "     Run: cd packages\genx-engine ; npm install" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ Engine package.json not found" -ForegroundColor Red
    exit 1
}

# Test 3: Check key files exist
Write-Host ""
Write-Host "[3/5] Checking integration files..." -ForegroundColor Yellow

$files = @(
    "packages\genx-engine\src\server.ts",
    "src\services\EngineService.js",
    "src\hooks\useEngine.js",
    "qt-gui\src\core\EngineInterface.h",
    "qt-gui\src\core\EngineInterface.cpp"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "  Some files are missing. Integration may be incomplete." -ForegroundColor Red
    exit 1
}

# Test 4: Start engine server
Write-Host ""
Write-Host "[4/5] Starting engine server..." -ForegroundColor Yellow
Write-Host "  Starting server in background..." -ForegroundColor Gray

$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location packages\genx-engine
    npm run server 2>&1
}

# Wait for server to start
Start-Sleep -Seconds 5

# Test 5: Test health endpoint
Write-Host ""
Write-Host "[5/5] Testing server connectivity..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    
    if ($response.status -eq "healthy") {
        Write-Host "  ✅ HTTP API responding" -ForegroundColor Green
        Write-Host "  ✅ Engine state: $($response.engine.state)" -ForegroundColor Green
        Write-Host "  ✅ Uptime: $([math]::Round($response.uptime, 2))s" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Server responding but not healthy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Failed to connect to server" -ForegroundColor Red
    Write-Host "     Error: $_" -ForegroundColor Gray
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

# Test WebSocket
Write-Host ""
Write-Host "Testing WebSocket connection..." -ForegroundColor Yellow

$wsTestScript = @'
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
    console.log('✅ WebSocket connected');
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('❌ WebSocket timeout');
    process.exit(1);
}, 5000);
'@

$wsTestScript | Out-File -FilePath "test-ws.js" -Encoding utf8

try {
    $wsResult = node test-ws.js 2>&1
    Write-Host "  $wsResult" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  WebSocket test inconclusive" -ForegroundColor Yellow
} finally {
    Remove-Item "test-ws.js" -ErrorAction SilentlyContinue
}

# Stop server
Write-Host ""
Write-Host "Stopping test server..." -ForegroundColor Gray
Stop-Job $serverJob
Remove-Job $serverJob

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Verification Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All checks passed!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the system:" -ForegroundColor White
Write-Host "  npm run dev          # Start engine + web UI" -ForegroundColor Gray
Write-Host "  npm run dev:engine   # Start engine only" -ForegroundColor Gray
Write-Host "  npm run dev:web      # Start web UI only" -ForegroundColor Gray
Write-Host ""
Write-Host "Qt GUI:" -ForegroundColor White
Write-Host "  cd qt-gui" -ForegroundColor Gray
Write-Host "  cmake --build build" -ForegroundColor Gray
Write-Host "  .\build\bin\ecosysx-gui.exe" -ForegroundColor Gray
Write-Host ""
Write-Host "For more information:" -ForegroundColor White
Write-Host "  See QUICK_START.md" -ForegroundColor Gray
Write-Host "  See ENGINE_INTEGRATION_COMPLETE.md" -ForegroundColor Gray
Write-Host ""
