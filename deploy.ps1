# Sales Management System Deployment Script
# PowerShell Version

param(
    [switch]$SkipBackend,
    [switch]$Force,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host @"
Sales Management System Deployment Script

Usage: .\deploy.ps1 [options]

Options:
    -SkipBackend    Skip backend update (Laravel cache operations)
    -Force          Force deployment even if there are errors
    -Help           Show this help message

Examples:
    .\deploy.ps1                    # Full deployment
    .\deploy.ps1 -SkipBackend       # Frontend only
    .\deploy.ps1 -Force             # Force deployment
"@
    exit 0
}

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to execute command with error handling
function Invoke-CommandWithErrorHandling {
    param(
        [string]$Command,
        [string]$ErrorMessage,
        [string]$SuccessMessage
    )
    
    Write-ColorOutput "  Executing: $Command" "Cyan"
    
    try {
        $result = Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✓ $SuccessMessage" "Green"
            return $true
        } else {
            Write-ColorOutput "  ✗ $ErrorMessage" "Red"
            return $false
        }
    }
    catch {
        Write-ColorOutput "  ✗ $ErrorMessage" "Red"
        Write-ColorOutput "  Error: $($_.Exception.Message)" "Red"
        return $false
    }
}

# Main deployment function
function Start-Deployment {
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "   SALES MANAGEMENT SYSTEM DEPLOYMENT" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""

    # Check if we're in the correct directory
    if (-not (Test-Path "package.json")) {
        Write-ColorOutput "ERROR: package.json not found!" "Red"
        Write-ColorOutput "Please run this script from the sales-ui directory." "Yellow"
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-ColorOutput "Starting deployment process..." "Blue"
    Write-Host ""

    # Step 1: Git Pull
    Write-ColorOutput "Step 1: Pulling latest changes from Git..." "Yellow"
    if (-not (Invoke-CommandWithErrorHandling -Command "git pull" -ErrorMessage "Git pull failed!" -SuccessMessage "Git pull completed successfully")) {
        if (-not $Force) {
            Write-ColorOutput "Please check your internet connection and try again." "Yellow"
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    Write-Host ""

    # Step 2: Install/Update Dependencies
    Write-ColorOutput "Step 2: Installing/updating npm dependencies..." "Yellow"
    if (-not (Invoke-CommandWithErrorHandling -Command "npm install" -ErrorMessage "npm install failed!" -SuccessMessage "Dependencies installed successfully")) {
        if (-not $Force) {
            Write-ColorOutput "Please check your Node.js installation and try again." "Yellow"
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    Write-Host ""

    # Step 3: Build Frontend
    Write-ColorOutput "Step 3: Building frontend application..." "Yellow"
    if (-not (Invoke-CommandWithErrorHandling -Command "npm run build" -ErrorMessage "Frontend build failed!" -SuccessMessage "Frontend build completed successfully")) {
        if (-not $Force) {
            Write-ColorOutput "Please check for any build errors and try again." "Yellow"
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    Write-Host ""

    # Step 4: Backend Update (if not skipped and backend directory exists)
    if (-not $SkipBackend -and (Test-Path "..\sales-api")) {
        Write-ColorOutput "Step 4: Updating backend..." "Yellow"
        
        # Save current directory
        $currentDir = Get-Location
        
        # Change to backend directory
        Set-Location "..\sales-api"
        
        # Git pull for backend
        Write-ColorOutput "  - Pulling backend changes..." "Blue"
        if (-not (Invoke-CommandWithErrorHandling -Command "git pull" -ErrorMessage "Backend git pull failed!" -SuccessMessage "Backend git pull completed")) {
            if (-not $Force) {
                Set-Location $currentDir
                Read-Host "Press Enter to exit"
                exit 1
            }
        }
        
        # Check if PHP and Artisan are available
        if (Test-Command "php") {
            # Clear Laravel caches
            Write-ColorOutput "  - Clearing Laravel caches..." "Blue"
            Invoke-CommandWithErrorHandling -Command "php artisan cache:clear" -ErrorMessage "Cache clear failed" -SuccessMessage "Cache cleared" | Out-Null
            Invoke-CommandWithErrorHandling -Command "php artisan config:clear" -ErrorMessage "Config clear failed" -SuccessMessage "Config cleared" | Out-Null
            Invoke-CommandWithErrorHandling -Command "php artisan route:clear" -ErrorMessage "Route clear failed" -SuccessMessage "Route cleared" | Out-Null
            Invoke-CommandWithErrorHandling -Command "php artisan view:clear" -ErrorMessage "View clear failed" -SuccessMessage "View cleared" | Out-Null
            
            # Re-cache configurations
            Write-ColorOutput "  - Re-caching configurations..." "Blue"
            Invoke-CommandWithErrorHandling -Command "php artisan config:cache" -ErrorMessage "Config cache failed" -SuccessMessage "Config cached" | Out-Null
            Invoke-CommandWithErrorHandling -Command "php artisan route:cache" -ErrorMessage "Route cache failed" -SuccessMessage "Route cached" | Out-Null
            Invoke-CommandWithErrorHandling -Command "php artisan view:cache" -ErrorMessage "View cache failed" -SuccessMessage "View cached" | Out-Null
            
            Write-ColorOutput "  ✓ Backend cache operations completed" "Green"
        } else {
            Write-ColorOutput "  ⚠ PHP not found, skipping Laravel cache operations" "Yellow"
        }
        
        # Return to frontend directory
        Set-Location $currentDir
    } elseif ($SkipBackend) {
        Write-ColorOutput "Step 4: Backend update skipped (--skip-backend flag)" "Yellow"
    } else {
        Write-ColorOutput "Step 4: Backend directory not found, skipping backend update" "Yellow"
        Write-ColorOutput "  (If you have a backend, make sure it's in the parent directory as 'sales-api')" "Blue"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-ColorOutput "DEPLOYMENT COMPLETED SUCCESSFULLY!" "Green"
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    
    Write-ColorOutput "What was updated:" "Blue"
    Write-Host "• Latest code changes pulled from Git"
    Write-Host "• Frontend dependencies updated"
    Write-Host "• Frontend application rebuilt"
    if (-not $SkipBackend -and (Test-Path "..\sales-api")) {
        Write-Host "• Backend caches cleared and re-cached"
    }
    Write-Host ""
    
    Write-ColorOutput "Next steps:" "Yellow"
    Write-Host "• Test the application to ensure everything works correctly"
    Write-Host "• Check the browser console for any errors"
    Write-Host "• Verify that all features are functioning as expected"
    Write-Host ""
    
    Read-Host "Press Enter to continue"
}

# Run the deployment
Start-Deployment 