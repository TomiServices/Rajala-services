# reCAPTCHA Implementation Verification Checklist

## For Repository Owner: Post-Deployment Verification

This checklist helps verify that the FREE reCAPTCHA v2 implementation is working correctly on the production site.

---

## ✅ Pre-Deployment Verification (Completed)

- [x] Code uses FREE reCAPTCHA v2 API (not Enterprise)
- [x] Site key documented: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- [x] Documentation updated and accurate
- [x] JavaScript syntax validated (no errors)
- [x] Security scan completed (0 vulnerabilities)
- [x] No Enterprise-specific code found

---

## ⚠️ Required: Google reCAPTCHA Console Verification

### Step 1: Verify Site Key Configuration

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Sign in with the Google account that manages the reCAPTCHA keys
3. Find site key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
4. Click on the site key to view settings

**Verify the following:**
- [ ] reCAPTCHA type is **v2 Checkbox** (NOT Enterprise, NOT v3)
- [ ] Status is **Active** (not disabled)
- [ ] Domains include:
  - [ ] `fixnero.fi`
  - [ ] `www.fixnero.fi`
  - [ ] `Webbi1.web.app` (optional, for testing)
  - [ ] `Webbi1.firebaseapp.com` (optional, for testing)

**If site key is missing or incorrect:**
- See `RECAPTCHA_CONFIGURATION.md` section "Creating a New Site Key"
- Or contact: Google reCAPTCHA support

---

## ⚠️ Required: Firebase Functions Configuration

### Step 2: Verify Secret Key

The secret key must match the site key and be configured in Firebase Functions.

**Run this command:**
```bash
firebase functions:config:get recaptcha.secret
```

**Expected result:**
- Should return the secret key value (not empty)
- Secret key should match site key `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

**If secret key is not set or incorrect:**
```bash
# Set the correct secret key (get it from reCAPTCHA Admin Console)
firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY_HERE"

# Redeploy functions to apply the change
firebase deploy --only functions
```

**Security Note:**
- [ ] ❌ **NEVER** commit the secret key to the repository
- [ ] ✅ Keep secret key in Firebase environment config only

---

## ⚠️ Required: Production Testing

### Step 3: Test Booking Flow on Production

Test the complete booking workflow on the live site: `https://www.fixnero.fi`

1. **Test 1: Load reCAPTCHA Widget**
   - [ ] Navigate to the booking section
   - [ ] Scroll to the booking calendar
   - [ ] Verify reCAPTCHA checkbox widget loads and displays
   - [ ] Check browser console (F12) for errors - should be **none**

2. **Test 2: Submit WITHOUT reCAPTCHA (Should Fail)**
   - [ ] Fill out the booking form completely
   - [ ] Do NOT check the reCAPTCHA box
   - [ ] Try to submit
   - [ ] **Expected**: Form validation prevents submission
   - [ ] **Expected**: Error message: "Vahvista että et ole robotti!"

3. **Test 3: Submit WITH reCAPTCHA (Should Succeed)**
   - [ ] Fill out the booking form completely
   - [ ] Check the reCAPTCHA box ("I'm not a robot")
   - [ ] Complete any image challenges if prompted
   - [ ] Submit the form
   - [ ] **Expected**: Booking succeeds
   - [ ] **Expected**: Confirmation message displayed
   - [ ] **Expected**: Confirmation email received

4. **Test 4: Check Browser Console**
   - [ ] Open browser DevTools (press F12)
   - [ ] Go to Console tab
   - [ ] Verify NO reCAPTCHA errors appear
   - [ ] Common errors to watch for:
     - ❌ "Invalid site key"
     - ❌ "Invalid domain for site key"
     - ❌ "reCAPTCHA placeholder element must be empty"

5. **Test 5: Test on Mobile Device**
   - [ ] Open site on mobile phone (iOS or Android)
   - [ ] Navigate to booking section
   - [ ] Verify reCAPTCHA loads correctly
   - [ ] Complete a test booking
   - [ ] Verify mobile UX is smooth

---

## ⚠️ Required: Server-Side Verification

### Step 4: Check Firebase Functions Logs

Verify that server-side reCAPTCHA validation is working.

**Run this command:**
```bash
firebase functions:log --only book
```

**What to look for:**

✅ **Good signs:**
- Successful bookings being processed
- No reCAPTCHA errors

❌ **Warning signs:**
- "reCAPTCHA secret not configured" - Secret key missing
- "reCAPTCHA verification failed" - Token validation failing
- "Error verifying reCAPTCHA" - Connection issues

**If you see errors:**
1. Verify secret key is configured (Step 2)
2. Verify site key and secret key match
3. Verify domains are registered (Step 1)

---

## ✅ Optional: Advanced Verification

### Step 5: Test Edge Cases

1. **Test Expired Token**
   - [ ] Complete reCAPTCHA
   - [ ] Wait 2-3 minutes (token expires)
   - [ ] Try to submit
   - [ ] **Expected**: May fail with validation error

2. **Test Multiple Submissions**
   - [ ] Complete a booking successfully
   - [ ] Immediately try another booking
   - [ ] **Expected**: reCAPTCHA resets and works again

3. **Test with Ad Blockers**
   - [ ] Enable privacy extensions (uBlock Origin, Privacy Badger)
   - [ ] Navigate to booking section
   - [ ] Verify reCAPTCHA still loads (may be blocked by some ad blockers)

4. **Test Different Browsers**
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari (Mac/iOS)
   - [ ] Mobile browsers

---

## 📊 Monitoring Recommendations

### Ongoing Monitoring

1. **Weekly Checks**
   - [ ] Monitor Firebase Functions logs for reCAPTCHA errors
   - [ ] Check booking success rate
   - [ ] Verify no spam bookings getting through

2. **Monthly Review**
   - [ ] Review reCAPTCHA stats in Google Admin Console
   - [ ] Check for unusual patterns or attacks
   - [ ] Verify domains are still registered

3. **Alerts to Set Up**
   - [ ] Firebase Functions error alerts
   - [ ] Unusual spike in failed bookings
   - [ ] Repeated reCAPTCHA failures from same IP

---

## 🆘 Troubleshooting

### Common Issues and Solutions

#### Issue: "Invalid site key" error
**Solution:**
1. Verify site key in `index.html` matches Google Admin Console
2. Check for typos in the site key
3. Ensure domain is registered for this site key

#### Issue: Booking succeeds without reCAPTCHA
**Solution:**
1. Check that secret key is configured in Firebase
2. Verify server-side validation is running
3. Check Firebase Functions logs for errors

#### Issue: reCAPTCHA widget doesn't load
**Solution:**
1. Check browser console for blocked requests
2. Verify CSP headers allow Google domains
3. Test in incognito mode (disables extensions)
4. Check if ad blocker is blocking reCAPTCHA

#### Issue: "reCAPTCHA verification failed" in logs
**Solution:**
1. Verify secret key matches site key
2. Check that domains are registered
3. Ensure token hasn't expired (2-minute lifetime)
4. Verify user completed reCAPTCHA before submission

---

## ✅ Sign-Off Checklist

Complete this checklist after all testing:

- [ ] Google reCAPTCHA Console verified (Step 1)
- [ ] Firebase secret key configured (Step 2)
- [ ] Production testing completed successfully (Step 3)
- [ ] Server-side validation verified (Step 4)
- [ ] No errors in browser console
- [ ] No errors in Firebase Functions logs
- [ ] Test booking completed successfully
- [ ] Confirmation email received
- [ ] Mobile testing completed

**Date Completed**: _______________

**Verified By**: _______________

---

## 📚 Additional Resources

- `RECAPTCHA_CONFIGURATION.md` - Complete configuration guide
- `RECAPTCHA_MIGRATION_SUMMARY.md` - Implementation verification details
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation notes
- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/display)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the documentation files listed above
3. Check Firebase Console logs for specific errors
4. Contact Google reCAPTCHA support for site key issues
5. Contact Firebase support for backend validation issues

---

**Last Updated**: 2025-11-10  
**reCAPTCHA Version**: FREE v2 Checkbox  
**Site Key**: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
