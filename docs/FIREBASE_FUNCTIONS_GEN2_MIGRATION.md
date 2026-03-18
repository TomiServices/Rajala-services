# Firebase Functions Gen2 Migration Guide

## Overview

This document describes the migration of Rajala Services Firebase Functions from Gen1 to Gen2 syntax. The migration was completed on November 22, 2024.

## What Changed

### 1. Import Statements

**Before (Gen1):**
```javascript
const functions = require('firebase-functions');
const cors = require('cors');

// Firestore triggers
exports.myTrigger = functions.firestore
  .document('collection/{docId}')
  .onWrite((change, context) => { ... });

// HTTP functions
exports.myEndpoint = functions.https.onRequest((req, res) => { ... });
```

**After (Gen2):**
```javascript
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineString } = require('firebase-functions/params');

// Firestore triggers
exports.myTrigger = onDocumentUpdated({
  document: 'collection/{docId}',
  region: 'europe-north1'
}, (event) => { ... });

// HTTP functions
exports.myEndpoint = onRequest({
  region: 'europe-north1',
  cors: ['https://example.com']
}, (req, res) => { ... });
```

### 2. Environment Variables

**Before (Gen1):**
```javascript
const config = functions.config();
const apiKey = config.myservice?.api_key;
```

**After (Gen2):**
```javascript
const { defineString } = require('firebase-functions/params');
const apiKey = defineString('MY_SERVICE_API_KEY');

// Access the value
const key = apiKey.value();
```

### 3. CORS Handling

**Before (Gen1):**
```javascript
const cors = require('cors');
const corsHandler = cors({ origin: true });

exports.myFunction = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Function logic
  });
});
```

**After (Gen2):**
```javascript
exports.myFunction = onRequest({
  cors: ['https://example.com', 'https://www.example.com']
}, async (req, res) => {
  // Function logic - CORS handled automatically
});
```

### 4. Firestore Triggers

**Before (Gen1):**
```javascript
exports.onUpdate = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite((change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const bookingId = context.params.bookingId;
  });
```

**After (Gen2):**
```javascript
exports.onUpdate = onDocumentUpdated({
  document: 'bookings/{bookingId}',
  region: 'europe-north1'
}, (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const bookingId = event.params.bookingId;
});
```

## Functions in This Project

### HTTP Functions

1. **`bookings`** (GET /bookings)
   - Fetches all bookings from Firestore
   - Region: europe-north1
   - CORS: Configured for production domains

2. **`book`** (POST /book)
   - Creates a new booking
   - Validates reCAPTCHA
   - Checks slot availability
   - Syncs to Google Calendar
   - Region: europe-north1
   - CORS: Configured for production domains

3. **`calendarWebhook`** (POST /calendarWebhook)
   - Receives notifications from Google Calendar
   - Syncs changes back to Firestore
   - Region: europe-north1

### Firestore Triggers

1. **`onBookingUpdated`**
   - Triggered when a booking document is updated
   - Syncs changes to Google Calendar
   - Region: europe-north1
   - Document path: `varaukset/{bookingId}`

2. **`onBookingDeleted`**
   - Triggered when a booking document is deleted
   - Removes event from Google Calendar
   - Region: europe-north1
   - Document path: `varaukset/{bookingId}`

## Environment Variables

The following environment variables must be configured for production deployment:

| Variable | Description | Required |
|----------|-------------|----------|
| `RECAPTCHA_SECRET` | reCAPTCHA v3 secret key | Yes |
| `GOOGLE_SERVICE_ACCOUNT` | Google service account JSON (stringified) | Optional* |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID for sync | Optional* |

*Optional: Google Calendar sync will be disabled if not configured

### Setting Environment Variables

**For local development (Emulator):**
```bash
# Create a .env file in the functions directory
cp functions/.env.example functions/.env
# Edit .env and add your values
```

**For production deployment:**
```bash
# Set environment variables using Firebase CLI
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
firebase functions:secrets:set GOOGLE_CALENDAR_ID
```

Or use Google Cloud Console to set environment variables directly.

## Local Testing with Emulator

### Prerequisites
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Install function dependencies
cd functions
npm install
```

### Running the Emulator

```bash
# From project root
firebase emulators:start

# Or with specific emulators
firebase emulators:start --only functions,firestore
```

The emulator will start on:
- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Emulator UI: http://localhost:4000

### Testing HTTP Endpoints

```bash
# Test GET /bookings
curl http://localhost:5001/your-project-id/europe-north1/bookings

# Test POST /book
curl -X POST http://localhost:5001/your-project-id/europe-north1/book \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+358 401234567",
    "aika": "2024-12-01T10:00:00.000Z",
    "services": [],
    "totalPrice": "100€",
    "recaptcha": "test_token"
  }'
```

## Deployment

### Deploy All Functions
```bash
firebase deploy --only functions
```

### Deploy Specific Function
```bash
firebase deploy --only functions:bookings
firebase deploy --only functions:book
firebase deploy --only functions:onBookingUpdated
```

### Deploy with Environment Variables
```bash
# Set secrets first
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
firebase functions:secrets:set GOOGLE_CALENDAR_ID

# Then deploy
firebase deploy --only functions
```

## Benefits of Gen2

1. **Better Performance**: Gen2 functions start faster and scale better
2. **Native CORS Support**: No need for third-party CORS middleware
3. **Environment Variables**: Cleaner and more secure configuration
4. **Better Event Structure**: More consistent event handling
5. **Improved Regions**: Better regional deployment options
6. **Modern SDK**: Access to latest Firebase features

## Breaking Changes

1. **CORS Package Removed**: Native CORS handling means the `cors` npm package is no longer needed
2. **functions.config() Deprecated**: Use `defineString()` and environment variables instead
3. **Event Structure**: Firestore triggers use `event.data` instead of `change` and `context`
4. **HTTP Function Signature**: CORS handling is now part of function configuration

## Troubleshooting

### Functions Not Deploying
- Ensure you're using Node.js 18 or higher
- Check that all environment variables are set
- Verify firebase.json has correct configuration

### CORS Errors
- Ensure the requesting domain is in the `ALLOWED_ORIGINS` array
- For local testing, you may need to add `http://localhost:*` to allowed origins

### Environment Variables Not Found
- For emulator: Ensure .env file exists in functions directory
- For production: Use `firebase functions:secrets:set` to configure
- Check variable names match exactly (case-sensitive)

### Firestore Triggers Not Firing
- Verify the document path matches exactly
- Check that the region is correct (europe-north1)
- Ensure Firestore is enabled in Firebase Console

## Additional Resources

- [Firebase Functions Gen2 Documentation](https://firebase.google.com/docs/functions/2nd-gen)
- [Migrating from Gen1 to Gen2](https://firebase.google.com/docs/functions/version-comparison)
- [Environment Variables in Gen2](https://firebase.google.com/docs/functions/config-env)
- [Firestore Triggers Gen2](https://firebase.google.com/docs/functions/firestore-events)

## Maintenance Notes

### Future Updates

When making changes to Firebase Functions:

1. Always use Gen2 syntax for new functions
2. Use `onRequest` for HTTP functions with built-in CORS
3. Use `onDocumentUpdated`, `onDocumentDeleted` for Firestore triggers
4. Use `defineString()` for environment variables
5. Specify region explicitly (europe-north1)
6. Test locally with emulator before deploying

### Adding New Functions

Example template for new HTTP function:
```javascript
const { onRequest } = require('firebase-functions/v2/https');

exports.myNewFunction = onRequest({
  region: 'europe-north1',
  cors: ALLOWED_ORIGINS
}, async (req, res) => {
  try {
    // Your logic here
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

Example template for new Firestore trigger:
```javascript
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

exports.myNewTrigger = onDocumentCreated({
  document: 'collection/{docId}',
  region: 'europe-north1'
}, async (event) => {
  const data = event.data.data();
  const docId = event.params.docId;
  // Your logic here
});
```

## Migration Checklist

- [x] Update all imports to Gen2 packages
- [x] Convert HTTP functions to `onRequest`
- [x] Convert Firestore triggers to `onDocumentUpdated`/`onDocumentDeleted`
- [x] Replace `functions.config()` with `defineString()`
- [x] Remove CORS middleware, use native CORS
- [x] Add emulator configuration to firebase.json
- [x] Create .env and .env.example files
- [x] Test functions with emulator
- [x] Update documentation
- [x] Deploy to production

---

Last Updated: November 22, 2024
Migration Status: ✅ Complete
