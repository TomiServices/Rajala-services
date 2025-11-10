# reCAPTCHA Troubleshooting Guide

## "Invalid Key Type" Error

If you're seeing an "invalid key type" error with reCAPTCHA, follow these steps to resolve it:

### Current Configuration
- **Implementation Type**: reCAPTCHA v3 (Invisible, score-based)
- **Current Site Key**: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- **Location in Code**: `index.html` (script tag in head) and `booking-system.js`

### Steps to Fix

#### 1. Verify reCAPTCHA Version
The current implementation uses **reCAPTCHA v3**. Ensure your site key is created for v3, not v2.

To verify in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):
1. Log in with the account that created the site key
2. Find the site key `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
3. Check the "reCAPTCHA type" - it should show **"reCAPTCHA v3"**
4. If it shows "reCAPTCHA v2", you need to create a new v3 site key (see step 3 below)

#### 2. Verify Domain Configuration
Ensure the site key is registered for the correct domains:

**Required domains:**
- `rajala-services.com`
- `www.rajala-services.com`

**Optional (for testing):**
- `localhost`
- `fxnr-web.web.app`
- `fxnr-web.firebaseapp.com`

To add domains:
1. In the reCAPTCHA Admin Console, edit your site key
2. Add all production and testing domains
3. Save changes

#### 3. Generate New Site Key (If Needed)
If the current key was created for v2 instead of v3, create a new key:

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to create a new site
3. Enter:
   - **Label**: "Rajala Services Booking Calendar"
   - **reCAPTCHA type**: Select **"reCAPTCHA v3"**
   - **Domains**: Add all domains listed above
4. Accept terms and submit
5. Copy the new **Site Key** and **Secret Key**

#### 4. Update Configuration

##### Update Frontend (Site Key)
Edit `index.html` script tag in the head section:

```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_NEW_SITE_KEY_HERE" async defer></script>
```

Also update `booking-system.js`:
```javascript
const RECAPTCHA_SITE_KEY = 'YOUR_NEW_SITE_KEY_HERE';
```

##### Update Backend (Secret Key)
The secret key is stored in Firebase Functions configuration. Update it using:

```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_SECRET_KEY_HERE"
firebase deploy --only functions
```

### Verify the Fix

After updating the configuration:

1. Clear your browser cache
2. Open the booking page
3. Open browser DevTools console (F12)
4. Select a date and time
5. Fill in the booking form
6. Submit the form
7. Verify no errors appear in the browser console
8. Check that booking succeeds
9. Check Firebase Functions logs for reCAPTCHA score

### Common Issues

**"Invalid domain for site key"**
- The domain isn't registered for this site key
- Add the domain in the reCAPTCHA Admin Console

**"ERROR for site owner: Invalid key type"**
- The site key was created for v2, but the code uses v3
- Create a new v3 site key

**"reCAPTCHA verification failed"**
- The secret key is incorrect or not configured
- Update the secret key in Firebase Functions config

**"Score too low" (401 error)**
- The reCAPTCHA score is below the threshold (default 0.5)
- Check Firebase logs for the actual score
- Consider lowering the threshold if legitimate users are blocked

## reCAPTCHA v3 Score Issues

### Understanding Scores

reCAPTCHA v3 returns a score from 0.0 to 1.0:
- **1.0**: Very likely a human
- **0.5**: Uncertain (default threshold)
- **0.0**: Very likely a bot

### Low Scores for Legitimate Users

If legitimate users are getting blocked:

1. **Check the logs** to see actual score distribution:
   ```bash
   firebase functions:log --only book
   ```

2. **Lower the threshold** in `functions/index.js.js`:
   ```javascript
   const RECAPTCHA_SCORE_THRESHOLD = 0.3; // Was 0.5
   ```

3. **Common causes of low scores:**
   - Incognito/private browsing
   - VPN usage
   - Disabled cookies
   - First-time visitors
   - Bot-like interaction patterns
   - Browser automation tools

4. **Solutions:**
   - Start with threshold 0.3-0.4 for more permissive filtering
   - Monitor score distribution and adjust
   - Add user-friendly error messages
   - Consider fallback verification for borderline cases

### High Bot Traffic Getting Through

If bots are bypassing the check:

1. **Raise the threshold** in `functions/index.js.js`:
   ```javascript
   const RECAPTCHA_SCORE_THRESHOLD = 0.7; // Was 0.5
   ```

2. **Monitor the logs** to ensure legitimate users still pass:
   ```bash
   firebase functions:log --only book
   ```

3. **Additional measures:**
   - Implement rate limiting
   - Add honeypot fields
   - Monitor for unusual patterns
   - Check action parameter matches

## Script Loading Issues

### reCAPTCHA Not Loading

**Symptoms:**
- "grecaptcha is not defined" error
- Form submission fails with reCAPTCHA error
- No network request to Google reCAPTCHA

**Solutions:**

1. **Check Content Security Policy:**
   Verify `firebase.json` allows Google domains:
   ```json
   "headers": [{
     "source": "**",
     "headers": [{
       "key": "Content-Security-Policy",
       "value": "... script-src 'self' https://www.google.com https://www.gstatic.com ..."
     }]
   }]
   ```

2. **Check for ad blockers:**
   - Test in incognito mode
   - Disable browser extensions
   - Try different browser

3. **Verify script tag:**
   ```html
   <script src="https://www.google.com/recaptcha/api.js?render=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM" async defer></script>
   ```

4. **Check network tab:**
   - Open DevTools → Network
   - Look for requests to `google.com/recaptcha`
   - Check if blocked or failing

## Backend Validation Issues

### 401 Errors on Valid Submissions

**Cause:** Backend is rejecting the reCAPTCHA token

**Debug steps:**

1. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log --only book
   ```
   Look for:
   - reCAPTCHA score
   - Error messages
   - "score too low" warnings

2. **Verify secret key is configured:**
   ```bash
   firebase functions:config:get recaptcha.secret
   ```

3. **Check site key / secret key match:**
   - Both must be from the same reCAPTCHA configuration
   - Cannot mix keys from different reCAPTCHA sites

4. **Check token expiration:**
   - v3 tokens expire after ~2 minutes
   - User shouldn't wait too long before submitting

### Secret Key Not Working

**Symptoms:**
- Backend logs show "reCAPTCHA secret not configured"
- All submissions succeed without validation

**Solutions:**

1. **Set the secret key:**
   ```bash
   firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY_HERE"
   ```

2. **Redeploy functions:**
   ```bash
   firebase deploy --only functions
   ```

3. **Verify configuration:**
   ```bash
   firebase functions:config:get
   ```

## Browser Console Errors

### Common Error Messages

**"Invalid site key"**
```
Error: Invalid site key or not loaded
```
Solution: Verify site key in code matches reCAPTCHA Admin Console

**"Invalid listener argument"**
```
Error: Recaptcha execution error - invalid listener argument
```
Solution: This error occurs when `grecaptcha.ready()` is called incorrectly. The function expects a callback, not a Promise with `await`. The fix:
- Use callback pattern: `grecaptcha.ready(() => { ... })`
- Or wrap it in a Promise that handles the callback correctly
- Ensure the reCAPTCHA script is fully loaded before calling

**"Timeout error"**
```
Error: Timeout waiting for reCAPTCHA
```
Solution: Check network connectivity, try again

**"Action mismatch"**
```
Warning: reCAPTCHA action mismatch: expected 'booking', got 'unknown'
```
Solution: This is just a warning, but ensure you're using the correct action parameter

**"reCAPTCHA ei ole ladattu"** (reCAPTCHA not loaded)
```
Error: reCAPTCHA ei ole ladattu. Päivitä sivu ja yritä uudelleen.
```
Solution: The reCAPTCHA script hasn't loaded. Check:
- Network tab for blocked requests
- Ad blockers or privacy extensions
- Content Security Policy settings

## Testing Your Fix

### Manual Testing Checklist

1. **Browser Console Test:**
   - Open DevTools (F12)
   - Go to Console tab
   - Load the booking page
   - Check for reCAPTCHA errors
   - Submit a booking
   - Verify no errors

2. **Network Test:**
   - Open DevTools → Network tab
   - Filter by "recaptcha"
   - Load the booking page
   - Submit a booking
   - Verify API calls succeed

3. **Backend Test:**
   - Submit a test booking
   - Check Firebase Functions logs:
     ```bash
     firebase functions:log --only book --limit 10
     ```
   - Look for score and success/failure messages

4. **Score Distribution Test:**
   - Submit several test bookings
   - Check logs for score distribution
   - Verify most legitimate submissions score > 0.5

### Automated Monitoring

Set up monitoring to track:
- reCAPTCHA verification failures (401 errors)
- Score distribution over time
- Unusual spikes in low scores
- Failed booking attempts

## Need Help?

If you continue to experience issues:

1. **Check documentation:**
   - RECAPTCHA_CONFIGURATION.md - Complete setup guide
   - Firebase Functions logs - Backend validation details
   - Browser console - Frontend errors

2. **Gather information:**
   - Exact error message
   - Browser console logs
   - Firebase Functions logs
   - reCAPTCHA scores from logs

3. **Contact support:**
   - Google reCAPTCHA support for site key issues
   - Firebase support for backend issues
   - Check reCAPTCHA Admin Console for status updates
