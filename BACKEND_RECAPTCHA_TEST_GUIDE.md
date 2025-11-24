# Backend reCAPTCHA Validation - Testing Guide

This guide explains how to test the improved backend reCAPTCHA validation logic.

## Quick Start

```bash
# Test missing token (default)
node test-booking-flow.js

# Test against local emulator
firebase emulators:start
node test-booking-flow.js --endpoint http://localhost:5001/fxnr-web/us-central1/book --test missing-token
```

## Test Scenarios

### 1. Missing Token
```bash
node test-booking-flow.js --test missing-token
```
**Expected:** HTTP 400, `{ error: 'missing recaptcha token' }`

### 2. Empty Token
```bash
node test-booking-flow.js --test empty-token
```
**Expected:** HTTP 400, `{ error: 'missing recaptcha token' }`

### 3. Invalid Token
```bash
node test-booking-flow.js --test invalid-token
```
**Expected:** HTTP 401, `{ error: 'recaptcha verification failed', details: {...} }`

### 4. Mock Valid Token
```bash
node test-booking-flow.js --test mock-valid
```
**Expected:** HTTP 401 (fails at Google verification)

## Backend Response Examples

### Missing Token Response
```json
{
  "error": "missing recaptcha token",
  "message": "Turvavarmennus puuttuu. Päivitä sivu ja yritä uudelleen."
}
```

### Failed Verification Response
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

### Successful Booking Response
```json
{
  "success": true,
  "id": "booking-id",
  "message": "Varaus onnistui"
}
```

## Backend Logs (Expected)

### Missing Token
```
Booking request missing recaptcha token
```

### Empty Token
```
reCAPTCHA validation failed: missing or empty token
```

### Invalid Token
```
reCAPTCHA verify response: { success: false, score: undefined, action: undefined, 'error-codes': ['invalid-input-response'] }
reCAPTCHA validation failed. Error codes: ['invalid-input-response']
reCAPTCHA verification failed for booking: recaptcha verification failed
```

### Valid Token (Success)
```
reCAPTCHA verify response: { success: true, score: 0.9, action: 'booking', 'error-codes': undefined }
reCAPTCHA verification passed with score: 0.9
Booking created: booking-id-here
```

## Security Verification

### ✅ NOT Logged (Secure)
- RECAPTCHA_SECRET
- reCAPTCHA token from client
- challenge_ts (timing info)
- hostname (server info)

### ✅ IS Logged (Debug Info)
- success (boolean)
- score (number)
- action (string)
- error-codes (array)

## See Also

- `RECAPTCHA_TEST_CHECKLIST.md` - Comprehensive manual testing checklist
- `test-booking-flow.js` - Automated test script
