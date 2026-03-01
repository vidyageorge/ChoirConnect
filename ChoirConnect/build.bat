@echo off
echo Building ChoirMate for production...
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 goto error

echo.
echo Step 2: Installing client dependencies...
cd client
call npm install
if errorlevel 1 goto error

echo.
echo Step 3: Building client...
call npm run build
if errorlevel 1 goto error

cd ..

echo.
echo ========================================
echo Build complete! 
echo ========================================
echo.
echo To test production build locally:
echo   SET NODE_ENV=production
echo   npm start
echo.
echo To deploy:
echo   1. See DEPLOYMENT.md for detailed instructions
echo   2. Recommended: Deploy to Render.com (FREE)
echo   3. Or use Railway, Heroku, or Docker
echo.
pause
goto end

:error
echo.
echo ========================================
echo Build failed! Please check the errors above.
echo ========================================
pause

:end
