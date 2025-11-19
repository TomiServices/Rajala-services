# reCAPTCHA Configuration Guide

## Overview

This guide documents the **FREE reCAPTCHA v3** implementation in the booking system. The system validates reCAPTCHA tokens on both client and server side for enhanced security.

**Important:** This implementation uses the **FREE** version of Google reCAPTCHA v3, NOT reCAPTCHA Enterprise. This ensures cost-efficiency while maintaining robust anti-spam protection.

## Current Configuration

### Site Key
**Site Key:** `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

**Location:** `index.html` (script tag in head section)

**Note:** This is a FREE reCAPTCHA v3 key, not an Enterprise key.

### Secret Key (Server-Side)
**Configuration Method:** Firebase Functions config or environment variable

**IMPORTANT:** The secret key must be configured in Firebase Functions for server-side validation to work.

```bash
# Configure using Firebase CLI
firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY_HERE"
```

### reCAPTCHA Version
**Type:** reCAPTCHA v3 (Invisible, score-based) - FREE VERSION

**API Endpoints:**
- Frontend Script: `https://www.google.com/recaptcha/api.js?render=SITE_KEY`
- Backend Verification: `https://www.google.com/recaptcha/api/siteverify`

**Note:** This implementation uses the FREE reCAPTCHA v3, NOT reCAPTCHA Enterprise.

### Score Threshold
**Default Score Threshold:** 0.5

The score ranges from 0.0 (very likely a bot) to 1.0 (very likely a human). A threshold of 0.5 provides a good balance between security and user experience.

**Location:** `functions/index.js.js` - `RECAPTCHA_SCORE_THRESHOLD` constant

## Required Domain Configuration

The reCAPTCHA site key must be registered for the following domains in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):

### Production Domains (Required)
- ✅ `rajala-services.com`
- ✅ `www.rajala-services.com`

### Development/Testing Domains (Optional but Recommended)
- `fxnr-web.web.app`
- `fxnr-web.firebaseapp.com`
- `localhost` (for local testing)

## How reCAPTCHA v3 Works

### Client-Side (Frontend)

1. **Script Loading:** The reCAPTCHA script is loaded in the HTML head with the `render` parameter
2. **Token Generation:** When the user submits the booking form, `grecaptcha.execute()` is called
3. **Action Parameter:** The action 'booking' is passed to identify this specific use case
4. **Token Submission:** The token is sent to the backend with the booking data

**No user interaction required** - v3 works invisibly in the background.

### Server-Side (Backend)

1. **Token Verification:** Server sends the token to Google's siteverify API
2. **Score Evaluation:** Google returns a score (0.0-1.0) and the action
3. **Threshold Check:** If score >= 0.5, request is allowed
4. **Action Verification:** Server checks that the action matches 'booking'
5. **Response:** Server proceeds with booking or returns 401 error

## Implementation Details

### Frontend (`booking-system.js`)

**executeRecaptcha() Function:**
```javascript
async function executeRecaptcha(action) {
    await grecaptcha.ready();
    const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action });
    return token;
}
```

**Form Submission:**
```javascript
// Execute reCAPTCHA v3 to get token
const recaptchaToken = await executeRecaptcha('booking');

// Include token in booking data
const bookingData = {
    // ... other fields
    recaptcha: recaptchaToken
};
```

### Backend (`functions/index.js.js`)

**Verification Process:**
```javascript
// Verify with Google's API
const verifyResponse = await axios.post(verifyUrl, null, {
    params: {
        secret: RECAPTCHA_SECRET,
        response: recaptcha
    }
});

// Check score
const score = verifyResponse.data.score;
if (score < RECAPTCHA_SCORE_THRESHOLD) {
    return res.status(401).json({ error: "Score too low" });
}
```

## Verification Steps

### 1. Verify Site Key Registration

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with the Google account that owns the site key
3. Look for site key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
4. Click on the site key to view settings
5. Verify the following:
   - ✅ reCAPTCHA type: v3 (score-based, invisible)
   - ✅ Domains include: `rajala-services.com` and `www.rajala-services.com`
   - ✅ Site key is active (not disabled)
   - ✅ NOT using reCAPTCHA Enterprise

### 2. Verify Secret Key Configuration

```bash
# Check if secret key is configured
firebase functions:config:get recaptcha.secret

# Expected output: "YOUR_SECRET_KEY_VALUE"
# If empty or error: secret key is not configured
```

### 3. Test reCAPTCHA on Production Site

1. Navigate to: `https://www.rajala-services.com`
2. Scroll to the booking calendar section
3. Select a date and time
4. Fill in the booking form
5. Verify:
   - ✅ No visible reCAPTCHA widget (v3 is invisible)
   - ✅ No console errors about reCAPTCHA
   - ✅ Form submission works smoothly
   - ✅ Backend validates the token (check Firebase logs)

### 4. Check Browser Console

Open browser DevTools (F12) and check Console tab:

**Expected:** No reCAPTCHA errors
**Common v3 Messages:**
- reCAPTCHA may log analytics events (normal)
- Check for any error messages about invalid site key or domains

### 5. Monitor reCAPTCHA Scores

**Check Firebase Functions Logs:**
```bash
firebase functions:log --only book

# Look for:
# - "reCAPTCHA v3 score: X.XX, action: booking"
# - Score values and trends
# - Any "score too low" rejections
```

**Adjust Threshold if Needed:**
- If legitimate users are blocked: Lower threshold (e.g., 0.3)
- If spam gets through: Raise threshold (e.g., 0.7)
- Default 0.5 is recommended for most use cases

## Troubleshooting

### Error: "Invalid site key"

**Cause:** Site key is incorrect or not registered for this domain

**Solutions:**
1. Verify the site key in `index.html` matches the key in reCAPTCHA Admin Console
2. Check for typos in the site key
3. Ensure the domain is registered for this site key

### Error: "Invalid domain for site key"

**Cause:** Current domain is not registered in the allowed domains list

**Solutions:**
1. Go to reCAPTCHA Admin Console
2. Select your site key
3. Add the domain to the allowed domains list
4. Wait 30 seconds for changes to propagate

### Error: 401 Unauthorized on Booking Submission

**Cause:** Server-side reCAPTCHA validation failed (score too low or invalid token)

**Solutions:**
1. Check Firebase Functions logs for the actual score
2. If score is consistently below threshold for legitimate users, lower the threshold
3. Verify site key and secret key match (from same reCAPTCHA configuration)
4. Verify domains are correctly registered
5. Check reCAPTCHA token hasn't expired (tokens are valid for ~2 minutes)
6. Verify secret key is correctly configured in Firebase Functions

### reCAPTCHA Script Not Loading

**Possible Causes:**
1. Content Security Policy blocking Google domains
2. Ad blocker or privacy extension blocking reCAPTCHA
3. Network issues preventing script load

**Solutions:**
1. Check CSP in `firebase.json` allows `https://www.google.com` and `https://www.gstatic.com`
2. Test in incognito mode or different browser
3. Check browser console for blocked requests
4. Verify script tag in HTML:
   ```html
   <script src="https://www.google.com/recaptcha/api.js?render=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM" async defer></script>
   ```

### Low Scores for Legitimate Users

**Cause:** Various factors can affect v3 scores

**Factors:**
- New/incognito browser sessions
- VPN usage
- Disabled cookies
- Bot-like interaction patterns
- First-time visitors

**Solutions:**
1. Lower the score threshold (try 0.3-0.4)
2. Monitor score distribution in logs
3. Consider implementing fallback verification for low scores
4. Add user-friendly error messages

## Creating a New Site Key (If Needed)

If the current site key is invalid or you need a new one:

### 1. Create New Site Key

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to add a new site
3. Fill in the form:
   - **Label:** Rajala Services Booking Calendar
   - **reCAPTCHA type:** reCAPTCHA v3
   - **Domains:**
     - `rajala-services.com`
     - `www.rajala-services.com`
     - `fxnr-web.web.app`
     - `fxnr-web.firebaseapp.com`
   - **Owners:** (your Google account email)
   - Accept reCAPTCHA Terms of Service
4. Click "Submit"
5. Copy the **Site Key** and **Secret Key**

### 2. Update Site Key in Code

**Frontend (index.html):**
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_NEW_SITE_KEY_HERE" async defer></script>
```

**Frontend (booking-system.js):**
```javascript
const RECAPTCHA_SITE_KEY = 'YOUR_NEW_SITE_KEY_HERE';
```

**Backend (Firebase Functions):**
```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_SECRET_KEY_HERE"
```

### 3. Redeploy

```bash
# Deploy hosting (for frontend changes)
firebase deploy --only hosting

# Deploy functions (for backend secret key)
firebase deploy --only functions
```

## Security Best Practices

### 1. Server-Side Validation (✅ IMPLEMENTED)

The system validates reCAPTCHA on both client and server:
- ✅ Client-side execution generates secure tokens
- ✅ Server-side validation prevents malicious bypassing
- ✅ Secret Key never exposed to clients
- ✅ Score-based protection against bots

### 2. Secret Key Security

**DO:**
- ✅ Configure secret key in Firebase Functions config
- ✅ Use environment variables for local testing
- ✅ Keep secret key confidential

**DON'T:**
- ❌ Commit secret key to repository
- ❌ Expose secret key in client-side code
- ❌ Share secret key in public documentation

### 3. Score Threshold Tuning

- Start with default 0.5
- Monitor logs for score distribution
- Adjust based on false positive/negative rate
- Consider different thresholds for different actions

### 4. Monitor for Abuse

Check Firebase Console regularly for:
- Unusual spike in bookings
- Low reCAPTCHA scores (potential bot traffic)
- Repeated submissions from same source
- Score distribution trends

## Testing Checklist

Before deploying to production:

### Client-Side Testing
- [ ] Site key is registered for all production domains
- [ ] reCAPTCHA script loads without errors
- [ ] No visible reCAPTCHA widget (v3 is invisible)
- [ ] Form submission works smoothly
- [ ] Token is generated and sent to backend
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with privacy extensions enabled

### Server-Side Testing
- [ ] Secret key is configured in Firebase Functions
- [ ] Valid reCAPTCHA tokens succeed
- [ ] Invalid tokens fail with 401 error
- [ ] Low-score tokens are rejected
- [ ] Check Firebase Functions logs for scores
- [ ] Verify error messages are user-friendly
- [ ] Monitor for false positives

### End-to-End Testing
- [ ] Complete full booking flow
- [ ] Booking confirmation email received after successful submission
- [ ] Booking appears in Firestore collection
- [ ] Calendar updates to show new booking
- [ ] No errors in browser console or Firebase logs
- [ ] Check reCAPTCHA Admin Console for request analytics

## Additional Resources

- [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Server-Side Verification](https://developers.google.com/recaptcha/docs/verify)
- [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq)
- [Score Interpretation Guide](https://developers.google.com/recaptcha/docs/v3#interpreting_the_score)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)

## Support

If you continue experiencing issues after following this guide:

1. Check the browser console for specific error messages
2. Verify all domains are correctly registered
3. Test in incognito mode to rule out browser extensions
4. Check Firebase Console logs for backend errors
5. Verify secret key is correctly configured
6. Monitor score distribution in logs
7. Contact Google reCAPTCHA support for site key issues
8. Contact Firebase support for backend validation issues

## Required Domain Configuration

The reCAPTCHA site key must be registered for the following domains in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):

### Production Domains (Required)
- ✅ `rajala-services.com`
- ✅ `www.rajala-services.com`

### Development/Testing Domains (Optional but Recommended)
- `fxnr-web.web.app`
- `fxnr-web.firebaseapp.com`
- `localhost` (for local testing)

## Server-Side Validation (NEW)

### How It Works

1. **Client submits booking** with reCAPTCHA response token
2. **Server validates token** with Google's reCAPTCHA API using the secret key
3. **If validation fails**, server returns 401 Unauthorized error
4. **If validation succeeds**, booking is processed normally

### Implementation Details

**Location:** `functions/index.js.js` (lines 18-55)

**Process:**
```javascript
// 1. Extract reCAPTCHA response from request
const { recaptcha } = req.body;

// 2. Verify with Google's API
const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
const verifyResponse = await axios.post(verifyUrl, null, {
    params: {
        secret: RECAPTCHA_SECRET,
        response: recaptcha
    }
});

// 3. Check validation result
if (!verifyResponse.data.success) {
    return res.status(401).json({ 
        error: "reCAPTCHA verification failed"
    });
}
```

### Error Handling

- **401 Unauthorized:** reCAPTCHA verification failed
  - Invalid reCAPTCHA response
  - Expired reCAPTCHA token
  - reCAPTCHA completed on wrong domain
  
- **Frontend displays:** "Varmennusvirhe (401). Tarkista, että reCAPTCHA on suoritettu oikein."

### Configuration Status

The server will:
- ✅ **Skip validation** if secret key is not configured (logs warning)
- ✅ **Validate** if secret key is configured
- ✅ **Continue with booking** if reCAPTCHA service is temporarily down (logs error)

**For Production:** Always configure the secret key for security!

## Verification Steps

### 1. Verify Site Key Registration

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with the Google account that owns the site key
3. Look for site key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
4. Click on the site key to view settings
5. Verify the following:
   - ✅ reCAPTCHA type: v2 Checkbox (FREE version)
   - ✅ Domains include: `rajala-services.com` and `www.rajala-services.com`
   - ✅ Site key is active (not disabled)
   - ✅ NOT using reCAPTCHA Enterprise

### 2. Verify Secret Key Configuration

```bash
# Check if secret key is configured
firebase functions:config:get recaptcha.secret

# Expected output: "YOUR_SECRET_KEY_VALUE"
# If empty or error: secret key is not configured
```

### 3. Test reCAPTCHA on Production Site

1. Navigate to: `https://www.rajala-services.com`
2. Scroll to the booking calendar section
3. Select a date and time
4. Fill in the booking form
5. Verify:
   - ✅ reCAPTCHA widget loads and displays
   - ✅ No console errors about reCAPTCHA
   - ✅ reCAPTCHA checkbox can be checked
   - ✅ Form submission works after completing reCAPTCHA
   - ✅ Form submission fails WITHOUT completing reCAPTCHA

### 4. Check Browser Console for Errors

Open browser DevTools (F12) and check Console tab for:

**Common reCAPTCHA Errors:**
- `Invalid site key` - Site key is not registered for this domain
- `Invalid domain for site key` - Domain not registered in reCAPTCHA Admin
- `reCAPTCHA placeholder element must be empty` - Multiple reCAPTCHA instances
- `reCAPTCHA has already been rendered` - Duplicate initialization

**No errors:** reCAPTCHA should load silently without errors

### 5. Verify Server-Side Validation (NEW)

**Test 1: Submit without reCAPTCHA**
1. Fill booking form
2. DO NOT complete reCAPTCHA
3. Try to submit
4. Expected: Form validation prevents submission with message "Vahvista että et ole robotti!"

**Test 2: Submit with invalid reCAPTCHA**
1. Use browser DevTools to modify reCAPTCHA response
2. Submit booking
3. Expected: 401 error from server

**Test 3: Submit with valid reCAPTCHA**
1. Complete reCAPTCHA correctly
2. Submit booking
3. Expected: Success response, booking created

**Check Firebase Functions Logs:**
```bash
firebase functions:log --only book

# Look for:
# - "reCAPTCHA verification failed" (if validation fails)
# - "Error verifying reCAPTCHA" (if Google API is down)
# - "reCAPTCHA secret not configured" (if secret not set)
```

## Troubleshooting

### Error: "Invalid site key"

**Cause:** Site key is incorrect or not registered for this domain

**Solutions:**
1. Verify the site key in `index.html` matches the key in reCAPTCHA Admin Console
2. Check for typos in the site key
3. Ensure the domain is registered for this site key

### Error: "Invalid domain for site key"

**Cause:** Current domain is not registered in the allowed domains list

**Solutions:**
1. Go to reCAPTCHA Admin Console
2. Select your site key
3. Add the domain to the allowed domains list
4. Wait 30 seconds for changes to propagate

### Error: 401 Unauthorized on Booking Submission (NEW)

**Cause:** Server-side reCAPTCHA validation failed

**Solutions:**
1. Ensure user completed reCAPTCHA before submitting
2. Check that site key and secret key match (from same reCAPTCHA configuration)
3. Verify domains are correctly registered
4. Check reCAPTCHA token hasn't expired (valid for ~2 minutes)
5. Verify secret key is correctly configured in Firebase Functions

### reCAPTCHA Widget Not Loading

**Possible Causes:**
1. Content Security Policy blocking Google domains
2. Ad blocker or privacy extension blocking reCAPTCHA
3. Network issues preventing script load
4. Incorrect script tag

**Solutions:**
1. Check CSP in `firebase.json` allows `https://www.google.com` and `https://www.gstatic.com`
2. Test in incognito mode or different browser
3. Check browser console for blocked requests
4. Verify script tag in HTML:
   ```html
   <script src="https://www.google.com/recaptcha/api.js" async defer></script>
   ```

### Form Submits Without reCAPTCHA Validation

**Cause:** Frontend validation not working

**Solution:**
Check that the validation code in `booking-system.js` is present:
```javascript
if (typeof grecaptcha === 'undefined' || !grecaptcha.getResponse) {
    document.getElementById('error').textContent = 'reCAPTCHA ei ole latautunut...';
    return;
}
const recaptchaResponse = grecaptcha.getResponse();
if (!recaptchaResponse) {
    document.getElementById('error').textContent = 'Vahvista että et ole robotti!';
    return;
}
```

### Server Accepts Bookings Without reCAPTCHA (Security Issue)

**Cause:** Secret key not configured in Firebase Functions

**Solution:**
Configure the secret key:
```bash
firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY"
firebase deploy --only functions
```

## Creating a New Site Key (If Needed)

If the current site key is invalid or you need a new one:

### 1. Create New Site Key

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to add a new site
3. Fill in the form:
   - **Label:** Rajala Services Booking Calendar
   - **reCAPTCHA type:** reCAPTCHA v2 → "I'm not a robot" Checkbox
   - **Domains:**
     - `rajala-services.com`
     - `www.rajala-services.com`
     - `fxnr-web.web.app`
     - `fxnr-web.firebaseapp.com`
   - **Owners:** (your Google account email)
   - Accept reCAPTCHA Terms of Service
4. Click "Submit"
5. Copy the **Site Key** and **Secret Key**

### 2. Update Site Key in Code

**Frontend (index.html):**
```html
<!-- Line 3566 -->
<div class="g-recaptcha" data-sitekey="YOUR_NEW_SITE_KEY_HERE"></div>
```

**Backend (Firebase Functions):**
```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_SECRET_KEY_HERE"
```

### 3. Redeploy

```bash
# Deploy hosting (for frontend changes)
firebase deploy --only hosting

# Deploy functions (for backend secret key)
firebase deploy --only functions
```

## Security Best Practices

### 1. Server-Side Validation (✅ IMPLEMENTED)

The system now validates reCAPTCHA on both client and server:
- ✅ Client-side validation prevents accidental submissions
- ✅ Server-side validation prevents malicious bypassing
- ✅ Secret Key never exposed to clients

### 2. Secret Key Security

**DO:**
- ✅ Configure secret key in Firebase Functions config
- ✅ Use environment variables for local testing
- ✅ Keep secret key confidential

**DON'T:**
- ❌ Commit secret key to repository
- ❌ Expose secret key in client-side code
- ❌ Share secret key in public documentation

### 3. Rate Limiting (Recommended Future Enhancement)

Consider adding rate limiting to prevent abuse:
- Limit submissions per IP address
- Limit submissions per email/phone number
- Use Firebase Functions quotas

### 4. Monitor for Abuse

Check Firebase Console regularly for:
- Unusual spike in bookings
- Failed reCAPTCHA attempts (401 errors)
- Repeated submissions from same source

## Testing Checklist

Before deploying to production:

### Client-Side Testing
- [ ] Site key is registered for all production domains
- [ ] reCAPTCHA widget loads without errors
- [ ] reCAPTCHA can be completed successfully
- [ ] Form submission requires reCAPTCHA completion
- [ ] Error message appears if reCAPTCHA not completed
- [ ] Error message appears if reCAPTCHA fails to load
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with privacy extensions/ad blockers disabled

### Server-Side Testing (NEW)
- [ ] Secret key is configured in Firebase Functions
- [ ] Valid reCAPTCHA submissions succeed
- [ ] Invalid reCAPTCHA submissions fail with 401 error
- [ ] Missing reCAPTCHA submissions fail with 401 error
- [ ] Check Firebase Functions logs for validation errors
- [ ] Verify error messages are user-friendly

### End-to-End Testing
- [ ] Complete full booking flow
- [ ] Booking confirmation email received after successful submission
- [ ] Booking appears in Firestore collection
- [ ] Calendar updates to show new booking
- [ ] No errors in browser console or Firebase logs

## Additional Resources

- [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v2 Documentation](https://developers.google.com/recaptcha/docs/display)
- [reCAPTCHA Server-Side Verification](https://developers.google.com/recaptcha/docs/verify)
- [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)

## Support

If you continue experiencing issues after following this guide:

1. Check the browser console for specific error messages
2. Verify all domains are correctly registered
3. Test in incognito mode to rule out browser extensions
4. Check Firebase Console logs for backend errors
5. Verify secret key is correctly configured
6. Contact Google reCAPTCHA support for site key issues
7. Contact Firebase support for backend validation issues
