# ChoirConnect - PowerShell Run Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ChoirConnect - Starting Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Dependencies not found. Installing..." -ForegroundColor Yellow
    Write-Host ""
    npm run install-all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

# Check if client node_modules exists
if (-not (Test-Path "client\node_modules")) {
    Write-Host "[INFO] Client dependencies not found. Installing..." -ForegroundColor Yellow
    Write-Host ""
    npm run install-all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install client dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host "[INFO] Starting ChoirConnect..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend will be available at: " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API will be available at: " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
Write-Host ""

npm run dev

Read-Host "Press Enter to exit"

