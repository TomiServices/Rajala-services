# Booking System Synchronization Fixes

This document summarizes the fixes made to resolve issues with the booking system's Google Calendar integration, Firestore database saving, and email confirmation functionality.

## Summary of Issues Fixed

### 1. Google Calendar Integration Fix

**Problem:** Google Calendar events were not being created when bookings were made through the website.

**Root Cause:** The reCAPTCHA action validation was failing due to a mismatch between frontend and backend:
- Frontend was sending: `'booking'`
- Backend was expecting: `'submit_booking'`

**Fix:** Updated `functions/index.js` to match the frontend action:
```javascript
// Before
const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: 'submit_booking' });

// After
const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: 'booking' });
```

**Additional Improvements:**
- Added comprehensive debug logging to `createGoogleCalendarEvent()` function
- Added detailed error information in booking response for debugging
- Added logging for calendar initialization and configuration status

### 2. Firestore Database Saving Fix

**Problem:** Booking data wasn't being properly saved or tracked.

**Fix:** The Firestore saving was working correctly but lacked visibility. Added:
- Detailed logging when booking is created in Firestore
- Email status tracking fields (`emailSent`, `emailSentAt`, `emailMethod`)
- Better error handling and logging throughout the booking flow

**New Fields Added to Booking Documents:**
```javascript
{
  // Existing fields...
  emailSent: boolean,        // Whether confirmation email was sent
  emailSentAt: timestamp,    // When email was sent
  emailMethod: string        // 'firebase-extension' or 'nodemailer'
}
```

### 3. Email Confirmation System Fix

**Problem:** Firebase triggers weren't sending confirmation emails to customers.

**Root Cause:** The system relied solely on Firebase Email Extension which may not be installed or configured.

**Fix:** Implemented dual-path email sending in `onBookingCreated` trigger:

1. **Primary Path:** Write to `mail` collection for Firebase Email Extension (if installed)
2. **Fallback Path:** Use Nodemailer directly if Firebase Extension fails

```javascript
exports.onBookingCreated = onDocumentCreated({
  document: `${BOOKINGS_COLLECTION}/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  // Try Firebase Email Extension first
  let mailDocId = await createEmailDocument(bookingData, bookingId);
  
  // Fallback to Nodemailer if Firebase Extension failed
  if (!mailDocId) {
    await sendBookingConfirmationEmail(bookingData);
  }
  
  // Track email status in booking document
  await db.collection(BOOKINGS_COLLECTION).doc(bookingId).update({
    emailSent: true,
    emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    emailMethod: mailDocId ? 'firebase-extension' : 'nodemailer'
  });
});
```

### 4. Google Calendar to Website Synchronization

**Problem:** Need to ensure synchronization from Google Calendar to website is reliable.

**Fix:** Enhanced `calendarWebhook` function with:
- Detailed logging of webhook events
- Statistics tracking (created/updated/deleted counts)
- Better error handling for sync token expiration
- Improved logging for debugging sync issues

## Debug Logging Added

The following logging has been added to help troubleshoot issues:

### Booking Creation
```
Booking created in Firestore: {bookingId}
Booking data retrieved from Firestore: {id, nimi, aika, servicesCount}
Attempting to create Google Calendar event for booking: {bookingId}
Google Calendar event created and linked successfully: {bookingId, googleEventId}
```

### Google Calendar Integration
```
createGoogleCalendarEvent called with bookingData: {...}
Google Calendar integration not configured: {calendarInitialized, calendarIdSet, ...}
Creating Google Calendar event: {summary, start, end, calendarId}
Google Calendar event created successfully: {eventId, htmlLink, status}
```

### Email System
```
onBookingCreated triggered for booking: {bookingId}
Processing email for booking: {bookingId, customerEmail, customerName}
Email document created for Firebase Email Extension: {bookingId, mailDocId, method}
Email sent via Nodemailer fallback: {bookingId, method}
Booking updated with email status: {bookingId, emailSent}
```

### Calendar Webhook
```
Calendar webhook received: {method, resourceState, channelId, ...}
Sync token status: {hasSyncToken, hasWatchDoc}
Incremental sync returned X events
Calendar webhook completed: {eventsProcessed, bookingsCreated, bookingsUpdated, bookingsDeleted}
```

## Environment Variables Required

Ensure the following environment variables are properly configured:

### For Google Calendar Integration
```
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}  # Service account JSON
GOOGLE_CALENDAR_ID=your_calendar_id@group.calendar.google.com
```

### For Email Functionality
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Gmail App Password (16 characters)
EMAIL_FROM=Fixnero <Palvelut@fixnero.fi>
```

### For reCAPTCHA
```
RECAPTCHA_SECRET=your_recaptcha_secret_key
```

## Testing the Fixes

### Test 1: Google Calendar Integration
1. Make a booking through the website
2. Check Firebase Functions logs for:
   - "Booking created in Firestore"
   - "Creating Google Calendar event"
   - "Google Calendar event created successfully"
3. Verify event appears in Google Calendar

### Test 2: Email Confirmation
1. Make a booking with a valid email address
2. Check Firebase Functions logs for:
   - "onBookingCreated triggered"
   - "Email document created" or "Email sent via Nodemailer"
3. Check inbox for confirmation email
4. Verify booking document has `emailSent: true`

### Test 3: Calendar Webhook Sync
1. Create an event directly in Google Calendar
2. Check Firebase Functions logs for:
   - "Calendar webhook received"
   - "Created booking from calendar event"
3. Verify booking appears in Firestore

## Deployment Steps

1. Deploy Firebase Functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

2. Verify deployment:
```bash
# Check functions are deployed
firebase functions:list

# Check logs for errors
firebase functions:log --only book,bookings,onBookingCreated,calendarWebhook
```

3. Test the booking flow end-to-end

## Monitoring

After deployment, monitor the Firebase Console logs for:

✅ Expected: "Booking created in Firestore"
✅ Expected: "Google Calendar event created successfully"
✅ Expected: "Email document created" or "Email sent"
✅ Expected: "Calendar webhook completed"

❌ Watch for: "Google Calendar integration not configured"
❌ Watch for: "createGoogleCalendarEvent failed"
❌ Watch for: "Failed to create email document"
❌ Watch for: "calendarWebhook error"

## Version History

- **v1.2.0:** Initial fixes for reCAPTCHA action mismatch, email dual-path, and enhanced logging
