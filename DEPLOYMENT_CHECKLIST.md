# Deployment and Testing Checklist

## Pre-Deployment Verification

Run the verification script to ensure all configurations are correct:

```bash
./verify-booking-config.sh
```

All checks should pass before deployment.

## Deployment Steps

### 1. Install Dependencies (if not already installed)

```bash
cd functions
npm install
cd ..
```

### 2. Deploy Firebase Functions

```bash
cd functions
firebase deploy --only functions
```

Expected output:
```
✔ functions[book(us-central1)] Successful update operation.
✔ functions[bookings(us-central1)] Successful update operation.
```

### 3. Deploy Firebase Hosting

```bash
cd ..
firebase deploy --only hosting
```

Expected output:
```
✔ hosting[fxnr-web]: file upload complete
✔ hosting[fxnr-web]: version finalized
✔ hosting[fxnr-web]: release complete
```

### 4. Verify Deployment

Check that functions are live:
```bash
curl https://us-central1-fxnr-web.cloudfunctions.net/bookings
```

Should return JSON array of bookings (or empty array if no bookings exist).

## Post-Deployment Testing

### Test 1: CORS Validation

**Method:** Browser DevTools

1. Open `https://www.rajala-services.com`
2. Open DevTools (F12) → Network tab
3. Scroll to booking calendar
4. Check Network requests to Firebase Functions
5. Verify response headers include:
   - ✅ `Access-Control-Allow-Origin: https://www.rajala-services.com`
   - ✅ `Access-Control-Allow-Credentials: true`

**Expected Result:** No CORS errors in console

### Test 2: OPTIONS Preflight Requests

**Method:** Command Line

```bash
curl -X OPTIONS \
  -H "Origin: https://www.rajala-services.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://us-central1-fxnr-web.cloudfunctions.net/bookings
```

**Expected Result:** HTTP 200 status with appropriate CORS headers

### Test 3: Bookings Endpoint

**Method:** Browser or Command Line

```bash
curl https://us-central1-fxnr-web.cloudfunctions.net/bookings
```

**Expected Results:**
- ✅ HTTP 200 status
- ✅ JSON array response
- ✅ No 503 errors
- ✅ Response time < 2 seconds

### Test 4: reCAPTCHA Loading

**Method:** Browser

1. Navigate to `https://www.rajala-services.com`
2. Scroll to booking calendar section
3. Open DevTools Console
4. Check for reCAPTCHA errors
5. Verify reCAPTCHA widget appears

**Expected Results:**
- ✅ No console errors
- ✅ reCAPTCHA widget loads and displays
- ✅ Widget is interactive

### Test 5: Error Handling - 503 Simulation

**Method:** Browser DevTools

1. Open `https://www.rajala-services.com`
2. Open DevTools → Network tab
3. Right-click on network request → Block request pattern
4. Block `*.cloudfunctions.net`
5. Try to load calendar data

**Expected Result:** User-friendly error message in Finnish appears

### Test 6: Error Handling - reCAPTCHA Not Loaded

**Method:** Browser with Ad Blocker

1. Enable ad blocker or privacy extension that blocks Google
2. Navigate to booking form
3. Try to submit form

**Expected Results:**
- ✅ Clear error message: "reCAPTCHA ei ole latautunut..."
- ✅ Form does not submit
- ✅ No JavaScript errors

### Test 7: Complete Booking Flow

**Method:** Manual Testing

1. Navigate to `https://www.rajala-services.com`
2. Select a future date (weekday)
3. Select an available time slot
4. Choose a service type
5. Fill in booking details:
   - Name: Test User
   - Email: test@example.com
   - Phone: +358 401234567
6. Complete reCAPTCHA
7. Submit booking

**Expected Results:**
- ✅ Form submits successfully
- ✅ Success message displays
- ✅ Progress bar animates
- ✅ Confirmation email sent
- ✅ Booking appears in Firebase Console → Firestore → varaukset

### Test 8: Cache Control Verification

**Method:** Browser DevTools

1. Open `https://www.rajala-services.com`
2. Open DevTools → Network tab
3. Load booking calendar
4. Check response headers for bookings endpoint

**Expected Headers:**
```
Cache-Control: public, max-age=60, s-maxage=300
```

### Test 9: Cross-Browser Testing

Test on multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

All should work without CORS errors.

### Test 10: Mobile Testing

Test on mobile devices:
- [ ] iPhone/iPad (Safari)
- [ ] Android (Chrome)

Verify:
- ✅ Calendar loads
- ✅ reCAPTCHA works on mobile
- ✅ Form submits successfully

## Monitoring

### Firebase Console Logs

Monitor for the first 24 hours after deployment:

1. Go to Firebase Console → Functions → Logs
2. Filter by `book` and `bookings` functions
3. Watch for:
   - ❌ 503 errors
   - ❌ CORS errors
   - ❌ Timeout errors
   - ✅ Successful bookings

### Expected Log Entries

**Successful Booking:**
```
Function execution started
Function execution took 1234 ms
Finished with status: 'ok'
```

**Error (should be rare):**
```
Error creating booking: [error details]
timestamp: 2024-XX-XXTXX:XX:XX.XXXZ
```

## Rollback Plan

If critical issues are found after deployment:

### Quick Rollback

```bash
# Revert to previous hosting version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# Or redeploy previous functions version
cd functions
git checkout HEAD~1 index.js.js
firebase deploy --only functions
```

### Complete Rollback

```bash
# Revert git changes
git revert HEAD

# Redeploy
firebase deploy
```

## Success Criteria

Deployment is successful when:

- [x] All verification script checks pass
- [ ] CORS headers present in responses
- [ ] No 503 errors for 1 hour
- [ ] OPTIONS requests return 200
- [ ] reCAPTCHA loads without errors
- [ ] Test booking completes successfully
- [ ] Confirmation email received
- [ ] User-friendly error messages work
- [ ] No security vulnerabilities (CodeQL scan passed)
- [ ] All browsers tested successfully
- [ ] Mobile devices work correctly

## Troubleshooting

### Issue: Still getting CORS errors

**Check:**
1. Are functions deployed? `firebase functions:list`
2. Is the domain exactly correct? (www.rajala-services.com vs rajala-services.com)
3. Clear browser cache
4. Check Firebase Console logs for CORS middleware errors

**Solution:**
- Verify origin list in `functions/index.js.js`
- Redeploy functions
- Wait 2-3 minutes for propagation

### Issue: Still getting 503 errors

**Check:**
1. Firebase billing/quota
2. Firestore security rules
3. Function timeout settings
4. Cold start times

**Solution:**
- Check Firebase Console → Usage & Billing
- Review Firestore rules
- Consider increasing function memory/timeout in firebase.json

### Issue: reCAPTCHA not loading

**Check:**
1. Site key registered for domain?
2. CSP allows Google domains?
3. Ad blocker active?
4. Check browser console for specific errors

**Solution:**
- Verify reCAPTCHA Admin Console settings
- Test in incognito mode
- See RECAPTCHA_CONFIGURATION.md

## Support Documentation

- **BOOKING_CALENDAR_FIXES.md** - Complete implementation details
- **RECAPTCHA_CONFIGURATION.md** - reCAPTCHA setup and troubleshooting
- **verify-booking-config.sh** - Automated configuration checker

## Contact

For deployment issues:
- Check Firebase Console first
- Review documentation files
- Check GitHub Issues for similar problems
