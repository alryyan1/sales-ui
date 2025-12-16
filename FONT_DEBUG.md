# Font Debugging Guide

## Current Setup
- ✅ Font files are in `/public/fonts/` directory (TTF format)
- ✅ CSS file is at `/src/fonts/tajawal.css`
- ✅ CSS is imported in `main.tsx`

## Troubleshooting Steps

### 1. Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### 2. Clear Browser Cache
- Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac) for hard refresh
- Or open DevTools → Network tab → Check "Disable cache"

### 3. Check Browser Console
Open browser DevTools (F12) and check:
- **Console tab**: Look for any font loading errors
- **Network tab**: Filter by "Font" and check if font files are loading (status should be 200)
- **Network tab**: Look for requests to `/fonts/Tajawal-*.ttf`

### 4. Verify Font Files
Make sure these files exist in `/public/fonts/`:
- Tajawal-Regular.ttf
- Tajawal-Bold.ttf
- Tajawal-Medium.ttf
- Tajawal-Light.ttf
- Tajawal-ExtraLight.ttf
- Tajawal-ExtraBold.ttf
- Tajawal-Black.ttf

### 5. Test Font Loading
Open browser console and run:
```javascript
// Check if font is loaded
document.fonts.check('16px Tajawal')

// List all loaded fonts
document.fonts.forEach(font => console.log(font.family, font.weight))
```

### 6. Check CSS Application
In browser DevTools:
- **Elements tab**: Inspect any text element
- **Computed tab**: Check if `font-family` shows "Tajawal"
- If it shows fallback fonts (Arial, sans-serif), the font isn't loading

## Common Issues

### Issue: Font files return 404
**Solution**: Make sure files are in `/public/fonts/` (not `/src/fonts/`)

### Issue: Font loads but doesn't apply
**Solution**: 
- Check if `font-family: "Tajawal"` is set in theme/index.css
- Verify MUI theme has `fontFamily: '"Tajawal", "Arial", sans-serif'`

### Issue: Bold text still looks wrong
**Solution**: 
- Make sure `Tajawal-Bold.ttf` exists
- Check browser DevTools → Network to see if Bold font is loading
- Verify `font-weight: 700` is being used (not browser-synthesized bold)

## Quick Fix: Test Direct Font Loading

Add this to browser console to test:
```javascript
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/src/fonts/tajawal.css';
document.head.appendChild(link);
```

Then check if fonts load.

