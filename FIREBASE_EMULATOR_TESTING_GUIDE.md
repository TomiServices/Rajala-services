# Firebase Emulator Testing Guide

This guide shows you how to test the Rajala Services booking system locally using Firebase Emulator, including reCAPTCHA secret key configuration.

## Prerequisites

- Node.js 18 or higher
- Firebase CLI installed: `npm install -g firebase-tools`
- Dependencies installed in `functions/`: `cd functions && npm install`

## Setup

### 1. Configure Environment Variables

Create a `.env` file in the `functions/` directory:

```bash
cd functions
cp .env.example .env
```

Edit `functions/.env` and add your test configuration:

```env
# reCAPTCHA Secret Key (v3)
# Get from: https://www.google.com/recaptcha/admin
RECAPTCHA_SECRET=your_test_recaptcha_secret_key

# Google Service Account JSON (optional for basic testing)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project"}

# Google Calendar ID (optional for basic testing)
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

**Important Notes**:
- The `.env` file is already in `.gitignore` - it will NOT be committed
- Use test/development credentials, NOT production secrets
- reCAPTCHA secret is REQUIRED for booking submissions to work
- Google Calendar variables are optional - calendar sync will be disabled if not configured

### 2. Verify .gitignore

Ensure your `.env` file is properly ignored:

```bash
git status --ignored
# Should show: functions/.env
```

## Starting the Emulator

### Basic Start

```bash
# From project root
firebase emulators:start
```

This will start:
- **Functions Emulator**: http://localhost:5001
- **Firestore Emulator**: http://localhost:8080
- **Emulator UI**: http://localhost:4000

### Start with Specific Emulators

```bash
# Only functions and Firestore
firebase emulators:start --only functions,firestore

# Import/export data
firebase emulators:start --import=./emulator-data --export-on-exit
```

## Testing reCAPTCHA Integration

### 1. Test the Book Endpoint

#### Using curl

```bash
# First, get a valid reCAPTCHA token from your frontend
# Then test the booking endpoint

curl -X POST http://localhost:5001/rajala-services-dev/us-central1/book \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+358 401234567",
    "aika": "2025-12-01T10:00:00.000Z",
    "services": [{
      "serviceName": "Pesupalvelut",
      "taskName": "Ulkopesu",
      "price": "50€"
    }],
    "totalPrice": "50€",
    "totalNumericPrice": 50,
    "recaptcha": "test_recaptcha_token_here"
  }'
```

#### Expected Responses

**Success (with valid reCAPTCHA)**:
```json
{
  "success": true,
  "id": "booking_id_here",
  "message": "Varaus onnistui"
}
```

**Failure (invalid reCAPTCHA)**:
```json
{
  "error": "Turvavarmennus epäonnistui. Yritä uudelleen."
}
```

### 2. Monitor Function Logs

Watch the emulator console for logs:

```
✔  functions[us-central1-book]: http function initialized (http://localhost:5001/...)
i  functions: reCAPTCHA score: 0.9, action: booking
i  functions: Booking created successfully: abc123
```

### 3. Check Firestore Data

1. Open the Emulator UI: http://localhost:4000
2. Click on "Firestore" tab
3. View the `varaukset` collection
4. Verify booking data was saved correctly

## Testing with Local Frontend

### 1. Update Frontend to Use Emulator

In your local `index.html` or `booking-system.js`, update the API endpoint:

```javascript
// Development - use local emulator
const API_BASE = 'http://localhost:5001/rajala-services-dev/us-central1';

// Production - use deployed functions
// const API_BASE = 'https://us-central1-fxnr-web.cloudfunctions.net';

const response = await fetch(`${API_BASE}/book`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bookingData)
});
```

### 2. Serve Frontend Locally

```bash
# Option 1: Simple HTTP server
npx serve .

# Option 2: Firebase hosting emulator
firebase emulators:start --only hosting,functions,firestore
```

### 3. Test Complete Flow

1. Open http://localhost:5000 (or the port shown)
2. Navigate to booking calendar
3. Select a date and time
4. Fill in the form
5. Complete reCAPTCHA
6. Submit booking
7. Verify success message
8. Check Emulator UI for data

## Testing reCAPTCHA Secret Configuration

### Test 1: Missing Secret

```bash
# Remove RECAPTCHA_SECRET from .env temporarily
# Start emulator
firebase emulators:start

# Try to create a booking
# Expected: Function logs "reCAPTCHA secret key not configured"
```

### Test 2: Invalid Secret

```bash
# Set an invalid secret in .env
RECAPTCHA_SECRET=invalid_secret_key_123

# Start emulator and try booking
# Expected: reCAPTCHA verification fails
```

### Test 3: Valid Secret

```bash
# Set your real test secret in .env
RECAPTCHA_SECRET=YOUR_TEST_SECRET_KEY_HERE_40_CHARS

# Start emulator and try booking with real reCAPTCHA token
# Expected: Booking succeeds
```

## Common Issues and Solutions

### Issue: "reCAPTCHA secret key not configured"

**Cause**: `RECAPTCHA_SECRET` is not set in `.env` file

**Solution**:
1. Create `functions/.env` if it doesn't exist
2. Copy from `functions/.env.example`
3. Add your test reCAPTCHA secret key
4. Restart the emulator

### Issue: "Cannot read properties of undefined"

**Cause**: Environment variables not loaded

**Solution**:
1. Ensure `.env` file is in `functions/` directory (not root)
2. Check file format (no quotes needed for simple values)
3. Restart emulator completely

### Issue: CORS errors in browser

**Cause**: Frontend origin not allowed

**Solution**:
Update `ALLOWED_ORIGINS` in `functions/index.js` for local testing:
```javascript
const ALLOWED_ORIGINS = [
  'http://localhost:5000',  // Add your local dev server
  'http://localhost:3000',
  // ... production origins
];
```

### Issue: reCAPTCHA verification always fails

**Possible Causes**:
1. Using production reCAPTCHA token with test secret
2. Secret key doesn't match site key
3. Token expired (tokens valid for ~2 minutes)

**Solutions**:
1. Ensure test site key and secret key match
2. Generate fresh tokens
3. Check logs for specific error messages

## Advanced Testing

### Test with Mock reCAPTCHA

For automated testing without real reCAPTCHA:

```javascript
// In test environment, temporarily modify verifyRecaptcha function
async function verifyRecaptcha(token) {
  if (process.env.NODE_ENV === 'test') {
    return token === 'test_valid_token'; // Mock validation
  }
  // ... real verification
}
```

### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create test scenario
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:5001/your-project-id/us-central1'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - post:
        url: "/book"
        json:
          name: "Load Test User"
          email: "test@example.com"
          # ... other fields
EOF

# Run load test
artillery run load-test.yml
```

### Integration Tests

```javascript
// Example integration test with emulator
const axios = require('axios');

describe('Booking API', () => {
  const API_BASE = 'http://localhost:5001/rajala-services-dev/us-central1';
  
  it('should reject booking without reCAPTCHA', async () => {
    const response = await axios.post(`${API_BASE}/book`, {
      name: 'Test User',
      email: 'test@example.com',
      // ... missing recaptcha field
    }).catch(err => err.response);
    
    expect(response.status).toBe(400);
    expect(response.data.error).toContain('pakolliset kentät');
  });
  
  it('should reject booking with invalid reCAPTCHA', async () => {
    const response = await axios.post(`${API_BASE}/book`, {
      name: 'Test User',
      email: 'test@example.com',
      recaptcha: 'invalid_token',
      // ... other fields
    }).catch(err => err.response);
    
    expect(response.status).toBe(401);
    expect(response.data.error).toContain('Turvavarmennus epäonnistui');
  });
});
```

## Best Practices

### 1. Use Test Data Only

- Never use production secrets in local `.env`
- Create separate reCAPTCHA keys for testing
- Use test Google Calendar for development

### 2. Keep .env Secure

- Never commit `.env` file (already in `.gitignore`)
- Don't share `.env` file in chat or email
- Rotate test keys if accidentally exposed

### 3. Reset Data Between Tests

```bash
# Clear emulator data
firebase emulators:start --import=./clean-state --export-on-exit

# Or manually delete data in Emulator UI
```

### 4. Monitor Logs

- Watch function logs for errors
- Check reCAPTCHA scores in logs
- Monitor for security issues

## Production Deployment Checklist

Before deploying to production:

- [ ] Tested locally with emulator
- [ ] Verified reCAPTCHA integration works
- [ ] Checked all validation rules
- [ ] Tested error handling
- [ ] Reviewed security logs
- [ ] Confirmed no test secrets in code
- [ ] Environment variables set in Firebase Console
- [ ] Functions deploy successfully

## Resources

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [reCAPTCHA Testing](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do)
- [Firebase Functions Local Testing](https://firebase.google.com/docs/functions/local-emulator)

---

**Last Updated**: 2025-11-23
**Firebase Version**: Gen2
**Emulator Version**: Latest
