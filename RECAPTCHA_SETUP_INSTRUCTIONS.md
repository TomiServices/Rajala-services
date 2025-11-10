# reCAPTCHA v3 Migration - Setup Instructions

## ⚠️ IMPORTANT: Action Required

This pull request migrates your booking system from reCAPTCHA v2 to v3. **You must complete the following steps** before deploying to production.

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Access to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [ ] Firebase CLI installed and authenticated
- [ ] Access to Firebase project console

## Step 1: Verify Site Key Type in Google reCAPTCHA Console

🔍 **This is the most critical step**

1. Go to https://www.google.com/recaptcha/admin
2. Log in with the Google account that owns the site key
3. Find site key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
4. **Check the reCAPTCHA type:**

   **If it shows "reCAPTCHA v3":**
   - ✅ Great! The site key matches the new code
   - Continue to Step 2

   **If it shows "reCAPTCHA v2":**
   - ❌ You need to create a new v3 site key
   - Follow instructions in "Creating a New v3 Site Key" section below

## Step 2: Verify Domain Configuration

In the reCAPTCHA Admin Console for your site key:

1. Click on the site key to view settings
2. Verify these domains are listed:
   - `rajala-services.com`
   - `www.rajala-services.com`
   - `fxnr-web.web.app` (optional, for testing)
   - `fxnr-web.firebaseapp.com` (optional, for testing)
   - `localhost` (optional, for local development)

3. If any are missing, add them and save

## Step 3: Configure Secret Key in Firebase Functions

The v3 secret key must be configured in Firebase Functions.

### Check Current Configuration

```bash
firebase functions:config:get recaptcha.secret
```

**If this returns a value:**
- Verify it's the secret key that matches your v3 site key
- If unsure, update it anyway (see below)

**If this returns empty or error:**
- You must set the secret key (see below)

### Update Secret Key

```bash
# Replace YOUR_V3_SECRET_KEY with your actual v3 secret key from reCAPTCHA Admin Console
firebase functions:config:set recaptcha.secret="YOUR_V3_SECRET_KEY"
```

**Important:** The secret key must match the v3 site key, not a v2 key!

## Step 4: Deploy to Firebase

Deploy both hosting (for frontend changes) and functions (for backend changes):

```bash
# Deploy everything
firebase deploy

# OR deploy individually
firebase deploy --only hosting
firebase deploy --only functions
```

## Step 5: Test the Migration

### 5.1 Browser Test

1. Open https://www.rajala-services.com (or your domain)
2. Open browser DevTools (F12) → Console tab
3. Navigate to the booking section
4. Fill out the booking form and submit
5. **Expected behavior:**
   - ✅ No visible reCAPTCHA checkbox
   - ✅ Form submits smoothly
   - ✅ Booking succeeds
   - ✅ No console errors

### 5.2 Backend Test

Check Firebase Functions logs to verify reCAPTCHA is working:

```bash
firebase functions:log --only book --limit 10
```

**Look for:**
```
reCAPTCHA v3 score: 0.9, action: booking
```

**Typical scores:**
- 0.9-1.0: Legitimate user (expected for real users)
- 0.7-0.9: Likely legitimate
- 0.5-0.7: Uncertain (may need monitoring)
- 0.0-0.5: Likely bot (will be rejected)

### 5.3 Error Test

Try submitting without completing the form to ensure validation works.

## Creating a New v3 Site Key

If your current site key is v2, create a new v3 key:

### 1. Create Site Key

1. Go to https://www.google.com/recaptcha/admin
2. Click "+" to add a new site
3. Fill in:
   - **Label:** Rajala Services Booking Calendar v3
   - **reCAPTCHA type:** Select **"reCAPTCHA v3"**
   - **Domains:**
     ```
     rajala-services.com
     www.rajala-services.com
     fxnr-web.web.app
     fxnr-web.firebaseapp.com
     localhost
     ```
   - Accept terms and submit
4. **Copy the new Site Key and Secret Key**

### 2. Update Code

Edit `index.html` (around line 236):
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_NEW_SITE_KEY" async defer></script>
```

Edit `booking-system.js` (line 9):
```javascript
const RECAPTCHA_SITE_KEY = 'YOUR_NEW_SITE_KEY';
```

### 3. Update Firebase Configuration

```bash
firebase functions:config:set recaptcha.secret="YOUR_NEW_SECRET_KEY"
```

### 4. Commit and Deploy

```bash
git add index.html booking-system.js
git commit -m "Update to new v3 site key"
git push
firebase deploy
```

## Troubleshooting

### Issue: "grecaptcha is not defined"

**Cause:** Script not loading

**Fix:**
1. Check Content Security Policy in `firebase.json`
2. Verify script tag in `index.html`
3. Test with ad blocker disabled

### Issue: 401 Error "Score too low"

**Cause:** User scored below threshold (0.5)

**Fix:**
If legitimate users are being rejected, lower the threshold in `functions/index.js.js`:

```javascript
const RECAPTCHA_SCORE_THRESHOLD = 0.3; // More permissive
```

Then redeploy:
```bash
firebase deploy --only functions
```

### Issue: All submissions succeed (no validation)

**Cause:** Secret key not configured

**Fix:**
```bash
firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY"
firebase deploy --only functions
```

## Monitoring and Tuning

### Week 1: Monitor Scores

```bash
# Check logs daily
firebase functions:log --only book | grep "reCAPTCHA v3 score"
```

**Look for:**
- Average score of legitimate users
- Any users being rejected incorrectly
- Bot attempts (very low scores)

### Adjust Threshold if Needed

**Default:** 0.5 (balanced)

**If legitimate users are blocked:**
```javascript
const RECAPTCHA_SCORE_THRESHOLD = 0.3; // More permissive
```

**If bots are getting through:**
```javascript
const RECAPTCHA_SCORE_THRESHOLD = 0.7; // More strict
```

After changing, redeploy:
```bash
firebase deploy --only functions
```

## Documentation

For more details, see:
- `RECAPTCHA_V3_MIGRATION.md` - Complete migration guide
- `RECAPTCHA_CONFIGURATION.md` - Configuration reference
- `RECAPTCHA_TROUBLESHOOTING.md` - Common issues and solutions

## Summary

✅ **What Changed:**
- Removed v2 checkbox (87 lines removed)
- Added v3 invisible verification (30 lines added)
- Added score-based validation on backend
- Updated all documentation

📝 **What You Need to Do:**
1. Verify site key is v3 type
2. Verify domains are configured
3. Set secret key in Firebase
4. Deploy to Firebase
5. Test the booking flow
6. Monitor scores for first week

🎯 **Expected Results:**
- Smoother user experience (no checkbox)
- Better bot protection (score-based)
- Same security level (server validation)
- 100% backwards compatible with existing bookings

## Questions?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Firebase Functions logs
3. Check browser console for errors
4. See `RECAPTCHA_TROUBLESHOOTING.md` for detailed solutions
