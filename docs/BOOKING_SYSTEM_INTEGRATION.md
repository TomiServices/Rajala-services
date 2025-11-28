# Booking System Integration - Email + Google Calendar

This document explains how the Rajala Services booking system integrates email confirmations and Google Calendar synchronization.

## System Overview

When a customer makes a booking, the system performs three main operations:

1. **Save to Firestore** - Store booking data in the database
2. **Send Email** - Send confirmation email to customer (via Firestore trigger)
3. **Sync to Google Calendar** - Create event in Google Calendar (async)

## Booking Flow Diagram

```
Customer submits booking form
          ↓
    Validate input
          ↓
   Check slot availability
          ↓
  Save to Firestore ─────────┐
          ↓                   │
   Return success            │
          ↓                   │
Customer sees confirmation   │
                             │
                             ├→ Firestore trigger: onBookingCreated
                             │        ↓
                             │  Send confirmation email
                             │
                             └→ Async: Create Google Calendar event
                                      ↓
                                Update booking with googleEventId
```

## Components

### 1. Frontend (booking-system.js)

**Location**: `/booking-system.js`

**Responsibilities**:
- Display FullCalendar UI
- Validate form input
- Execute reCAPTCHA
- Send booking to `/book` endpoint
- Display success/error messages

**Key Features**:
- No direct Firebase access (security)
- Mentions email confirmation in success message
- Refreshes calendar after booking

### 2. Backend HTTP Endpoint (functions/index.js)

**Function**: `exports.book`

**Responsibilities**:
- Validate reCAPTCHA token
- Validate email and phone formats
- Check business hours and weekdays
- Verify slot availability
- Create booking in Firestore transaction
- Trigger async Google Calendar sync

**Key Code**:
```javascript
// Create booking in transaction
await db.runTransaction(async (transaction) => {
  const available = await isSlotAvailable(bookingDate);
  if (!available) throw new Error('SLOT_UNAVAILABLE');
  
  const bookingData = {
    nimi: name,
    sahkoposti: email,
    puhelin: phone,
    aika: admin.firestore.Timestamp.fromDate(bookingDate),
    services: services,
    totalPrice: totalPrice || 'Hinta sovittaessa',
    totalNumericPrice: totalNumericPrice || 0,
    luotu: admin.firestore.FieldValue.serverTimestamp(),
    googleEventId: null,
    syncedToGoogle: false
  };
  
  transaction.set(bookingRef, bookingData);
});

// Async Google Calendar sync (doesn't block response)
(async () => {
  try {
    const eventId = await createGoogleCalendarEvent(createdData);
    if (eventId) {
      await bookingRef.update({
        googleEventId: eventId,
        syncedToGoogle: true,
        googleSyncedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.error('Async Google sync failed', e);
  }
})();

return res.status(200).json({ success: true, id: bookingRef.id });
```

### 3. Email Trigger (functions/index.js)

**Function**: `exports.onBookingCreated`

**Trigger**: When a document is created in `varaukset` collection

**Responsibilities**:
- Automatically send confirmation email
- Skip emails for bookings synced from Google Calendar
- Format booking details in HTML email
- Handle errors gracefully (don't break booking if email fails)

**Key Code**:
```javascript
exports.onBookingCreated = onDocumentCreated({
  document: `varaukset/{bookingId}`,
  region: 'us-central1'
}, async (event) => {
  const bookingData = event.data.data();
  
  // Skip email for bookings synced from Google Calendar
  if (bookingData.syncedFromGoogle) {
    console.log('Booking synced from Google Calendar - skipping email');
    return null;
  }
  
  try {
    await sendBookingConfirmationEmail(bookingData);
  } catch (err) {
    console.error('Error sending email:', err);
    // Don't throw - email failure shouldn't affect booking
  }
});
```

### 4. Google Calendar Sync (functions/index.js)

**Functions**: 
- `createGoogleCalendarEvent` - Create event in Google Calendar
- `onBookingUpdated` - Update Google Calendar when booking changes
- `onBookingDeleted` - Delete Google Calendar event when booking deleted
- `calendarWebhook` - Sync changes from Google Calendar to Firestore

**Conflict Prevention**:
- Uses `syncedFromGoogle` flag to prevent loops
- Uses `deletedFromGoogle` flag for deletion tracking
- Async operations don't block booking creation

## Conflict Prevention

### Email vs Google Calendar

**Problem**: How to prevent duplicate emails when bookings are synced from Google Calendar?

**Solution**: 
```javascript
// In onBookingCreated trigger
if (bookingData.syncedFromGoogle) {
  console.log('Booking synced from Google Calendar - skipping email');
  return null;
}
```

When a booking is created from Google Calendar webhook, it has `syncedFromGoogle: true`, which prevents the email trigger from sending a confirmation.

### Google Calendar Loop Prevention

**Problem**: How to prevent infinite loops when syncing between Firestore and Google Calendar?

**Solution**:
```javascript
// In onBookingUpdated trigger
if (afterData.syncedFromGoogle) return null; // prevent loops

// In onBookingDeleted trigger
if (data.deletedFromGoogle === true) {
  console.log('Deletion originated from Google - skipping to prevent loop');
  return null;
}
```

## Error Handling

### Email Failures

Email failures **do not** affect booking creation:

```javascript
try {
  await sendBookingConfirmationEmail(bookingData);
} catch (err) {
  console.error('Error sending email:', err);
  // Don't throw - email failure shouldn't affect booking
}
```

**Behavior**: 
- Booking is saved successfully
- Error is logged
- Customer may not receive email (check logs)

### Google Calendar Failures

Google Calendar failures **do not** affect booking creation:

```javascript
(async () => {
  try {
    const eventId = await createGoogleCalendarEvent(createdData);
    // ... update booking ...
  } catch (e) {
    console.error('Async Google sync failed', e);
  }
})();
```

**Behavior**:
- Booking is saved successfully
- Error is logged
- Event may not be created in Google Calendar
- `googleEventId` remains `null`
- `syncedToGoogle` remains `false`

## Configuration Requirements

### For Email to Work

Required environment variables:
- `EMAIL_USER` - Gmail account
- `EMAIL_PASSWORD` - Gmail App Password
- `EMAIL_FROM` - Sender display name (optional)

See [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) for setup details.

### For Google Calendar to Work

Required environment variables:
- `GOOGLE_SERVICE_ACCOUNT` - Service account JSON
- `GOOGLE_CALENDAR_ID` - Calendar ID to sync with

See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for setup details.

### Independent Operation

Both features work independently:
- ✅ System works with **only email** configured (no Google Calendar)
- ✅ System works with **only Google Calendar** configured (no email)
- ✅ System works with **both** configured
- ✅ System works with **neither** configured (basic booking only)

## Testing Scenarios

### Test 1: Email Only (No Google Calendar)

**Setup**: Configure email, but not Google Calendar

**Expected**:
1. Customer makes booking
2. Booking saved to Firestore ✅
3. Email sent to customer ✅
4. No Google Calendar event created (logs "Google Calendar not configured") ✅

### Test 2: Google Calendar Only (No Email)

**Setup**: Configure Google Calendar, but not email

**Expected**:
1. Customer makes booking
2. Booking saved to Firestore ✅
3. No email sent (logs "Email not configured") ✅
4. Google Calendar event created ✅

### Test 3: Both Configured

**Setup**: Configure both email and Google Calendar

**Expected**:
1. Customer makes booking
2. Booking saved to Firestore ✅
3. Email sent to customer ✅
4. Google Calendar event created ✅

### Test 4: Google Calendar → Firestore Sync

**Setup**: Configure both email and Google Calendar

**Expected**:
1. Create event in Google Calendar
2. Webhook triggers
3. Booking created in Firestore with `syncedFromGoogle: true` ✅
4. **No email sent** (prevented by syncedFromGoogle flag) ✅

## Monitoring

### Check Email Status

```bash
# Check if email is configured
firebase functions:config:get email

# View function logs for email activity
firebase functions:log --only onBookingCreated

# Look for:
# - "Email transporter initialized" (email is configured)
# - "Email not configured" (email is not configured)
# - "Confirmation email sent to: xxx@example.com" (success)
# - "Failed to send confirmation email" (failure)
```

### Check Google Calendar Status

```bash
# Check if Google Calendar is configured
firebase functions:config:get google

# View function logs for Google Calendar activity
firebase functions:log --only book

# Look for:
# - "Google Calendar initialized" (calendar is configured)
# - "Google Calendar not configured" (calendar is not configured)
# - "Google event created id= xxx" (success)
# - "Failed to create Google Calendar event" (failure)
```

## Troubleshooting

### Bookings Created But No Emails Sent

**Check**:
1. Email configuration: `firebase functions:config:get email`
2. Function logs: `firebase functions:log --only onBookingCreated`
3. Gmail account status (check if blocked or limited)
4. Spam folder in recipient's inbox

**Solutions**:
- Verify EMAIL_USER and EMAIL_PASSWORD are set correctly
- Ensure using Gmail App Password (not regular password)
- Check 2-Step Verification is enabled on Gmail account
- See [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) for detailed troubleshooting

### Bookings Created But Not in Google Calendar

**Check**:
1. Google Calendar configuration: `firebase functions:config:get google`
2. Function logs: `firebase functions:log --only book`
3. Calendar API status in Google Cloud Console
4. Service account permissions

**Solutions**:
- Verify GOOGLE_SERVICE_ACCOUNT and GOOGLE_CALENDAR_ID are set
- Ensure calendar is shared with service account email
- Check Calendar API is enabled
- See [GOOGLE_CALENDAR_TROUBLESHOOTING.md](./GOOGLE_CALENDAR_TROUBLESHOOTING.md)

### Duplicate Emails from Google Calendar Bookings

**Check**:
- Function logs for `syncedFromGoogle` flag
- Booking documents in Firestore

**Solution**:
- Should be prevented by `syncedFromGoogle` flag
- Verify onBookingCreated trigger checks this flag
- Check code in functions/index.js

### Google Calendar Changes Not Syncing Back

**Check**:
- Webhook registration status
- calendarWebhook function logs

**Solution**:
- Re-register webhook (see GOOGLE_CALENDAR_SETUP.md)
- Verify webhook endpoint is accessible
- Check webhook expiration

## Performance Considerations

### Response Time

**Booking Creation Timeline**:
- Frontend → Backend: ~100ms
- Validation: ~50ms
- Firestore transaction: ~200ms
- **Response to user: ~350ms** ⚡ (email and calendar happen after response)
- Email sending: ~2-5s (async, doesn't block)
- Google Calendar sync: ~3-8s (async, doesn't block)

**Key Point**: Customer sees success immediately, email and calendar happen in background.

### Scalability

**Email Limits**:
- Free Gmail: 500 emails/day
- Google Workspace: 2,000 emails/day

**Google Calendar Limits**:
- Calendar API: 1,000,000 queries/day (free tier)

**Firebase Functions**:
- Pay per execution (~$0.40 per million invocations)

## Security

### Email Security

- ✅ No email credentials in frontend code
- ✅ Gmail App Password (not regular password)
- ✅ Environment variables (not hardcoded)
- ✅ 2-Step Verification required
- ✅ Dedicated Gmail account for sending only

### Google Calendar Security

- ✅ Service account authentication
- ✅ No credentials in frontend code
- ✅ Minimal permissions (Calendar API only)
- ✅ Webhook validation
- ✅ Loop prevention

## Version History

### Version 1.1.0 (2024-11-23)
- ✅ Added email confirmation functionality
- ✅ Created onBookingCreated Firestore trigger
- ✅ Integrated with existing Google Calendar sync
- ✅ Added conflict prevention between email and calendar
- ✅ Comprehensive documentation

### Version 1.0.0 (2024-11-19)
- ✅ Google Calendar two-way synchronization
- ✅ Booking creation and management
- ✅ reCAPTCHA verification

## References

- [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) - Email setup guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - All configuration variables
- [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) - Google Calendar setup
- [functions/README.md](./functions/README.md) - Firebase Functions documentation

---

**Last Updated**: 2024-11-23
**System Version**: 1.1.0
