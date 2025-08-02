# Deployment Scripts

This directory contains automated deployment scripts to easily update the Sales Management System on other computers.

## 📋 Overview

The deployment scripts automate the process of:
1. **Pulling latest changes** from Git repository
2. **Installing/updating dependencies** for the frontend
3. **Building the frontend application** with latest changes
4. **Updating the backend** (if present) and clearing/re-caching Laravel caches

## 🚀 Available Scripts

### Windows
- **`deploy.bat`** - Windows Batch script (Command Prompt)
- **`deploy.ps1`** - PowerShell script (PowerShell)

### Linux/Mac
- **`deploy.sh`** - Bash script (Terminal)

## 📖 Usage

### Windows (Command Prompt)
```cmd
# Full deployment
deploy.bat

# Or double-click the deploy.bat file
```

### Windows (PowerShell)
```powershell
# Full deployment
.\deploy.ps1

# Frontend only (skip backend)
.\deploy.ps1 -SkipBackend

# Force deployment (ignore errors)
.\deploy.ps1 -Force

# Show help
.\deploy.ps1 -Help
```

### Linux/Mac (Terminal)
```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Full deployment
./deploy.sh

# Frontend only (skip backend)
./deploy.sh --skip-backend

# Force deployment (ignore errors)
./deploy.sh --force

# Show help
./deploy.sh --help
```

## 🔧 Prerequisites

Before running the deployment scripts, ensure you have:

### Frontend Requirements
- **Node.js** (v16 or higher)
- **npm** (comes with Node.js)
- **Git** installed and configured

### Backend Requirements (if updating backend)
- **PHP** (v8.0 or higher)
- **Composer** (PHP package manager)
- **Laravel Artisan** (comes with Laravel)

## 📁 Directory Structure

The scripts expect the following directory structure:
```
parent-directory/
├── sales-ui/          # Frontend (React/Vite)
│   ├── package.json
│   ├── deploy.bat
│   ├── deploy.ps1
│   └── deploy.sh
└── sales-api/         # Backend (Laravel) - Optional
    ├── artisan
    └── ...
```

## ⚙️ What the Scripts Do

### Step 1: Git Pull
- Pulls the latest changes from the remote repository
- Updates both frontend and backend code

### Step 2: Install Dependencies
- Runs `npm install` to install/update frontend dependencies
- Ensures all required packages are available

### Step 3: Build Frontend
- Runs `npm run build` to create production build
- Generates optimized static files in the `dist/` directory

### Step 4: Backend Update (Optional)
- **Git Pull**: Updates backend code
- **Clear Caches**: Runs Laravel cache clearing commands:
  - `php artisan cache:clear`
  - `php artisan config:clear`
  - `php artisan route:clear`
  - `php artisan view:clear`
- **Re-cache**: Rebuilds Laravel caches:
  - `php artisan config:cache`
  - `php artisan route:cache`
  - `php artisan view:cache`

## 🎯 Features

### ✅ Error Handling
- Comprehensive error checking at each step
- Clear error messages with suggestions
- Graceful failure handling

### ✅ Visual Feedback
- Colored output for better readability
- Progress indicators for each step
- Success/failure status messages

### ✅ Flexibility
- Skip backend updates if needed
- Force deployment to ignore non-critical errors
- Automatic detection of backend directory

### ✅ Safety Checks
- Validates correct directory structure
- Checks for required tools (Node.js, PHP, Git)
- Confirms successful completion of each step

## 🚨 Troubleshooting

### Common Issues

#### "package.json not found"
- **Solution**: Make sure you're running the script from the `sales-ui` directory

#### "Git pull failed"
- **Solution**: Check your internet connection and Git credentials

#### "npm install failed"
- **Solution**: Verify Node.js installation and try running `npm install` manually

#### "Frontend build failed"
- **Solution**: Check for TypeScript/compilation errors in the code

#### "PHP not found"
- **Solution**: Install PHP or ensure it's in your system PATH

#### "Backend directory not found"
- **Solution**: This is normal if you don't have a backend. The script will skip backend operations.

### Manual Steps (if scripts fail)

If the automated scripts fail, you can perform the steps manually:

```bash
# Frontend
git pull
npm install
npm run build

# Backend (if applicable)
cd ../sales-api
git pull
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## 📝 Notes

- The scripts are designed to be **safe** and **reversible**
- They don't modify your database or configuration files
- All operations are logged and visible in the console
- The scripts can be run multiple times safely

## 🔄 Regular Updates

To keep your system up to date, run the deployment script regularly:
- **Daily**: For active development environments
- **Weekly**: For production systems
- **As needed**: When you know new features are available

## 📞 Support

If you encounter issues with the deployment scripts:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Try running the manual steps
4. Check the console output for specific error messages 