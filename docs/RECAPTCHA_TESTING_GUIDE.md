# reCAPTCHA v3 Fix - Testing and Verification Guide

## Overview

This guide provides step-by-step instructions to test and verify the reCAPTCHA v3 fix for the "invalid listener argument" error.

## Pre-Deployment Testing

### 1. Code Syntax Verification

Both frontend and backend code have been validated:

```bash
# Frontend syntax check
node -c booking-system.js
# Result: ✓ No syntax errors

# Backend syntax check
node -c functions/index.js.js
# Result: ✓ No syntax errors
```

### 2. Local Testing (Optional)

If you have the site running locally:

1. Open `/tmp/recaptcha-test.html` in a browser
2. Run the three automated tests:
   - Test 1: Verify grecaptcha loads
   - Test 2: Execute reCAPTCHA once
   - Test 3: Execute multiple times

Expected results:
- ✓ All tests pass with green checkmarks
- ✓ No console errors
- ✓ Tokens are generated successfully

## Post-Deployment Testing

### Test 1: Verify reCAPTCHA Script Loads

**Steps:**
1. Open your booking page: `https://www.fixnero.fi`
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Filter by "recaptcha"
5. Reload the page

**Expected Results:**
- ✓ Request to `google.com/recaptcha/api.js` succeeds (status 200)
- ✓ No blocked or failed requests
- ✓ reCAPTCHA badge appears in bottom-right corner

**Troubleshooting:**
- If blocked: Check ad blockers, disable privacy extensions
- If 404: Verify site key in index.html matches reCAPTCHA console
- If CORS error: Check Content Security Policy in firebase.json

### Test 2: Verify Frontend Integration

**Steps:**
1. Open booking page
2. Open Browser DevTools → Console tab
3. Type: `typeof grecaptcha`
4. Press Enter

**Expected Results:**
- Console shows: `"object"` (not "undefined")
- No errors in console log

**Additional Checks:**
```javascript
// In browser console, test the function exists
grecaptcha.ready
// Should show: ƒ ready() { ... }

// Test execute function exists
grecaptcha.execute
// Should show: ƒ execute() { ... }
```

### Test 3: Complete Booking Flow

**Steps:**
1. Navigate to booking section
2. Select a date (weekday)
3. Select a time slot
4. Select a service
5. Fill in all form fields:
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "+358 401234567"
6. Submit the form
7. Watch the console and network tab

**Expected Results:**
- ✓ No "invalid listener argument" error
- ✓ Network shows POST to `/book` endpoint
- ✓ Response status: 200 OK
- ✓ Success message displayed: "Varaus onnistui!"
- ✓ No Finnish error message about "Turvavarmennus epäonnistui"

**Console Log Check:**
Should see something like:
```
reCAPTCHA v3 score: 0.9, action: booking
Successfully created booking: [booking_id]
```

### Test 4: Backend Validation

**Steps:**
1. After successful booking, check Firebase Functions logs:
```bash
firebase functions:log --only book --limit 5
```

**Expected Log Output:**
```
Function execution took 1234 ms
reCAPTCHA v3 score: 0.9, action: booking
Booking created successfully
```

**Score Interpretation:**
- 0.9-1.0: ✓ Excellent - legitimate user
- 0.7-0.9: ✓ Good - likely legitimate
- 0.5-0.7: ⚠ Borderline - monitor
- 0.0-0.5: ✗ Low - likely bot (will be rejected)

### Test 5: Error Handling

**Test 5.1: Missing reCAPTCHA Token**

This tests if backend properly validates the token.

**Steps:**
1. Modify the form submission temporarily (for testing only)
2. Comment out reCAPTCHA execution in booking-system.js
3. Try to submit booking

**Expected Results:**
- ✓ Form submission fails
- ✓ Error message: "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
- ✓ Status code: 401

**Test 5.2: Low reCAPTCHA Score**

This is harder to test manually, but can be verified in logs.

**Monitor for:**
- Users with scores below 0.5 getting rejected
- Error message: "Turvavarmennus epäonnistui. Jos ongelma jatkuu, ota yhteyttä asiakaspalveluun."

### Test 6: Multiple Browsers and Devices

**Desktop Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile Devices:**
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] iOS Chrome

**For Each Browser/Device:**
1. Load booking page
2. Check console for errors
3. Complete a test booking
4. Verify success message

## Common Issues During Testing

### Issue: "reCAPTCHA ei ole ladattu"

**Diagnosis:**
- Check Network tab: Is `api.js` loading?
- Check Console: Any CORS or CSP errors?
- Check Extensions: Try incognito mode

**Fix:**
- Disable ad blockers
- Check CSP in firebase.json
- Verify site key is correct

### Issue: 401 Error with Finnish Message

**Diagnosis:**
Check exact error message:

**If "Turvavarmennus puuttuu":**
- Frontend not sending token
- Check booking-system.js executeRecaptcha call

**If "Virheellinen turvavarmennustunnus":**
- Token is invalid
- Check site key matches secret key
- Verify both are v3 keys

**If "Turvavarmennus epäonnistui":**
- Score too low
- Check Firebase logs for actual score
- Consider lowering threshold if legitimate users affected

### Issue: Network Error

**Diagnosis:**
- Check if backend is reachable
- Verify CORS configuration
- Check Firebase Functions are deployed

## Performance Testing

### Load Time Check

**Steps:**
1. Open DevTools → Network tab
2. Reload page with cache disabled (Ctrl+Shift+R)
3. Check timing for recaptcha script

**Expected:**
- reCAPTCHA script loads in < 1 second
- Total page load < 3 seconds
- DOMContentLoaded < 2 seconds

### Multiple Submissions Test

**Steps:**
1. Submit 3 bookings in quick succession (2-3 minutes apart)
2. Monitor for rate limiting or token reuse errors

**Expected:**
- ✓ All 3 bookings succeed
- ✓ Different tokens generated each time
- ✓ No "timeout-or-duplicate" errors

## Monitoring After Deployment

### Week 1: Daily Checks

**Daily Tasks:**
```bash
# Check booking success rate
firebase functions:log --only book | grep "successfully" | wc -l

# Check reCAPTCHA scores
firebase functions:log --only book | grep "reCAPTCHA v3 score"

# Check for errors
firebase functions:log --only book | grep "error"
```

**Look For:**
- Average score of legitimate bookings (should be 0.7+)
- Any 401 errors from real users
- Console errors reported by users

### Metrics to Track

1. **Booking Success Rate:**
   - Before fix: < 50% (due to error)
   - After fix: > 95%

2. **Average reCAPTCHA Score:**
   - Target: 0.7 - 0.9
   - If too low: Consider lowering threshold
   - If too high: Current setup is good

3. **Error Rate:**
   - Target: < 5%
   - Most should be validation errors, not reCAPTCHA

## Rollback Plan

If critical issues occur:

### Quick Rollback

```bash
# Revert to previous commit
git revert HEAD~2
git push

# Redeploy
firebase deploy --only hosting,functions
```

### Verify Rollback

1. Check booking page loads
2. Verify old reCAPTCHA (if applicable) works
3. Monitor for stability

## Sign-Off Checklist

Before marking as complete:

- [ ] All syntax checks passed
- [ ] Local testing completed (if possible)
- [ ] Deployed to staging/production
- [ ] Post-deployment Test 1: Script loads ✓
- [ ] Post-deployment Test 2: Frontend integration ✓
- [ ] Post-deployment Test 3: Complete booking flow ✓
- [ ] Post-deployment Test 4: Backend validation ✓
- [ ] Post-deployment Test 5: Error handling ✓
- [ ] Post-deployment Test 6: Multiple browsers ✓
- [ ] Documentation updated ✓
- [ ] Monitoring set up ✓
- [ ] Team notified of changes ✓

## Success Criteria

✅ **Fix is successful if:**
1. No "invalid listener argument" errors in console
2. Booking submissions succeed without reCAPTCHA errors
3. Backend logs show valid reCAPTCHA scores
4. Finnish error messages display correctly
5. Success rate > 95%
6. No user complaints about "Turvavarmennus epäonnistui"

---

**Last Updated:** 2024-11-10  
**Version:** 1.0  
**Status:** Ready for deployment verification
