#!/bin/bash

# Sales Management System Deployment Script
# Linux/Mac Version

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to execute command with error handling
execute_command() {
    local command=$1
    local error_message=$2
    local success_message=$3
    
    print_color $CYAN "  Executing: $command"
    
    if eval "$command"; then
        print_color $GREEN "  ✓ $success_message"
        return 0
    else
        print_color $RED "  ✗ $error_message"
        return 1
    fi
}

# Show help
show_help() {
    echo "Sales Management System Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --skip-backend    Skip backend update (Laravel cache operations)"
    echo "  --force           Force deployment even if there are errors"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                    # Full deployment"
    echo "  ./deploy.sh --skip-backend     # Frontend only"
    echo "  ./deploy.sh --force            # Force deployment"
}

# Parse command line arguments
SKIP_BACKEND=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main deployment function
main() {
    echo -e "${PURPLE}========================================"
    echo "   SALES MANAGEMENT SYSTEM DEPLOYMENT"
    echo -e "========================================${NC}"
    echo ""

    # Check if we're in the correct directory
    if [ ! -f "package.json" ]; then
        print_color $RED "ERROR: package.json not found!"
        print_color $YELLOW "Please run this script from the sales-ui directory."
        read -p "Press Enter to exit"
        exit 1
    fi

    print_color $BLUE "Starting deployment process..."
    echo ""

    # Step 0: Git Stash (Frontend)
    print_color $YELLOW "Step 0: Stashing local changes (frontend)..."
    execute_command "git stash" "Git stash failed!" "Git stash completed successfully"
    echo ""

    # Step 1: Git Pull
    print_color $YELLOW "Step 1: Pulling latest changes from Git..."
    if ! execute_command "git pull" "Git pull failed!" "Git pull completed successfully"; then
        if [ "$FORCE" = false ]; then
            print_color $YELLOW "Please check your internet connection and try again."
            read -p "Press Enter to exit"
            exit 1
        fi
    fi
    echo ""

    # Step 2: Install/Update Dependencies
    print_color $YELLOW "Step 2: Installing/updating npm dependencies..."
    if ! execute_command "npm install" "npm install failed!" "Dependencies installed successfully"; then
        if [ "$FORCE" = false ]; then
            print_color $YELLOW "Please check your Node.js installation and try again."
            read -p "Press Enter to exit"
            exit 1
        fi
    fi
    echo ""

    # Step 3: Build Frontend
    print_color $YELLOW "Step 3: Building frontend application..."
    if ! execute_command "npm run build" "Frontend build failed!" "Frontend build completed successfully"; then
        if [ "$FORCE" = false ]; then
            print_color $YELLOW "Please check for any build errors and try again."
            read -p "Press Enter to exit"
            exit 1
        fi
    fi
    echo ""

    # Step 4: Backend Update (if not skipped and backend directory exists)
    if [ "$SKIP_BACKEND" = false ] && [ -d "../sales-api" ]; then
        print_color $YELLOW "Step 4: Updating backend..."
        
        # Save current directory
        CURRENT_DIR=$(pwd)
        
        # Change to backend directory
        cd ../sales-api
        
        # Step 0: Git Stash (Backend)
        print_color $YELLOW "  - Stashing local changes (backend)..."
        execute_command "git stash" "Backend git stash failed!" "Backend git stash completed"
        
        # Git pull for backend
        print_color $BLUE "  - Pulling backend changes..."
        if ! execute_command "git pull" "Backend git pull failed!" "Backend git pull completed"; then
            if [ "$FORCE" = false ]; then
                cd "$CURRENT_DIR"
                read -p "Press Enter to exit"
                exit 1
            fi
        fi
        
        # Check if PHP and Artisan are available
        if command_exists php; then
            # Clear Laravel caches
            print_color $BLUE "  - Clearing Laravel caches..."
            execute_command "php artisan cache:clear" "Cache clear failed" "Cache cleared" > /dev/null
            execute_command "php artisan config:clear" "Config clear failed" "Config cleared" > /dev/null
            execute_command "php artisan route:clear" "Route clear failed" "Route cleared" > /dev/null
            execute_command "php artisan view:clear" "View clear failed" "View cleared" > /dev/null
            
            # Re-cache configurations
            print_color $BLUE "  - Re-caching configurations..."
            execute_command "php artisan config:cache" "Config cache failed" "Config cached" > /dev/null
            execute_command "php artisan route:cache" "Route cache failed" "Route cached" > /dev/null
            execute_command "php artisan view:cache" "View cache failed" "View cached" > /dev/null
            
            print_color $GREEN "  ✓ Backend cache operations completed"
        else
            print_color $YELLOW "  ⚠ PHP not found, skipping Laravel cache operations"
        fi
        
        # Return to frontend directory
        cd "$CURRENT_DIR"
    elif [ "$SKIP_BACKEND" = true ]; then
        print_color $YELLOW "Step 4: Backend update skipped (--skip-backend flag)"
    else
        print_color $YELLOW "Step 4: Backend directory not found, skipping backend update"
        print_color $BLUE "  (If you have a backend, make sure it's in the parent directory as 'sales-api')"
    fi

    echo ""
    echo -e "${PURPLE}========================================"
    print_color $GREEN "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo -e "========================================${NC}"
    echo ""
    
    print_color $BLUE "What was updated:"
    echo "• Latest code changes pulled from Git"
    echo "• Frontend dependencies updated"
    echo "• Frontend application rebuilt"
    if [ "$SKIP_BACKEND" = false ] && [ -d "../sales-api" ]; then
        echo "• Backend caches cleared and re-cached"
    fi
    echo ""
    
    print_color $YELLOW "Next steps:"
    echo "• Test the application to ensure everything works correctly"
    echo "• Check the browser console for any errors"
    echo "• Verify that all features are functioning as expected"
    echo ""

    # Step 5: Git add, commit, push (Frontend)
    print_color $YELLOW "Step 5: Committing and pushing changes (frontend)..."
    execute_command "git add ." "Git add failed!" "Git add completed"
    execute_command "git commit -m 'deploy'" "Git commit failed or nothing to commit!" "Git commit completed"
    execute_command "git push" "Git push failed!" "Git push completed"
    echo ""

    print_color $GREEN "All deployment steps finished!"
    read -p "Press Enter to continue"
}

# Run the deployment
main 