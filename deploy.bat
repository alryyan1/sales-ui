@echo off
echo ========================================
echo    SALES MANAGEMENT SYSTEM DEPLOYMENT
echo ========================================
echo.

:: Set colors for output
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

:: Check if we're in the correct directory
if not exist "package.json" (
    echo %RED%ERROR: package.json not found!%RESET%
    echo Please run this script from the sales-ui directory.
    pause
    exit /b 1
)

echo %BLUE%Starting deployment process...%RESET%
echo.

:: Step 1: Git Pull
echo %YELLOW%Step 1: Pulling latest changes from Git...%RESET%
git pull
if %errorlevel% neq 0 (
    echo %RED%ERROR: Git pull failed!%RESET%
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo %GREEN%✓ Git pull completed successfully%RESET%
echo.

:: Step 2: Install/Update Dependencies
echo %YELLOW%Step 2: Installing/updating npm dependencies...%RESET%
npm install
if %errorlevel% neq 0 (
    echo %RED%ERROR: npm install failed!%RESET%
    echo Please check your Node.js installation and try again.
    pause
    exit /b 1
)
echo %GREEN%✓ Dependencies installed successfully%RESET%
echo.

:: Step 3: Build Frontend
echo %YELLOW%Step 3: Building frontend application...%RESET%
npm run build
if %errorlevel% neq 0 (
    echo %RED%ERROR: Frontend build failed!%RESET%
    echo Please check for any build errors and try again.
    pause
    exit /b 1
)
echo %GREEN%✓ Frontend build completed successfully%RESET%
echo.

:: Step 4: Backend Update (if backend directory exists)
if exist "..\sales-api" (
    echo %YELLOW%Step 4: Updating backend...%RESET%
    cd ..\sales-api
    
    :: Git pull for backend
    echo %BLUE%  - Pulling backend changes...%RESET%
    git pull
    if %errorlevel% neq 0 (
        echo %RED%ERROR: Backend git pull failed!%RESET%
        cd ..\sales-ui
        pause
        exit /b 1
    )
    echo %GREEN%  ✓ Backend git pull completed%RESET%
    
    :: Clear Laravel caches
    echo %BLUE%  - Clearing Laravel caches...%RESET%
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    
    :: Re-cache configurations
    echo %BLUE%  - Re-caching configurations...%RESET%
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    
    echo %GREEN%  ✓ Backend cache operations completed%RESET%
    
    :: Return to frontend directory
    cd ..\sales-ui
) else (
    echo %YELLOW%Step 4: Backend directory not found, skipping backend update%RESET%
    echo %BLUE%  (If you have a backend, make sure it's in the parent directory as 'sales-api')%RESET%
)

echo.
echo ========================================
echo %GREEN%DEPLOYMENT COMPLETED SUCCESSFULLY!%RESET%
echo ========================================
echo.
echo %BLUE%What was updated:%RESET%
echo • Latest code changes pulled from Git
echo • Frontend dependencies updated
echo • Frontend application rebuilt
echo • Backend caches cleared and re-cached (if backend exists)
echo.
echo %YELLOW%Next steps:%RESET%
echo • Test the application to ensure everything works correctly
echo • Check the browser console for any errors
echo • Verify that all features are functioning as expected
echo.
pause 