# reCAPTCHA Configuration Guide

## Current Configuration

### Site Key
**Site Key:** `6Lcb5pQrAAAAAMFL6-0S0SfLPwpgy4t8N9f1zaGR`

**Location:** `index.html` (line 3472)

### reCAPTCHA Version
**Type:** reCAPTCHA v2 Checkbox ("I'm not a robot")

## Required Domain Configuration

The reCAPTCHA site key must be registered for the following domains in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):

### Production Domains (Required)
- ✅ `rajala-services.com`
- ✅ `www.rajala-services.com`

### Development/Testing Domains (Optional but Recommended)
- `fxnr-web.web.app`
- `fxnr-web.firebaseapp.com`
- `localhost` (for local testing)

## Verification Steps

### 1. Verify Site Key Registration

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with the Google account that owns the site key
3. Look for site key: `6Lcb5pQrAAAAAMFL6-0S0SfLPwpgy4t8N9f1zaGR`
4. Click on the site key to view settings
5. Verify the following:
   - ✅ reCAPTCHA type: v2 Checkbox
   - ✅ Domains include: `rajala-services.com` and `www.rajala-services.com`
   - ✅ Site key is active (not disabled)

### 2. Test reCAPTCHA on Production Site

1. Navigate to: `https://www.rajala-services.com`
2. Scroll to the booking calendar section
3. Select a date and time
4. Fill in the booking form
5. Verify:
   - ✅ reCAPTCHA widget loads and displays
   - ✅ No console errors about reCAPTCHA
   - ✅ reCAPTCHA checkbox can be checked
   - ✅ Form submission works after completing reCAPTCHA

### 3. Check Browser Console for Errors

Open browser DevTools (F12) and check Console tab for:

**Common reCAPTCHA Errors:**
- `Invalid site key` - Site key is not registered for this domain
- `Invalid domain for site key` - Domain not registered in reCAPTCHA Admin
- `reCAPTCHA placeholder element must be empty` - Multiple reCAPTCHA instances
- `reCAPTCHA has already been rendered` - Duplicate initialization

**No errors:** reCAPTCHA should load silently without errors

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
<!-- Line 3472 -->
<div class="g-recaptcha" data-sitekey="YOUR_NEW_SITE_KEY_HERE"></div>
```

**Backend (functions/index.js.js):**

You'll need to add server-side verification (recommended for production):

```javascript
// Add this dependency
const axios = require('axios');

// In the book function, after receiving the reCAPTCHA response:
const { recaptcha } = req.body;

// Verify reCAPTCHA with Google
const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=YOUR_SECRET_KEY&response=${recaptcha}`;
const recaptchaResult = await axios.post(verificationURL);

if (!recaptchaResult.data.success) {
    return res.status(400).json({ error: "reCAPTCHA verification failed" });
}

// Continue with booking...
```

### 3. Redeploy

```bash
# Deploy hosting (for frontend changes)
firebase deploy --only hosting

# Deploy functions (if backend verification added)
firebase deploy --only functions
```

## Security Best Practices

### 1. Server-Side Validation (Recommended)

Currently, the system only validates reCAPTCHA on the client side. For better security:

- ✅ Add server-side verification in Firebase Functions
- ✅ Use the Secret Key to verify with Google's API
- ✅ Never expose the Secret Key in client-side code

### 2. Rate Limiting

Consider adding rate limiting to prevent abuse:
- Limit submissions per IP address
- Limit submissions per email/phone number
- Use Firebase Functions quotas

### 3. Monitor for Abuse

Check Firebase Console regularly for:
- Unusual spike in bookings
- Failed reCAPTCHA attempts
- Repeated submissions from same source

## Testing Checklist

Before deploying to production:

- [ ] Site key is registered for all production domains
- [ ] reCAPTCHA widget loads without errors
- [ ] reCAPTCHA can be completed successfully
- [ ] Form submission requires reCAPTCHA completion
- [ ] Error message appears if reCAPTCHA not completed
- [ ] Error message appears if reCAPTCHA fails to load
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with privacy extensions/ad blockers disabled
- [ ] Booking confirmation email received after successful submission

## Additional Resources

- [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [reCAPTCHA v2 Documentation](https://developers.google.com/recaptcha/docs/display)
- [reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Support

If you continue experiencing issues after following this guide:

1. Check the browser console for specific error messages
2. Verify all domains are correctly registered
3. Test in incognito mode to rule out browser extensions
4. Check Firebase Console logs for backend errors
5. Contact Google reCAPTCHA support for site key issues
