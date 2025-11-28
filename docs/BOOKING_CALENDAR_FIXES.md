# Booking Calendar Fixes - Implementation Guide

## Overview
This document describes the fixes implemented to resolve CORS, Firebase Functions, and reCAPTCHA issues in the booking calendar system.

## Issues Addressed

### 1. CORS Policy Block ✅
**Problem:** Access to the 'bookings' endpoint was blocked due to misconfigured CORS headers.

**Solution:**
- Updated Firebase Cloud Functions CORS configuration to explicitly allow authorized domains:
  - `https://www.rajala-services.com`
  - `https://rajala-services.com`
  - `https://fxnr-web.web.app`
  - `https://fxnr-web.firebaseapp.com`
- Added proper OPTIONS preflight request handling
- Enabled credentials support for cross-origin requests

**Files Modified:**
- `functions/index.js.js` - Lines 3-13

**Code Changes:**
```javascript
const cors = require("cors")({
    origin: [
        "https://www.rajala-services.com",
        "https://rajala-services.com",
        "https://fxnr-web.web.app",
        "https://fxnr-web.firebaseapp.com"
    ],
    credentials: true,
    optionsSuccessStatus: 200
});
```

### 2. Firebase Function 503 Errors ✅
**Problem:** Functions returning 503 Service Unavailable errors.

**Solutions Implemented:**
1. **Enhanced Error Handling:**
   - Added comprehensive error logging to diagnose issues
   - Added timestamps to error responses for tracking
   - Improved error messages for debugging

2. **Added Cache Control:**
   - Implemented caching headers on the `bookings` endpoint to reduce load
   - Cache-Control: `public, max-age=60, s-maxage=300`

3. **OPTIONS Request Handling:**
   - Added explicit handling for CORS preflight OPTIONS requests
   - Returns 200 status immediately for OPTIONS requests

**Files Modified:**
- `functions/index.js.js` - `book` and `bookings` functions

**Key Changes:**
```javascript
// Handle OPTIONS preflight request
if (req.method === "OPTIONS") {
    return res.status(200).end();
}

// Better error logging
console.error("Error creating booking:", error);
res.status(500).json({ 
    error: error.message,
    timestamp: new Date().toISOString()
});
```

### 3. Frontend Error Handling ✅
**Problem:** Poor error messages when API calls fail.

**Solutions:**
1. **Enhanced fetchWithRetry Function:**
   - Detects and reports CORS errors with user-friendly messages
   - Provides specific error message for 503 errors
   - Better network error detection and reporting

2. **reCAPTCHA Validation:**
   - Added check to verify reCAPTCHA library is loaded before submission
   - Clear error message if reCAPTCHA fails to load

**Files Modified:**
- `booking-system.js` - Lines 50-95, 1610-1619

**Example Error Messages:**
- CORS: "Yhteysongelma palvelimeen. Tarkista, että evästeet ovat sallittuja ja yritä uudelleen."
- 503: "Palvelu ei ole tällä hetkellä saatavilla (503). Yritä hetken kuluttua uudelleen."
- reCAPTCHA: "reCAPTCHA ei ole latautunut. Päivitä sivu ja yritä uudelleen."

### 4. Content Security Policy (CSP) ✅
**Problem:** CSP might block connections to Firebase Functions.

**Solution:**
- Added Firebase Functions endpoint to CSP `connect-src` directive
- Ensures `https://us-central1-fxnr-web.cloudfunctions.net` is allowed

**Files Modified:**
- `firebase.json` - Line 20

## Deployment Instructions

### 1. Deploy Firebase Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### 2. Deploy Firebase Hosting
```bash
firebase deploy --only hosting
```

### 3. Verify Deployment
```bash
# Check functions are deployed
firebase functions:list

# Test bookings endpoint
curl https://us-central1-fxnr-web.cloudfunctions.net/bookings

# Test from production domain
curl -H "Origin: https://www.rajala-services.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://us-central1-fxnr-web.cloudfunctions.net/bookings
```

## Testing Checklist

### CORS Testing
- [ ] Verify bookings endpoint returns data from production domain
- [ ] Check CORS headers in browser DevTools Network tab
- [ ] Confirm OPTIONS preflight requests return 200 status
- [ ] Test from different allowed origins

### Error Handling Testing
- [ ] Test booking submission with invalid data
- [ ] Test with reCAPTCHA not completed
- [ ] Test with network disconnected
- [ ] Verify user-friendly error messages appear

### reCAPTCHA Testing
- [ ] Verify reCAPTCHA widget loads on booking page
- [ ] Test booking submission without completing reCAPTCHA
- [ ] Test booking submission with completed reCAPTCHA
- [ ] Check reCAPTCHA error messages

### End-to-End Testing
- [ ] Open calendar on production site
- [ ] Select a date and time slot
- [ ] Choose service type
- [ ] Fill in booking details
- [ ] Complete reCAPTCHA
- [ ] Submit booking
- [ ] Verify success message
- [ ] Check confirmation email received
- [ ] Verify booking appears in Firestore

## Monitoring and Debugging

### Firebase Console Logs
1. Go to Firebase Console > Functions > Logs
2. Monitor for errors during booking submissions
3. Check timestamps match user reports

### Browser DevTools
1. **Network Tab:**
   - Check for CORS errors
   - Verify response headers include `Access-Control-Allow-Origin`
   - Monitor 503 or other HTTP errors

2. **Console Tab:**
   - Check for reCAPTCHA errors
   - Monitor fetch retry attempts
   - Review error messages

### Common Issues and Solutions

#### CORS Still Blocked
- Verify domain is exactly as configured (with/without www)
- Check for typos in origin list
- Ensure functions are deployed with latest code
- Clear browser cache

#### 503 Errors Persist
- Check Firebase Functions quota/billing
- Review Firestore security rules
- Monitor Firebase Functions dashboard for cold starts
- Consider increasing function memory/timeout

#### reCAPTCHA Not Loading
- Verify site key is valid and registered for domain
- Check CSP allows www.google.com and www.gstatic.com
- Ensure script tag loads before form submission
- Check for ad blockers or privacy extensions

## reCAPTCHA Configuration

### Current Configuration
- **Site Key:** `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- **Type:** reCAPTCHA v2 Checkbox (FREE version)
- **Domains:** Should include:
  - `rajala-services.com`
  - `www.rajala-services.com`
  - `fxnr-web.web.app`
  - `fxnr-web.firebaseapp.com`

### Verify reCAPTCHA Settings
1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Select your site key
3. Verify domains are registered
4. Check that the key is active

### Update reCAPTCHA (if needed)
If the current key is invalid:
1. Create new site key in reCAPTCHA Admin Console
2. Update `index.html` line 3472:
   ```html
   <div class="g-recaptcha" data-sitekey="YOUR_NEW_SITE_KEY"></div>
   ```
3. Redeploy hosting

## Additional Improvements

### Implemented
- Exponential backoff retry logic for API calls
- Better user feedback for errors
- Lazy loading of reCAPTCHA for performance
- Cache control headers on API responses

### Future Considerations
- Add server-side reCAPTCHA validation
- Implement rate limiting on functions
- Add monitoring/alerting for 503 errors
- Consider using reCAPTCHA v3 for better UX

## Support

If issues persist after implementing these fixes:
1. Check Firebase Console for function logs
2. Review browser DevTools Network/Console tabs
3. Verify all domains are correctly configured in:
   - Firebase Functions CORS settings
   - reCAPTCHA Admin Console
   - Content Security Policy
4. Contact Firebase Support if backend issues persist
