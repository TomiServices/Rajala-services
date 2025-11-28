# reCAPTCHA Validation - Manual Test Checklist

This document provides a comprehensive checklist for manually testing the reCAPTCHA validation improvements in the booking flow.

## Prerequisites

- [ ] Firebase Functions deployed with updated code
- [ ] RECAPTCHA_SECRET configured in Firebase Secret Manager or environment
- [ ] reCAPTCHA v3 site key configured in booking-system.js
- [ ] Browser with DevTools available for testing

## Test Cases

### 1. Missing reCAPTCHA Token

**Scenario:** Backend receives booking request without reCAPTCHA token

**Steps:**
1. Use the test script: `node test-booking-flow.js --test missing-token`
2. OR manually send POST request to `/book` endpoint without `recaptcha` field

**Expected Result:**
- HTTP Status: 400
- Response Body:
  ```json
  {
    "error": "missing recaptcha token",
    "message": "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
  }
  ```
- Backend logs: "Booking request missing recaptcha token"

---

### 2. Empty reCAPTCHA Token

**Scenario:** Backend receives booking request with empty reCAPTCHA token

**Steps:**
1. Use the test script: `node test-booking-flow.js --test empty-token`
2. OR manually send POST request with `recaptcha: ""`

**Expected Result:**
- HTTP Status: 400
- Response Body:
  ```json
  {
    "error": "missing recaptcha token",
    "message": "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
  }
  ```
- Backend logs: "reCAPTCHA validation failed: missing or empty token"

---

### 3. Invalid reCAPTCHA Token Format

**Scenario:** Backend receives booking request with malformed token

**Steps:**
1. Use the test script: `node test-booking-flow.js --test invalid-token`
2. OR manually send POST request with `recaptcha: "invalid-token-123"`

**Expected Result:**
- HTTP Status: 401
- Response Body:
  ```json
  {
    "error": "recaptcha verification failed",
    "message": "Turvavarmennus epäonnistui. Yritä uudelleen.",
    "details": {
      "error-codes": ["invalid-input-response"],
      "reason": "Google reCAPTCHA verification returned success:false"
    }
  }
  ```
- Backend logs should include:
  - "reCAPTCHA verify response: { success: false, ... }"
  - "reCAPTCHA validation failed. Error codes: ['invalid-input-response']"

---

### 4. Valid reCAPTCHA Token (Success Path)

**Scenario:** Complete end-to-end booking with valid reCAPTCHA

**Steps:**
1. Open browser and navigate to booking page
2. Open DevTools → Console tab
3. Select a service and time slot
4. Fill in all required fields:
   - Name: "Test User"
   - Email: "test@example.com"
   - Phone: "+358 40 1234567"
5. Submit the booking form
6. Monitor console for reCAPTCHA execution
7. Check Network tab for POST request to `/book`

**Expected Result:**
- Console shows: "reCAPTCHA execution successful"
- HTTP Status: 200
- Response Body:
  ```json
  {
    "success": true,
    "id": "booking-id-here",
    "message": "Varaus onnistui"
  }
  ```
- Backend logs should include:
  - "reCAPTCHA verify response: { success: true, score: 0.9, action: 'booking', ... }"
  - "reCAPTCHA verification passed with score: 0.9"
  - "Booking created: booking-id-here"
- Frontend shows success message
- Booking appears in Firestore
- Email confirmation sent

---

### 5. Low reCAPTCHA Score (Bot Detection)

**Scenario:** reCAPTCHA returns success but score is below threshold

**Note:** This is difficult to test manually as it requires Google to assign a low score. Typically happens when automated tools or suspicious behavior is detected.

**Expected Result (if triggered):**
- HTTP Status: 401
- Response Body:
  ```json
  {
    "error": "recaptcha verification failed",
    "message": "Turvavarmennus epäonnistui. Yritä uudelleen.",
    "details": {
      "score": 0.3,
      "threshold": 0.5,
      "reason": "Score below acceptable threshold"
    }
  }
  ```
- Backend logs: "reCAPTCHA score too low: 0.3 (threshold: 0.5)"

---

### 6. reCAPTCHA Service Unavailable

**Scenario:** Google reCAPTCHA service is down or unreachable

**Note:** This can be tested by temporarily misconfiguring RECAPTCHA_SECRET

**Steps:**
1. Temporarily set RECAPTCHA_SECRET to invalid value
2. Submit booking form

**Expected Result:**
- HTTP Status: 401
- Response Body includes:
  ```json
  {
    "error": "recaptcha verification failed",
    "message": "Turvavarmennus epäonnistui. Yritä uudelleen.",
    "details": {
      "error-codes": ["invalid-input-secret"],
      "reason": "Google reCAPTCHA verification returned success:false"
    }
  }
  ```

---

## Security Verification

### Logging Safety Check

**Verify that sensitive data is NOT logged:**

1. Check backend logs after a successful booking
2. Confirm the following are NOT present in logs:
   - [ ] RECAPTCHA_SECRET value
   - [ ] reCAPTCHA token string from client
   - [ ] User passwords or sensitive personal data

**What SHOULD be logged:**
- [ ] Google verify response metadata (success, score, action, error-codes)
- [ ] Booking creation success/failure
- [ ] Generic error messages

---

## Browser Console Tests

### Frontend reCAPTCHA Execution

1. Open booking page
2. Open DevTools → Console
3. Execute manually: `executeRecaptcha('booking')`
4. Verify it returns a token string (long alphanumeric)
5. Verify no errors in console

### Network Request Inspection

1. Open DevTools → Network tab
2. Filter by "book"
3. Submit booking
4. Click on the `/book` request
5. Check Request Payload includes:
   ```json
   {
     "name": "...",
     "email": "...",
     "phone": "...",
     "aika": "2024-...",
     "services": [...],
     "totalPrice": "...",
     "totalNumericPrice": 0,
     "recaptcha": "long-token-string-here"
   }
   ```
6. Verify `recaptcha` field is present and non-empty

---

## Edge Cases

### Multiple Rapid Submissions

**Test:** Submit booking multiple times rapidly

**Expected:**
- Each submission should trigger new reCAPTCHA token
- Backend should accept each if valid
- Rate limiting may apply (if configured)

### Browser with reCAPTCHA Blocked

**Test:** Use browser with reCAPTCHA script blocked (e.g., strict privacy settings)

**Expected:**
- Frontend shows error: "reCAPTCHA ei ole ladattu. Päivitä sivu ja yritä uudelleen."
- Booking form should not submit
- Fallback contact information displayed

---

## Post-Deployment Verification

After deploying to production:

1. [ ] Test complete booking flow on live site
2. [ ] Verify Firebase Functions logs show proper reCAPTCHA logging
3. [ ] Confirm no sensitive data in logs
4. [ ] Test on multiple browsers (Chrome, Firefox, Safari)
5. [ ] Test on mobile devices
6. [ ] Monitor error rates for 24 hours
7. [ ] Check for any unusual patterns in logs

---

## Rollback Plan

If issues are discovered:

1. [ ] Revert backend functions to previous version
2. [ ] Monitor that bookings resume normal operation
3. [ ] Review logs to identify root cause
4. [ ] Fix and re-test before re-deploying

---

## Success Criteria

- [ ] All test cases pass
- [ ] No sensitive data logged
- [ ] Error messages are clear and helpful
- [ ] Legitimate users can successfully book
- [ ] Bot/automated submissions are rejected
- [ ] Backend logs provide actionable debugging information
