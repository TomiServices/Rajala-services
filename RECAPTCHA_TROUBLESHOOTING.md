# reCAPTCHA Troubleshooting Guide

## "Invalid Key Type" Error

If you're seeing an "invalid key type" error with reCAPTCHA, follow these steps to resolve it:

### Current Configuration
- **Implementation Type**: reCAPTCHA v2 Checkbox ("I'm not a robot")
- **Current Site Key**: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- **Location in Code**: `index.html` line 3544

### Steps to Fix

#### 1. Verify reCAPTCHA Version
The current implementation uses **reCAPTCHA v2 Checkbox**. Ensure your site key is created for v2 Checkbox, not v3.

To verify in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin):
1. Log in with the account that created the site key
2. Find the site key `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
3. Check the "reCAPTCHA type" - it should show **"reCAPTCHA v2"** with **"Checkbox"** selected
4. If it shows "reCAPTCHA v3", you need to either:
   - Create a new v2 Checkbox site key, OR
   - Upgrade the implementation to use v3 (requires code changes)

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
If the current key was created for v3 instead of v2, create a new key:

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to create a new site
3. Enter:
   - **Label**: "Rajala Services Booking Calendar"
   - **reCAPTCHA type**: Select **"reCAPTCHA v2"**
   - **Checkbox**: Select **"I'm not a robot" Checkbox**
   - **Domains**: Add all domains listed above
4. Accept terms and submit
5. Copy the new **Site Key** and **Secret Key**

#### 4. Update Configuration

##### Update Frontend (Site Key)
Edit `index.html` at line 3544:

```html
<div class="g-recaptcha" data-sitekey="YOUR_NEW_SITE_KEY_HERE"></div>
```

##### Update Backend (Secret Key)
The secret key is stored in Firebase Functions configuration. Update it using:

```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_SECRET_KEY_HERE"
firebase deploy --only functions
```

### Alternative: Use reCAPTCHA v3

If you prefer to use reCAPTCHA v3 (invisible, score-based), you'll need to:

1. Create a v3 site key in the reCAPTCHA Admin Console
2. Remove the checkbox div from the HTML
3. Update the JavaScript to use v3 API
4. Update the backend verification logic

This requires significant code changes and is not recommended unless you specifically need v3 features.

### Verify the Fix

After updating the configuration:

1. Clear your browser cache
2. Open the booking page
3. Scroll to the booking calendar
4. Select a date and time
5. Fill in the booking form
6. Verify the reCAPTCHA checkbox appears
7. Check the checkbox and submit the form
8. Verify no errors appear in the browser console

### Common Issues

**"Invalid domain for site key"**
- The domain isn't registered for this site key
- Add the domain in the reCAPTCHA Admin Console

**"ERROR for site owner: Invalid key type"**
- The site key was created for v3, but the code uses v2
- Create a new v2 checkbox site key

**"reCAPTCHA verification failed"**
- The secret key is incorrect or not configured
- Update the secret key in Firebase Functions config

### Need Help?

If you continue to experience issues:

1. Check the browser console for specific error messages
2. Verify the secret key is correctly configured in Firebase Functions
3. Ensure all domains are whitelisted in the reCAPTCHA Admin Console
4. Contact Google reCAPTCHA support if the issue persists
