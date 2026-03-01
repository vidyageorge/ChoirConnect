@echo off
echo ========================================
echo    ChoirConnect - Starting Application
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing...
    echo.
    call npm run install-all
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

REM Check if client node_modules exists
if not exist "client\node_modules\" (
    echo [INFO] Client dependencies not found. Installing...
    echo.
    call npm run install-all
    if errorlevel 1 (
        echo [ERROR] Failed to install client dependencies!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Starting ChoirConnect...
echo.
echo Frontend will be available at: http://localhost:5173
echo Backend API will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the application
echo.

call npm run dev

pause

