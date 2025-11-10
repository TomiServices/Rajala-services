# reCAPTCHA Configuration Guide

## Overview

This guide has been updated to reflect the **ReCAPTCHA Enterprise** implementation in the booking system. The system now uses ReCAPTCHA Enterprise for programmatic verification with both client-side and server-side validation for enhanced security.

## Current Configuration

### Site Key
**Site Key:** `6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF`

**Location:** `index.html` (line 234 - script tag in head section)

### Secret Key (Server-Side)
**Configuration Method:** Firebase Functions config or environment variable

**IMPORTANT:** The secret key must be configured in Firebase Functions for server-side validation to work.

```bash
# Configure using Firebase CLI
firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY_HERE"
```

### reCAPTCHA Version
**Type:** reCAPTCHA Enterprise (Programmatic execution)

**Note:** This is a programmatic implementation without a visible checkbox widget. The reCAPTCHA verification happens automatically when the user submits the booking form.

## Required Domain Configuration

The reCAPTCHA Enterprise site key must be registered for the following domains in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):

### Production Domains (Required)
- ✅ `rajala-services.com`
- ✅ `www.rajala-services.com`

### Development/Testing Domains (Optional but Recommended)
- `fxnr-web.web.app`
- `fxnr-web.firebaseapp.com`
- `localhost` (for local testing)

## ReCAPTCHA Enterprise Implementation

### How It Works

1. **User fills booking form** and clicks submit
2. **Client executes ReCAPTCHA Enterprise** programmatically: `grecaptcha.enterprise.execute()` with action 'SUBMIT_BOOKING'
3. **Token is generated** and included in the booking request
4. **Server validates token** with Google's reCAPTCHA API using the secret key
5. **If validation fails**, server returns 401 Unauthorized error
6. **If validation succeeds**, booking is processed normally

### Implementation Details

**Frontend Location:** `booking-system.js` (form submission handler)

**Frontend Process:**
```javascript
// 1. Check if ReCAPTCHA Enterprise is loaded
if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
    document.getElementById('error').textContent = 'reCAPTCHA ei ole latautunut...';
    return;
}

// 2. Execute ReCAPTCHA Enterprise and get token
const recaptchaResponse = await grecaptcha.enterprise.execute(
    '6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF', 
    {action: 'SUBMIT_BOOKING'}
);

// 3. Include token in booking request
const bookingData = {
    name, email, phone, aika, services, 
    totalPrice, totalNumericPrice,
    recaptcha: recaptchaResponse
};
```

**Backend Location:** `functions/index.js.js` (lines 36-67)

**Backend Process:**
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

// 3. Check validation result and score (Enterprise specific)
if (!verifyResponse.data.success) {
    return res.status(401).json({ 
        error: "reCAPTCHA verification failed"
    });
}

// 4. Log Enterprise score for monitoring
if (verifyResponse.data.score !== undefined) {
    console.log("reCAPTCHA Enterprise score:", verifyResponse.data.score);
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
3. Look for site key: `6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF`
4. Click on the site key to view settings
5. Verify the following:
   - ✅ reCAPTCHA type: Enterprise (Programmatic)
   - ✅ Domains include: `rajala-services.com` and `www.rajala-services.com`
   - ✅ Site key is active (not disabled)

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
   - ✅ No visible reCAPTCHA widget (Enterprise is programmatic)
   - ✅ No console errors about reCAPTCHA
   - ✅ Form submission works (reCAPTCHA executes automatically)
   - ✅ Check Network tab for successful reCAPTCHA token generation

### 4. Check Browser Console for Errors

Open browser DevTools (F12) and check Console tab for:

**Common reCAPTCHA Errors:**
- `Invalid site key` - Site key is not registered for this domain
- `Invalid domain for site key` - Domain not registered in reCAPTCHA Admin
- `grecaptcha is not defined` - Script failed to load
- `grecaptcha.enterprise is undefined` - Wrong reCAPTCHA version loaded

**No errors:** reCAPTCHA should load silently without errors

### 5. Verify Server-Side Validation

**Test 1: Submit with valid form**
1. Fill booking form completely
2. Submit the form
3. Expected: reCAPTCHA token is generated automatically and booking succeeds

**Test 2: Submit with invalid reCAPTCHA token**
1. Use browser DevTools to modify reCAPTCHA response in the request
2. Submit booking
3. Expected: 401 error from server

**Test 3: Verify Enterprise score logging**
1. Submit a valid booking
2. Check Firebase Functions logs for Enterprise score

**Check Firebase Functions Logs:**
```bash
firebase functions:log --only book

# Look for:
# - "reCAPTCHA Enterprise verification failed" (if validation fails)
# - "reCAPTCHA Enterprise score: X.XX" (Enterprise-specific logging)
# - "Error verifying reCAPTCHA Enterprise" (if Google API is down)
# - "reCAPTCHA secret not configured" (if secret not set)
```

## Troubleshooting

### Error: "Invalid site key"

**Cause:** Site key is incorrect or not registered for this domain

**Solutions:**
1. Verify the site key in `index.html` (line 234) matches the key in reCAPTCHA Admin Console
2. Ensure you're using the correct Enterprise key: `6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF`
3. Check for typos in the site key
4. Ensure the domain is registered for this site key

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
1. ReCAPTCHA Enterprise executes automatically on form submission
2. Check that site key and secret key match (from same reCAPTCHA Enterprise configuration)
3. Verify domains are correctly registered
4. Check reCAPTCHA token hasn't expired (valid for ~2 minutes)
5. Verify secret key is correctly configured in Firebase Functions

### reCAPTCHA Script Not Loading

**Possible Causes:**
1. Content Security Policy blocking Google domains
2. Ad blocker or privacy extension blocking reCAPTCHA
3. Network issues preventing script load
4. Incorrect script tag

**Solutions:**
1. Check CSP in `firebase.json` allows `https://www.google.com` and `https://www.gstatic.com`
2. Test in incognito mode or different browser
3. Check browser console for blocked requests
4. Verify script tag in HTML head (line 234):
   ```html
   <script src="https://www.google.com/recaptcha/enterprise.js?render=6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF"></script>
   ```

### Form Submits Without reCAPTCHA Validation

**Cause:** Frontend validation not working or reCAPTCHA Enterprise not loading

**Solution:**
Check that the validation code in `booking-system.js` is present:
```javascript
// Check if reCAPTCHA Enterprise is loaded
if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
    document.getElementById('error').textContent = 'reCAPTCHA ei ole latautunut...';
    return;
}

// Execute ReCAPTCHA Enterprise
const recaptchaResponse = await grecaptcha.enterprise.execute(
    '6LejwAcsAAAAAP3lQrb8QdAbQnQYt4JZuVbIXsmF', 
    {action: 'SUBMIT_BOOKING'}
);
```

### Server Accepts Bookings Without reCAPTCHA (Security Issue)

**Cause:** Secret key not configured in Firebase Functions

**Solution:**
Configure the Enterprise secret key:
```bash
firebase functions:config:set recaptcha.secret="YOUR_ENTERPRISE_SECRET_KEY"
firebase deploy --only functions
```

## Creating a New Site Key (If Needed)

If the current site key is invalid or you need a new one:

### 1. Create New Enterprise Site Key

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to add a new site
3. Fill in the form:
   - **Label:** Rajala Services Booking Calendar Enterprise
   - **reCAPTCHA type:** reCAPTCHA Enterprise
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

**Frontend (index.html - line 234):**
```html
<script src="https://www.google.com/recaptcha/enterprise.js?render=YOUR_NEW_SITE_KEY_HERE"></script>
```

**Frontend (booking-system.js):**
Update the site key in the `grecaptcha.enterprise.execute()` call:
```javascript
const recaptchaResponse = await grecaptcha.enterprise.execute('YOUR_NEW_SITE_KEY_HERE', {action: 'SUBMIT_BOOKING'});
```

**Backend (Firebase Functions):**
```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_ENTERPRISE_SECRET_KEY_HERE"
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

The system now validates reCAPTCHA Enterprise on both client and server:
- ✅ Client-side: Programmatic execution prevents form submission without token
- ✅ Server-side: Validation prevents malicious bypassing
- ✅ Secret Key never exposed to clients
- ✅ Enterprise scoring provides additional bot detection

### 2. Secret Key Security

**DO:**
- ✅ Configure Enterprise secret key in Firebase Functions config
- ✅ Use environment variables for local testing
- ✅ Keep secret key confidential
- ✅ Match secret key with the corresponding Enterprise site key

**DON'T:**
- ❌ Commit secret key to repository
- ❌ Expose secret key in client-side code
- ❌ Share secret key in public documentation
- ❌ Mix v2 and Enterprise keys

### 3. Monitor Enterprise Scores

ReCAPTCHA Enterprise provides risk scores (0.0 to 1.0):
- Monitor scores in Firebase Functions logs
- Consider implementing score thresholds for high-risk actions
- Scores near 1.0 indicate likely human interaction
- Scores near 0.0 indicate likely bot activity

### 4. Rate Limiting (Recommended Future Enhancement)

Consider adding rate limiting to prevent abuse:
- Limit submissions per IP address
- Limit submissions per email/phone number
- Use Firebase Functions quotas

### 5. Monitor for Abuse

Check Firebase Console regularly for:
- Unusual spike in bookings
- Failed reCAPTCHA attempts (401 errors)
- Repeated submissions from same source
- Low Enterprise scores indicating bot activity

## Testing Checklist

Before deploying to production:

### Client-Side Testing
- [ ] Enterprise site key is registered for all production domains
- [ ] ReCAPTCHA Enterprise script loads without errors
- [ ] No visible widget (programmatic execution)
- [ ] Form submission triggers automatic reCAPTCHA execution
- [ ] Error message appears if reCAPTCHA script fails to load
- [ ] Check browser console for `grecaptcha.enterprise` availability
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with privacy extensions/ad blockers disabled

### Server-Side Testing
- [ ] Enterprise secret key is configured in Firebase Functions
- [ ] Valid reCAPTCHA Enterprise submissions succeed
- [ ] Invalid reCAPTCHA submissions fail with 401 error
- [ ] Check Firebase Functions logs for Enterprise scores
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
