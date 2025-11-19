# reCAPTCHA v3 Fix: "Invalid Listener Argument" Error

## Problem Resolved

**Issue:** The booking system was experiencing a critical reCAPTCHA v3 integration failure with the error:
```
Recaptcha execution error - invalid listener argument
```

This prevented users from completing booking submissions, showing the Finnish error message: "Turvavarmennus epäonnistui" (Security verification failed).

## Root Cause

The `grecaptcha.ready()` function was being called incorrectly with `await`, when it expects a callback function according to the reCAPTCHA v3 API specification.

### Before (Incorrect):
```javascript
async function executeRecaptcha(action) {
    await grecaptcha.ready();  // ❌ WRONG - ready() expects a callback
    const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action });
    return token;
}
```

### After (Correct):
```javascript
async function executeRecaptcha(action) {
    return new Promise((resolve, reject) => {
        grecaptcha.ready(() => {  // ✓ CORRECT - using callback pattern
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action })
                .then(token => resolve(token))
                .catch(error => reject(error));
        });
    });
}
```

## Changes Made

### Frontend Changes (`booking-system.js`)

1. **Fixed `executeRecaptcha` function:**
   - Changed from `await grecaptcha.ready()` to proper callback pattern
   - Added comprehensive error handling with Finnish error messages
   - Added validation to ensure grecaptcha is loaded before execution
   - Added token validation to ensure non-empty tokens

2. **Improved error handling in `fetchWithRetry`:**
   - Parse backend error messages for 401 and 500 errors
   - Display Finnish error messages from backend
   - Don't retry on reCAPTCHA/authentication failures

3. **Better error messages:**
   - "reCAPTCHA ei ole ladattu. Päivitä sivu ja yritä uudelleen."
   - "Turvavarmennus epäonnistui - token puuttuu"
   - "Turvavarmennus epäonnistui. Tarkista verkkoyhteytesi ja yritä uudelleen."

### Backend Changes (`functions/index.js.js`)

1. **Added Finnish error messages for all reCAPTCHA failures:**
   - Timeout/duplicate token: "Turvavarmennus vanhentunut tai käytetty jo. Yritä uudelleen."
   - Invalid token: "Virheellinen turvavarmennustunnus. Päivitä sivu ja yritä uudelleen."
   - Missing token: "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
   - Score too low: "Turvavarmennus epäonnistui. Jos ongelma jatkuu, ota yhteyttä asiakaspalveluun."

2. **Improved error handling:**
   - Return errors instead of silently proceeding when reCAPTCHA service fails
   - Validate that frontend sends reCAPTCHA token
   - Return 500 error if reCAPTCHA verification service fails

### Documentation Updates

1. **`RECAPTCHA_TROUBLESHOOTING.md`:**
   - Added section on "invalid listener argument" error
   - Added Finnish error messages guide
   - Added debugging steps for script loading issues

2. **`RECAPTCHA_SETUP_INSTRUCTIONS.md`:**
   - Added troubleshooting section for "invalid listener argument" error
   - Documented the fix and proper usage pattern

## Testing

### Manual Testing Steps

1. **Open the booking page:**
   - Navigate to the booking section on your site
   - Open browser DevTools (F12) → Console tab

2. **Verify reCAPTCHA loads:**
   - Look for the reCAPTCHA badge in bottom-right corner
   - Check console for any errors about grecaptcha

3. **Test booking submission:**
   - Select a date and time
   - Fill in all required fields
   - Submit the form
   - Expected: No console errors, booking succeeds

4. **Check backend logs:**
   ```bash
   firebase functions:log --only book --limit 10
   ```
   - Look for: `reCAPTCHA v3 score: X.X, action: booking`
   - Verify scores are appropriate (0.5+)

### Test File

A test HTML file is available at `/tmp/recaptcha-test.html` for isolated testing of the reCAPTCHA integration.

## Common Issues and Solutions

### Issue: "reCAPTCHA ei ole ladattu"

**Cause:** Script hasn't loaded yet or is blocked

**Solutions:**
1. Check Network tab in DevTools for blocked requests
2. Disable ad blockers and privacy extensions
3. Verify Content Security Policy allows Google domains
4. Wait for page to fully load before submitting

### Issue: Still seeing "invalid listener argument"

**Cause:** Browser cache or old version of code

**Solutions:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Open in incognito/private window
4. Verify you have the latest version deployed

### Issue: 401 Error on submission

**Cause:** reCAPTCHA validation failed on backend

**Solutions:**
1. Check Firebase Functions logs for score
2. Verify secret key is configured correctly
3. Check if score is below threshold (0.5)
4. Ensure site key and secret key match

## Deployment Checklist

Before deploying to production:

- [ ] Verify the site key is correct in `index.html` and `booking-system.js`
- [ ] Ensure secret key is configured in Firebase Functions
- [ ] Test on localhost (if domain is registered)
- [ ] Deploy to staging/test environment first
- [ ] Verify booking flow works end-to-end
- [ ] Monitor Firebase Functions logs for reCAPTCHA scores
- [ ] Check for any console errors in browser

## Monitoring

After deployment, monitor for:

1. **reCAPTCHA scores in logs:**
   ```bash
   firebase functions:log --only book | grep "reCAPTCHA v3 score"
   ```

2. **Failed bookings:**
   - Check if users are getting 401 errors
   - Review scores to adjust threshold if needed

3. **User feedback:**
   - Monitor for reports of "Turvavarmennus epäonnistui"
   - Check if legitimate users are being blocked

## Finnish Error Messages Reference

| English Error | Finnish Error Message |
|--------------|----------------------|
| reCAPTCHA not loaded | reCAPTCHA ei ole ladattu. Päivitä sivu ja yritä uudelleen. |
| Token missing | Turvavarmennus epäonnistui - token puuttuu |
| Network error | Turvavarmennus epäonnistui. Tarkista verkkoyhteytesi ja yritä uudelleen. |
| Not ready | Turvavarmennus ei ole valmis. Päivitä sivu ja yritä uudelleen. |
| Timeout/duplicate | Turvavarmennus vanhentunut tai käytetty jo. Yritä uudelleen. |
| Invalid token | Virheellinen turvavarmennustunnus. Päivitä sivu ja yritä uudelleen. |
| Missing token (backend) | Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen. |
| Score too low | Turvavarmennus epäonnistui. Jos ongelma jatkuu, ota yhteyttä asiakaspalveluun. |
| Service error | Turvavarmennuspalvelun yhteysvirhe. Yritä hetken kuluttua uudelleen. |

## Additional Resources

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)

## Support

If issues persist:

1. Review `RECAPTCHA_TROUBLESHOOTING.md` for detailed solutions
2. Check Firebase Functions logs for detailed error messages
3. Verify configuration in `RECAPTCHA_CONFIGURATION.md`
4. Test with the provided test file at `/tmp/recaptcha-test.html`

---

**Date Fixed:** 2024-11-10  
**Fixed By:** GitHub Copilot  
**Issue:** Invalid listener argument error in reCAPTCHA v3 integration  
**Status:** ✅ Resolved
