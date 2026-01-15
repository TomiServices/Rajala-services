# Deployment Guide for Calendar Booking System Fixes

## Overview
This guide provides step-by-step instructions for deploying the fixes to the calendar booking system, including CORS configuration, reCAPTCHA validation, and error handling improvements.

## Prerequisites

1. **Firebase CLI** installed and configured
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Project Access** - Ensure you have admin access to the Firebase project `fxnr-web`

3. **reCAPTCHA Keys** - Have both Site Key and Secret Key available

## Step 1: Configure reCAPTCHA Secret Key

The server-side reCAPTCHA validation requires the secret key to be configured in Firebase Functions.

### Option A: Using Firebase CLI (Recommended)

```bash
# Set the reCAPTCHA secret key
firebase functions:config:set recaptcha.secret="YOUR_RECAPTCHA_SECRET_KEY"

# Verify the configuration
firebase functions:config:get
```

### Option B: Using Environment Variables (Local Testing)

For local testing, you can use environment variables:

```bash
export RECAPTCHA_SECRET="YOUR_RECAPTCHA_SECRET_KEY"
```

**Important:** Never commit secret keys to the repository!

## Step 2: Verify reCAPTCHA Site Key Configuration

### Check Current Site Key

The site key in `index.html` is: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

**Note:** This is a FREE reCAPTCHA v2 (Checkbox) key, not an Enterprise key.

### Verify Domain Registration

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Select the site key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
3. Ensure the following domains are registered:
   - `rajala-services.com`
   - `www.rajala-services.com`
   - `fxnr-web.web.app` (optional, for testing)
   - `fxnr-web.firebaseapp.com` (optional, for testing)

### If Site Key Needs Update

If the current site key is not registered for the correct domains:

1. Create a new reCAPTCHA v2 site key with the correct domains
2. Update `index.html` line 3566:
   ```html
   <div class="g-recaptcha" data-sitekey="YOUR_NEW_SITE_KEY"></div>
   ```
3. Configure the new secret key (see Step 1)

## Step 3: Install Dependencies

Navigate to the functions directory and install dependencies:

```bash
cd functions
npm install
```

Verify that `axios` is installed (required for reCAPTCHA verification):

```bash
npm list axios
```

If not installed:

```bash
npm install axios
```

## Step 4: Deploy Firebase Functions

Deploy the updated functions with reCAPTCHA validation:

```bash
# From the project root
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:book,functions:bookings
```

### Verify Deployment

```bash
# List deployed functions
firebase functions:list

# Check function logs
firebase functions:log
```

## Step 5: Deploy Firebase Hosting

Deploy the updated frontend code:

```bash
# From the project root
firebase deploy --only hosting
```

## Step 6: Verification and Testing

### Test CORS Configuration

```bash
# Test bookings endpoint with CORS
curl -H "Origin: https://www.rajala-services.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v \
     https://europe-north1-fxnr-web.cloudfunctions.net/bookings
```

Expected response headers:
- `Access-Control-Allow-Origin: https://www.rajala-services.com`
- `Access-Control-Allow-Credentials: true`

### Test Bookings Endpoint

```bash
# Fetch bookings
curl https://europe-north1-fxnr-web.cloudfunctions.net/bookings
```

Expected: JSON array of bookings or empty array `[]`

### Test reCAPTCHA on Production Site

1. Navigate to `https://www.rajala-services.com`
2. Open browser DevTools (F12)
3. Go to the booking calendar section
4. Select a date and time
5. Fill in the booking form
6. Check Console for any reCAPTCHA errors
7. Complete the reCAPTCHA challenge
8. Submit the booking

### Check for Errors

**Browser Console (F12 → Console):**
- No reCAPTCHA errors
- No CORS errors
- Successful booking submission

**Browser Network Tab (F12 → Network):**
- `bookings` request returns 200 status
- `book` request returns 200 status with `{"success": true, "id": "..."}`
- CORS headers present on responses

**Firebase Console → Functions → Logs:**
- No 401 errors (reCAPTCHA verification should pass)
- No 503 errors
- Successful booking creation logs

## Step 7: Monitor Production

### Check Firebase Functions Logs

```bash
# Stream logs in real-time
firebase functions:log --only book,bookings

# Or view in Firebase Console
# https://console.firebase.google.com/project/fxnr-web/functions/logs
```

### Monitor for Issues

Watch for:
- ✅ Successful booking submissions
- ✅ reCAPTCHA verification success
- ⚠️ 401 errors (reCAPTCHA verification failures)
- ⚠️ 503 errors (service unavailable)
- ⚠️ CORS errors (blocked requests)

## Troubleshooting

### Issue: 401 Unauthorized Errors

**Cause:** reCAPTCHA verification failing

**Solutions:**
1. Verify secret key is correctly configured:
   ```bash
   firebase functions:config:get recaptcha.secret
   ```
2. Check that site key matches secret key in reCAPTCHA Admin Console
3. Ensure domains are correctly registered for the site key
4. Verify reCAPTCHA response is being sent from frontend

### Issue: CORS Policy Errors

**Cause:** Request origin not in allowed list

**Solutions:**
1. Verify the requesting domain is in the CORS origin list in `functions/index.js.js`
2. Check for typos in domain names (with/without `www`)
3. Ensure functions are deployed with latest code
4. Clear browser cache and retry

### Issue: 503 Service Unavailable

**Possible Causes:**
- Cold start (first request takes longer)
- Firebase Functions quota exceeded
- Firestore connection issues
- Function timeout

**Solutions:**
1. Check Firebase Functions quota in Console
2. Review function logs for specific errors
3. Verify Firestore rules allow read/write access
4. Increase function timeout if needed:
   ```javascript
   exports.book = functions
     .runWith({ timeoutSeconds: 300 })
     .https.onRequest(...)
   ```

### Issue: Bookings Not Loading (Empty Calendar)

**Cause:** Frontend receives empty array from API

**Check:**
1. Browser console for error messages
2. Network tab for failed requests
3. Warning message should be displayed to user
4. Firestore collection `varaukset` has documents

**Solutions:**
1. Verify `bookings` function is deployed and working
2. Check Firestore security rules allow read access
3. Test endpoint directly with curl
4. Check function logs for errors

### Issue: reCAPTCHA Widget Not Loading

**Possible Causes:**
- Site key invalid or not registered for domain
- Content Security Policy blocking Google domains
- Ad blocker or privacy extension
- Network issues

**Solutions:**
1. Verify CSP in `firebase.json` allows:
   - `https://www.google.com`
   - `https://www.gstatic.com`
2. Test in incognito mode
3. Disable ad blockers/privacy extensions
4. Check browser console for blocked requests

## Rollback Plan

If issues occur after deployment:

### Rollback Functions

```bash
# View deployment history
firebase functions:log

# Redeploy previous version if needed
# (Firebase keeps previous versions for 60 days)
```

### Rollback Hosting

```bash
# View hosting releases
firebase hosting:channel:list

# Rollback to previous release in Firebase Console
# Hosting → Release history → Previous version → Rollback
```

## Success Criteria

Deployment is successful when:

- [ ] ✅ Bookings endpoint returns data without CORS errors
- [ ] ✅ reCAPTCHA widget loads on booking page
- [ ] ✅ reCAPTCHA can be completed successfully
- [ ] ✅ Booking submission works with valid reCAPTCHA
- [ ] ✅ Booking submission fails with invalid reCAPTCHA (401 error)
- [ ] ✅ Confirmation email received after booking
- [ ] ✅ Booking appears in Firestore `varaukset` collection
- [ ] ✅ No errors in browser console
- [ ] ✅ No errors in Firebase Functions logs

## Additional Notes

### Security Considerations

1. **Secret Key:** Never commit the reCAPTCHA secret key to the repository
2. **CORS:** Only allow trusted domains in CORS configuration
3. **Rate Limiting:** Consider adding rate limiting to prevent abuse
4. **Input Validation:** Server-side validation is in place for all booking fields

### Performance Optimizations

1. **Cache Control:** Bookings endpoint uses cache headers to reduce load
2. **Retry Logic:** Frontend retries failed requests with exponential backoff
3. **Lazy Loading:** reCAPTCHA is lazy-loaded when user scrolls to booking section

### Future Improvements

1. Add server-side rate limiting
2. Implement reCAPTCHA v3 for better user experience
3. Add monitoring/alerting for function errors
4. Implement booking conflict prevention (double-booking protection)

## Support

For issues or questions:
- Check Firebase Console logs
- Review browser DevTools Network/Console tabs
- Contact Firebase Support for backend issues
- Contact Google reCAPTCHA support for reCAPTCHA issues
