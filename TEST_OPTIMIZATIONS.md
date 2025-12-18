# JavaScript Optimization Testing Guide

This document provides step-by-step instructions to test all implemented JavaScript optimizations.

## Prerequisites

1. Deploy the updated code to a test environment or run locally
2. Open browser DevTools (F12)
3. Have Chrome Lighthouse extension or use DevTools Lighthouse tab

## Test 1: Lazy Load reCAPTCHA ✓

**Goal:** Verify reCAPTCHA only loads when user scrolls near booking form

### Steps:
1. Open `index.html` in browser
2. Open DevTools Network tab
3. Filter by "recaptcha" in the network requests
4. **Initial Load:** Verify NO reCAPTCHA requests are made
5. Scroll down to the booking section (#varaa-aika)
6. **After Scroll:** Verify reCAPTCHA script loads
7. Check console for "reCAPTCHA loaded" messages

### Expected Results:
- ✅ reCAPTCHA does NOT load on initial page load
- ✅ reCAPTCHA loads when scrolling within 200px of booking form
- ✅ reCAPTCHA loads on clicking booking section
- ✅ Booking form functionality works normally

### Performance Check:
```javascript
// In browser console BEFORE scrolling to booking:
typeof grecaptcha === 'undefined' // Should return: true

// After scrolling to booking section:
typeof grecaptcha !== 'undefined' // Should return: true
```

---

## Test 2: Inline Critical JavaScript ✓

**Goal:** Verify critical functions work immediately without external JS

### Test 2A: Smooth Scroll Function

#### Steps:
1. Open `index.html` in browser
2. Open DevTools Console
3. **Immediately** (before any JS loads), type:
   ```javascript
   typeof window.scrollToSection === 'function'
   ```
4. Click any navigation link with `#` anchor
5. Verify smooth scrolling works

#### Expected Results:
- ✅ `scrollToSection` function is defined immediately
- ✅ Smooth scrolling works on page load
- ✅ Navigation links scroll smoothly

### Test 2B: Hamburger Menu

#### Steps:
1. Resize browser to mobile width (< 1279px) or use mobile device
2. **Mouse Test:** Click hamburger menu icon
3. Verify menu opens/closes
4. **Keyboard Test:** Tab to hamburger menu
5. Press Enter or Space key
6. Verify menu opens/closes

#### Expected Results:
- ✅ Hamburger menu works immediately on page load
- ✅ Click functionality works
- ✅ Keyboard navigation (Enter/Space) works
- ✅ ARIA attributes update correctly (`aria-expanded`)

---

## Test 3: Minified Files Loaded ✓

**Goal:** Verify minified files are served correctly

### Steps:
1. Open `index.html` in browser
2. Open DevTools Network tab
3. Filter by ".js" files
4. Verify the following files load:
   - `ui-interactions.min.js` (should be ~3.2KB)
   - `booking-system.min.js` (should be ~31KB)
   - `cookie-consent.min.js` (should be ~7.9KB)
5. Check response size in Network tab

### Expected Results:
- ✅ All `.min.js` files load successfully
- ✅ File sizes match expected values
- ✅ All functionality works with minified files
- ✅ No JavaScript errors in console

---

## Test 4: Analytics Deferred with requestIdleCallback ✓

**Goal:** Verify Google Analytics loads only when browser is idle

### Steps:
1. Open `index.html` in browser
2. **Cookie Banner:** Accept cookies when prompted
3. Open DevTools Network tab
4. Filter by "gtag" or "analytics"
5. Observe timing of analytics request

### Expected Results:
- ✅ Analytics does NOT load immediately
- ✅ Analytics loads after ~2 seconds (idle time)
- ✅ Cookie consent banner appears
- ✅ Analytics only loads after accepting cookies

### Performance Check:
```javascript
// In browser console:
// Check timing - should show delay
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('gtag'))
  .map(r => ({ name: r.name, startTime: r.startTime }))
```

---

## Test 5: Overall Performance - Lighthouse Audit ✓

**Goal:** Measure actual performance improvements

### Steps:
1. Open `index.html` in Chrome browser
2. Open DevTools (F12)
3. Go to "Lighthouse" tab
4. Select:
   - ✅ Performance
   - ✅ Desktop or Mobile
   - ✅ Clear storage (optional but recommended)
5. Click "Generate report"
6. Wait for audit to complete

### Metrics to Check:

#### JavaScript Metrics:
- **JavaScript execution time:** Target < 1.5s (was 2.7s)
- **Total Blocking Time:** Should be reduced
- **Unused JavaScript:** Target < 100 KiB (was 210 KiB)

#### Performance Score:
- **Before:** Baseline (note current score)
- **After:** Should increase by +10-15 points

### Expected Improvements:
```
Metric                      Before    Target    Improvement
─────────────────────────────────────────────────────────────
JavaScript execution        2.7s      ~1.2s     -56%
Main thread work            7.4s      ~4.5s     -39%
Unused JavaScript          210 KB     ~80 KB    -62%
Performance Score           XX        XX+15     +10-15 pts
```

---

## Test 6: Functionality Verification ✓

**Goal:** Ensure all features still work correctly

### Checklist:

#### Navigation:
- [ ] Hamburger menu opens/closes (mobile)
- [ ] Smooth scrolling works on all links
- [ ] Navigation links highlight active section
- [ ] Back button works correctly

#### Booking System:
- [ ] Calendar loads and displays correctly
- [ ] Date selection works
- [ ] Time slot selection works
- [ ] Service selection dropdown works
- [ ] Form submission works
- [ ] reCAPTCHA validation works

#### Cookie Consent:
- [ ] Banner appears on first visit
- [ ] "Accept" button works
- [ ] "Reject" button works
- [ ] Analytics loads after acceptance
- [ ] Choice is remembered across page reloads

---

## Test 7: Browser Compatibility ✓

**Goal:** Verify optimizations work across browsers

### Browsers to Test:
- [ ] Chrome/Edge (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest - Mac/iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Features to Verify:
- [ ] IntersectionObserver (reCAPTCHA lazy load)
- [ ] requestIdleCallback (analytics defer)
- [ ] Fallback to setTimeout works in older browsers

---

## Debugging Tips

### reCAPTCHA Not Loading:
1. Check console for errors
2. Verify `#varaa-aika` element exists in HTML
3. Try clicking on booking section to trigger load
4. Check Network tab for blocked requests

### Inline Functions Not Working:
1. Check if scripts are in correct order
2. Verify no JavaScript syntax errors
3. Check browser console for errors

### Minified Files Not Loading:
1. Clear browser cache
2. Do hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check file paths are correct
4. Verify files exist on server

### Analytics Not Loading:
1. Verify cookie consent was accepted
2. Check console for requestIdleCallback support
3. Wait at least 2 seconds for idle callback
4. Check Network tab for blocked requests

---

## Performance Measurement Commands

### Check File Sizes:
```bash
ls -lh *.min.js
```

### Re-minify if needed:
```bash
terser ui-interactions.js -o ui-interactions.min.js --compress --mangle --comments false
terser cookie-consent.js -o cookie-consent.min.js --compress --mangle --comments false
terser booking-system.js -o booking-system.min.js --compress --mangle --comments false
```

### Validate HTML:
```bash
# Use W3C Validator or
npx html-validate index.html
```

---

## Success Criteria

All optimizations are successful if:

✅ **Lazy Load reCAPTCHA**
- reCAPTCHA loads only when needed
- Booking form functionality works
- Saves ~50KB + 0.8s execution time

✅ **Minified Files**
- All .min.js files load correctly
- Total savings: 66.2KB (62% reduction)
- No functionality broken

✅ **Inline Critical JS**
- Hamburger menu works immediately
- Smooth scroll available instantly
- Both click and keyboard navigation work

✅ **Analytics Deferred**
- Analytics loads in idle time
- Cookie consent respected
- No impact on critical rendering

✅ **Performance Improvements**
- Lighthouse score increased by +10-15 points
- JavaScript execution time reduced by ~50%
- Main thread work reduced by ~35%
- Unused JavaScript reduced by ~60%

✅ **All Functionality Works**
- Navigation works correctly
- Booking system functions properly
- Cookie consent operates as expected
- Cross-browser compatibility maintained

---

## Reporting Issues

If any test fails:

1. Document which test failed
2. Include browser/device information
3. Copy console error messages
4. Take screenshots if applicable
5. Note steps to reproduce
6. Check JS_OPTIMIZATION_SUMMARY.md for troubleshooting

---

## Next Steps After Testing

1. ✅ Complete all manual tests
2. ✅ Run Lighthouse audit
3. ✅ Document actual performance improvements
4. ✅ Compare before/after metrics
5. ✅ Deploy to production if all tests pass
6. ✅ Monitor real-world performance metrics
