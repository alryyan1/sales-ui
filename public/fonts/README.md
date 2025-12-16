# Tajawal Font Files - Local Installation Guide

## Quick Setup Instructions

### Option 1: Download from Google Fonts (Recommended)

1. **Visit Google Fonts:**
   - Go to: https://fonts.google.com/specimen/Tajawal
   - Click the **"Download family"** button (top right)

2. **Extract and Copy Files:**
   - Extract the downloaded ZIP file
   - Navigate to the `static` folder inside the extracted files
   - Copy all `.woff2` files to this directory (`/public/fonts/`)

3. **Required Files:**
   You need these 7 font files (all weights):
   - `Tajawal-ExtraLight.woff2` → weight: 200
   - `Tajawal-Light.woff2` → weight: 300
   - `Tajawal-Regular.woff2` → weight: 400
   - `Tajawal-Medium.woff2` → weight: 500
   - `Tajawal-Bold.woff2` → weight: 700 ⭐ **Important for bold text**
   - `Tajawal-ExtraBold.woff2` → weight: 800
   - `Tajawal-Black.woff2` → weight: 900

### Option 2: Use Google Web Fonts Helper

1. Visit: https://gwfh.mranftl.com/fonts/tajawal
2. Select all weights: 200, 300, 400, 500, 700, 800, 900
3. Select "woff2" format
4. Copy the CSS and download the files
5. Place all `.woff2` files in this directory

## File Structure

After downloading, your directory structure should be:
```
public/
  fonts/
    ├── Tajawal-ExtraLight.woff2
    ├── Tajawal-Light.woff2
    ├── Tajawal-Regular.woff2
    ├── Tajawal-Medium.woff2
    ├── Tajawal-Bold.woff2          ← Critical for bold text
    ├── Tajawal-ExtraBold.woff2
    └── Tajawal-Black.woff2
```

## Why This Fixes Bold Text Issues

When you use `font-weight: bold` or `fontWeight: 700`, the browser needs the actual bold font file (`Tajawal-Bold.woff2`). Without it, the browser tries to synthesize bold by making the regular font thicker, which looks inconsistent.

With all font weights properly installed:
- ✅ Regular text uses `Tajawal-Regular.woff2` (weight 400)
- ✅ Bold text uses `Tajawal-Bold.woff2` (weight 700)
- ✅ All weights render consistently

## Verification

After placing the files:

1. Restart your development server
2. Check browser DevTools → Network tab
3. Look for font file requests to `/fonts/Tajawal-*.woff2`
4. Test bold text - it should now look consistent with regular text

## Troubleshooting

- **Fonts not loading?** Check browser console for 404 errors
- **Still seeing synthesized bold?** Clear browser cache and hard refresh (Ctrl+Shift+R)
- **Files not found?** Verify file names match exactly (case-sensitive)

