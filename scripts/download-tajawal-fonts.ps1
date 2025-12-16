# PowerShell script to download Tajawal font files
# Run this script from the project root: .\scripts\download-tajawal-fonts.ps1

$fontsDir = Join-Path $PSScriptRoot "..\public\fonts"
$fontsDir = Resolve-Path $fontsDir

# Create fonts directory if it doesn't exist
if (-not (Test-Path $fontsDir)) {
    New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null
    Write-Host "Created fonts directory: $fontsDir" -ForegroundColor Green
}

# Font URLs from Google Fonts CDN
$fontFiles = @{
    "Tajawal-ExtraLight.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-Light.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-Regular.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-Medium.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-Bold.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-ExtraBold.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
    "Tajawal-Black.woff2" = "https://fonts.gstatic.com/s/tajawal/v9/Iurf6YBj_oCad4k1l_6gHrFpiZ-H.woff2"
}

Write-Host "`nDownloading Tajawal font files..." -ForegroundColor Cyan
Write-Host "Note: The URLs above are placeholders. Please download fonts manually from:" -ForegroundColor Yellow
Write-Host "https://fonts.google.com/specimen/Tajawal" -ForegroundColor Yellow
Write-Host "`nAfter downloading, extract and copy the .woff2 files to: $fontsDir" -ForegroundColor Yellow

# Alternative: Use a font downloader or manual download
Write-Host "`nFor automated download, you can use:" -ForegroundColor Cyan
Write-Host "1. Visit: https://fonts.google.com/specimen/Tajawal" -ForegroundColor White
Write-Host "2. Click 'Download family'" -ForegroundColor White
Write-Host "3. Extract the ZIP" -ForegroundColor White
Write-Host "4. Copy all .woff2 files to: $fontsDir" -ForegroundColor White

