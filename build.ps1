# ChoirMate Build Script for Production
Write-Host "Building ChoirMate for production..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install client dependencies!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "Step 3: Building client..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build client!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To test production build locally:" -ForegroundColor Cyan
Write-Host '  $env:NODE_ENV="production"' -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "To deploy:" -ForegroundColor Cyan
Write-Host "  1. See DEPLOYMENT.md for detailed instructions" -ForegroundColor White
Write-Host "  2. Recommended: Deploy to Render.com (FREE)" -ForegroundColor White
Write-Host "  3. Or use Railway, Heroku, or Docker" -ForegroundColor White
Write-Host ""
