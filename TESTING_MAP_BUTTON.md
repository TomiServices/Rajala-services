# Testing Guide: 'Avaa kartta' Button

This document provides a comprehensive testing guide for the 'Avaa kartta' (Open map) button functionality.

## What Was Fixed

1. **Button now points to Fixnero's actual location** using the business name and address instead of random coordinates
2. **iOS devices now show map app chooser** allowing users to select between Apple Maps and Google Maps
3. **Cross-browser compatibility** ensured for Safari, Chrome, Firefox, and Edge
4. **Consistent behavior** across all platforms with appropriate fallbacks

## Test Scenarios

### Test 1: iOS Devices (iPhone/iPad)

**Expected Behavior:**
- When clicking the "📍 Avaa kartta sovelluksessa" button, iOS should present a dialog asking which app to use
- Options should include: Apple Maps, Google Maps (if installed), or open in Safari

**Test Steps:**
1. Open https://rajala-services.com on an iPhone or iPad
2. Scroll to the bottom of the page to the map section
3. Click the "📍 Avaa kartta sovelluksessa" button
4. Verify that iOS shows a dialog with app choices

**How to Verify:**
- The URL should start with `maps.apple.com`
- The location should be "Fixnero Oy, Tiilenvalajantie 6, 02330 Espoo"
- The map should center on Fixnero's location in Kivenlahti, Espoo

### Test 2: Android Devices

**Expected Behavior:**
- When clicking the button, Android should allow choosing between installed map apps
- Google Maps, Waze, or other navigation apps should be options

**Test Steps:**
1. Open https://rajala-services.com on an Android device
2. Scroll to the map section
3. Click the "📍 Avaa kartta sovelluksessa" button
4. Verify that Android shows app chooser or opens Google Maps

**How to Verify:**
- The URL should be a Google Maps directions URL
- Destination should be "Fixnero Oy, Tiilenvalajantie 6, 02330 Espoo"
- Location should be accurate

### Test 3: Desktop Browsers (Chrome, Firefox, Safari, Edge)

**Expected Behavior:**
- Button should open Google Maps in a new browser tab
- Original tab should remain open

**Test Steps:**
1. Open https://rajala-services.com in a desktop browser
2. Scroll to the map section
3. Click the "📍 Avaa kartta sovelluksessa" button
4. Verify a new tab opens with Google Maps

**How to Verify:**
- New tab should open automatically
- Google Maps should show Fixnero Oy location
- Search query should be "Fixnero Oy, Tiilenvalajantie 6, 02330 Espoo"
- Location pin should be at the correct address

### Test 4: Fallback Scenario (Map Iframe Fails to Load)

**Expected Behavior:**
- If the embedded map fails to load, a fallback message appears
- The fallback link should work the same as the main button

**Test Steps:**
1. Use browser dev tools to block Google Maps domain
2. Reload the page
3. Verify the fallback message appears
4. Click the fallback link
5. Verify it opens correctly

### Test 5: Browser Compatibility

**Browsers to Test:**
- Safari (iOS and macOS)
- Chrome (iOS, Android, Windows, macOS)
- Firefox (Android, Windows, macOS)
- Edge (Windows)
- Samsung Internet (Android)

**Expected Behavior:**
- All browsers should handle the button correctly
- No JavaScript errors in console
- Smooth navigation to map apps

### Test 6: No JavaScript Scenario

**Expected Behavior:**
- Even without JavaScript, the button href should work
- It should open Google Maps search with the business location

**Test Steps:**
1. Disable JavaScript in browser settings
2. Open https://rajala-services.com
3. Click the map button
4. Verify it still opens Google Maps (may not have app chooser)

## Verification Checklist

- [ ] iOS devices show app chooser (Apple Maps vs Google Maps)
- [ ] Android devices can choose between map apps
- [ ] Desktop browsers open Google Maps in new tab
- [ ] Location is accurate (Tiilenvalajantie 6, 02330 Espoo)
- [ ] No JavaScript errors in browser console
- [ ] Button works on Safari (iOS and macOS)
- [ ] Button works on Chrome (all platforms)
- [ ] Button works on Firefox
- [ ] Fallback link works if iframe fails
- [ ] Button works without JavaScript (basic functionality)

## URLs to Verify

After clicking the button, verify the URL contains:

**iOS:**
```
https://maps.apple.com/?q=Fixnero%20Oy&address=Tiilenvalajantie%206%2C%2002330%20Espoo&ll=60.1699,24.6384
```

**Android/Mobile:**
```
https://www.google.com/maps/dir/?api=1&destination=Fixnero%20Oy%2C%20Tiilenvalajantie%206%2C%2002330%20Espoo
```

**Desktop:**
```
https://www.google.com/maps/search/?api=1&query=Fixnero%20Oy%2C%20Tiilenvalajantie%206%2C%2002330%20Espoo
```

## Common Issues and Solutions

### Issue 1: iOS doesn't show app chooser
**Solution:** Ensure you're testing on actual iOS device, not simulator. Simulator may not have multiple map apps.

### Issue 2: Button redirects away from site
**Solution:** This is expected on mobile. The map app should open and then you can return to the browser.

### Issue 3: Location is incorrect
**Solution:** Verify the coordinates in the code match: `60.1699, 24.6384`

### Issue 4: Button doesn't work in Safari
**Solution:** Check browser console for JavaScript errors. Ensure the script is loading correctly.

## Success Criteria

The fix is successful if:
1. ✅ iOS users can choose between Apple Maps and Google Maps
2. ✅ Android users can choose between installed map apps
3. ✅ Desktop users get Google Maps in a new tab
4. ✅ Location always points to Fixnero Oy at Tiilenvalajantie 6, 02330 Espoo
5. ✅ Works across all major browsers (Safari, Chrome, Firefox, Edge)
6. ✅ No JavaScript errors
7. ✅ Button has proper accessibility attributes
8. ✅ Fallback link works correctly

## Additional Notes

- The button uses feature detection to determine the best map URL format for each platform
- `window.open(url, '_self')` is used on mobile to trigger the native app chooser
- `window.open(url, '_blank')` is used on desktop to open in a new tab
- The href attribute provides fallback functionality when JavaScript is disabled
