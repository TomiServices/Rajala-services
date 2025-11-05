# Google Analytics 4 Setup Guide

## ⚠️ IMPORTANT: Tracking ID Required

**The Google Analytics Measurement ID (tracking code) was not provided in the task description.**

To complete the Google Analytics setup, you need to:
1. Create a Google Analytics 4 property at https://analytics.google.com/
2. Get your Measurement ID (format: `G-XXXXXXXXXX`)
3. Follow the configuration steps below

## Current Status

Google Analytics 4 (GA4) infrastructure is **already integrated** into the Fixnero website with GDPR-compliant cookie consent.

### Implementation Details

- ✅ GA4 code framework is implemented in `cookie-consent.js` and `cookie-consent.min.js`
- ✅ Cookie consent banner is GDPR compliant
- ✅ Analytics only loads after user accepts cookies
- ✅ All main pages (12) and blog pages (4) include the cookie consent script
- ✅ Content Security Policy updated to allow Google Analytics domains
- ⚠️ **ACTION REQUIRED**: Replace placeholder `G-XXXXXXXXXX` with your actual Google Analytics Measurement ID

## How It Works

1. When a user visits the website, they see a cookie consent banner
2. If they accept cookies, Google Analytics is loaded dynamically
3. If they reject, only essential cookies are used (no tracking)
4. The GA4 tracking code is injected into the page only after consent

## Configuration Required

### Step 1: Get Your Google Analytics 4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property (or use existing one)
3. Go to Admin → Data Streams → Web
4. Copy your Measurement ID (format: `G-XXXXXXXXXX`)

### Step 2: Update the Tracking ID

Edit the file `cookie-consent.js`:

**Find the line containing:**
```javascript
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

**Replace with your actual ID:**
```javascript
const GA_MEASUREMENT_ID = 'G-ABC123XYZ';  // Replace with your actual measurement ID
```

**Tip:** Search for `GA_MEASUREMENT_ID` in the file to locate the configuration.

### Step 3: Rebuild the Minified Version

After updating `cookie-consent.js`, create the minified version:

```bash
# Option 1: Using an online minifier
# Copy the content of cookie-consent.js
# Paste into https://javascript-minifier.com/
# Save the output to cookie-consent.min.js

# Option 2: Using npm (if you have Node.js installed)
npm install -g terser
terser cookie-consent.js -o cookie-consent.min.js -c -m
```

### Step 4: Test the Implementation

1. Clear your browser cookies
2. Visit your website
3. Open browser Developer Tools (F12)
4. Go to Console tab
5. Accept cookies when the banner appears
6. Check that Google Analytics script is loaded:
   - Look for requests to `www.googletagmanager.com/gtag/js`
   - Check for `gtag` function in console: type `window.gtag` (should not be undefined)

### Step 5: Verify in Google Analytics

1. Go to your Google Analytics property
2. Navigate to Reports → Realtime
3. Visit your website in a new tab
4. You should see yourself as an active user in the Realtime report

## Files That Include Google Analytics

### Main Pages (12 pages)
- ✅ index.html
- ✅ autohuolto.html
- ✅ pesupalvelut.html
- ✅ rengastyot.html
- ✅ korjaustyot.html
- ✅ sisapuhdistus.html
- ✅ kiilloitus.html
- ✅ lasikorjaus.html
- ✅ kolhukorjaus.html
- ✅ tietoa-meista.html
- ✅ tyonnaytteet.html
- ✅ tietosuojaseloste.html

### Blog Pages (4 pages)
- ✅ blogi/index.html
- ✅ blogi/milloin-vaihtaa-renkaat.html
- ✅ blogi/sisapuhdistuksen-merkitys.html
- ✅ blogi/auton-kiillotuksen-hyodyt.html

### Pages WITHOUT Analytics (by design)
- cookie-policy.html (cookie policy page)
- test_scaling.html (test page)
- tablet-scaling-test.html (test page)
- webp_test.html (test page)

## GDPR Compliance

The implementation is fully GDPR compliant:

- ✅ **No cookies before consent**: Analytics scripts are not loaded until user accepts
- ✅ **Clear information**: Cookie banner explains cookie usage
- ✅ **Easy opt-out**: Users can reject cookies
- ✅ **Privacy policy**: Link to detailed cookie policy
- ✅ **IP anonymization**: User IPs are anonymized
- ✅ **Secure cookies**: SameSite=Lax and Secure flags are set

## Analytics Features Enabled

The current implementation includes:

```javascript
gtag('config', GA_MEASUREMENT_ID, {
    'anonymize_ip': true,           // Anonymizes user IP addresses
    'cookie_flags': 'SameSite=Lax;Secure'  // Secure cookie handling
});
```

## Troubleshooting

### Test Page Available

A test page is available at `/ga-test.html` to verify your Google Analytics setup:
- Visit `https://yoursite.com/ga-test.html`
- Follow the on-screen instructions
- Test event tracking
- Verify configuration

### Analytics not showing data?

1. **Check the Measurement ID**: Ensure it's correct in `cookie-consent.js` and `cookie-consent.min.js`
2. **Clear cache**: Clear browser cache and cookies
3. **Check consent**: Make sure you accepted cookies
4. **Developer console**: Look for errors in browser console (F12)
5. **AdBlockers**: Disable ad blockers for testing
6. **Wait**: It can take 24-48 hours for data to appear in reports (but Realtime should work immediately)

### Cookie banner not appearing?

1. Clear browser cookies
2. Check browser console for JavaScript errors
3. Ensure `cookie-consent.min.js` is loaded correctly

## Support

For Google Analytics setup questions:
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)

For website-specific questions:
- Email: info@fixnero.fi
- Phone: 040 1935001

---

**Last Updated**: November 2025
**Status**: Awaiting Google Analytics Measurement ID configuration
