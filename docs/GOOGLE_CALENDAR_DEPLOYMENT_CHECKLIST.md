# Google Calendar Integration - Deployment Checklist

This checklist helps ensure all steps are completed when deploying the Google Calendar integration.

## Pre-Deployment Setup

### 1. Google Cloud Project Configuration

- [ ] **Create or select Google Cloud Project**
  - Project name: _________________
  - Project ID: _________________
  
- [ ] **Enable Google Calendar API**
  - Navigation: APIs & Services > Library
  - Search for "Google Calendar API"
  - Click Enable
  
- [ ] **Create Service Account**
  - Navigation: APIs & Services > Credentials
  - Name: `fixnero-calendar-sync` (or your preferred name)
  - Role: Editor
  - Note service account email: _________________@_________________.iam.gserviceaccount.com
  
- [ ] **Create Service Account Key**
  - Format: JSON
  - Download location: _________________
  - **IMPORTANT**: Keep this file secure, never commit to git!

### 2. Google Calendar Setup

- [ ] **Create Calendar for Bookings**
  - Name: `Fixnero Varaukset` (or your preferred name)
  - Time zone: Europe/Helsinki
  - Calendar created successfully
  
- [ ] **Share Calendar with Service Account**
  - Add service account email to calendar sharing
  - Permission level: "Make changes to events"
  - Sharing configured successfully
  
- [ ] **Copy Calendar ID**
  - Location: Calendar Settings > Integrate calendar
  - Calendar ID: _________________@group.calendar.google.com

### 3. Local Development Setup (Optional)

- [ ] **Install dependencies**
  ```bash
  cd functions
  npm install
  ```
  
- [ ] **Create local configuration**
  - File: `functions/.runtimeconfig.json`
  - Copy service account JSON content
  - Add calendar ID
  - Verify `.runtimeconfig.json` is in `.gitignore`
  
- [ ] **Test locally** (if using Firebase emulators)
  ```bash
  firebase emulators:start --only functions
  ```

### 4. Production Configuration

- [ ] **Configure reCAPTCHA (if not already done)**
  ```bash
  firebase functions:config:set recaptcha.secret="YOUR_SECRET_KEY"
  ```
  
- [ ] **Configure Google Service Account**
  ```bash
  firebase functions:config:set google.service_account="$(cat /path/to/service-account-key.json | jq -c)"
  ```
  - Verify JSON is minified to single line
  - Delete local copy of service-account-key.json after upload
  
- [ ] **Configure Calendar ID**
  ```bash
  firebase functions:config:set google.calendar_id="your-calendar-id@group.calendar.google.com"
  ```
  
- [ ] **Verify Configuration**
  ```bash
  firebase functions:config:get
  ```
  - Should show: recaptcha.secret, google.service_account, google.calendar_id

## Deployment

### 5. Deploy Firebase Functions

- [ ] **Build check**
  ```bash
  cd functions
  node -c index.js.js
  ```
  - No syntax errors
  
- [ ] **Deploy functions**
  ```bash
  firebase deploy --only functions
  ```
  - Deployment successful
  - Note deployment time: _________________
  
- [ ] **Verify deployed functions**
  - `book` - Existing booking function
  - `bookings` - Existing bookings list
  - `onBookingCreated` - NEW: Sync to Google Calendar
  - `onBookingUpdated` - NEW: Update Google Calendar
  - `onBookingDeleted` - NEW: Delete from Google Calendar
  - `calendarWebhook` - NEW: Receive Google Calendar updates

### 6. Set Up Webhook (Two-Way Sync)

- [ ] **Get webhook URL**
  - URL: `https://europe-north1-webbi1.cloudfunctions.net/calendarWebhook`
  - Note: The URL is derived from your Firebase project ID (`webbi1`). If you check `watchStatus` (GET), it will show the currently registered callback URL.
  
- [ ] **Register webhook with Google Calendar**
  - Method: POST to `https://europe-north1-webbi1.cloudfunctions.net/watchRegistrar` (no body needed — URL is auto-detected from the project)
  - Or with explicit URL: `curl -X POST https://europe-north1-webbi1.cloudfunctions.net/watchRegistrar -H "Content-Type: application/json" -d '{"callbackUrl":"https://europe-north1-webbi1.cloudfunctions.net/calendarWebhook"}'`
  - Calendar ID: (from step 2)
  
- [ ] **Verify webhook registration**
  - Check function logs for verification message
  - Check watch status: GET `https://europe-north1-webbi1.cloudfunctions.net/watchStatus`
  - Webhook status: _________________

## Testing

### 7. Test Website → Google Calendar Sync

- [ ] **Create test booking on website**
  - Booking created successfully
  - Booking ID: _________________
  
- [ ] **Verify in Google Calendar**
  - Event appears in calendar
  - Event title: "Varaus: [Customer Name]"
  - Event description includes booking details
  - Event ID: _________________
  
- [ ] **Check Firestore**
  - Booking has `googleEventId` field
  - Booking has `googleSyncedAt` timestamp
  
- [ ] **Check function logs**
  ```bash
  firebase functions:log --only onBookingCreated
  ```
  - Log shows "Created Google Calendar event"
  - No errors

### 8. Test Google Calendar → Website Sync

- [ ] **Create event directly in Google Calendar**
  - Event created in shared calendar
  - Event summary: Test Event
  - Event date/time: _________________
  
- [ ] **Trigger webhook manually** (if auto-trigger doesn't work yet)
  ```bash
  curl -X POST https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook \
    -H "x-goog-resource-state: exists" \
    -H "x-goog-channel-id: test" \
    -H "x-goog-resource-id: test"
  ```
  
- [ ] **Verify in Firestore**
  - New booking created
  - Booking has `syncedFromGoogle: true`
  - Booking has correct date/time
  
- [ ] **Verify on website**
  - Booking appears in calendar
  - Time slot shows as booked

### 9. Test Updates (Both Directions)

- [ ] **Update event in Google Calendar**
  - Change event time/date
  - Wait for webhook trigger
  
- [ ] **Verify Firestore update**
  - Booking time updated
  - `googleSyncedAt` timestamp updated
  
- [ ] **Update booking in Firestore**
  - Change booking details
  
- [ ] **Verify Google Calendar update**
  - Event updated in calendar
  - Event details match Firestore

### 10. Test Deletions (Both Directions)

- [ ] **Delete event from Google Calendar**
  - Event deleted
  
- [ ] **Verify Firestore deletion**
  - Booking removed from Firestore
  
- [ ] **Delete booking from Firestore**
  - Booking deleted
  
- [ ] **Verify Google Calendar deletion**
  - Event removed from calendar

### 11. Performance Testing

- [ ] **Test booking creation time**
  - Website booking creation: < 2 seconds
  - Google Calendar sync: < 5 seconds
  
- [ ] **Test webhook response time**
  - Webhook trigger to Firestore update: < 10 seconds
  
- [ ] **Test with multiple bookings**
  - Create 5 bookings in quick succession
  - All sync successfully
  - No errors in logs

## Post-Deployment

### 12. Monitoring Setup

- [ ] **Set up log monitoring**
  - Firebase Console > Functions > Logs
  - Watch for errors
  
- [ ] **Set up alerts** (optional)
  - Google Cloud Console > Monitoring
  - Alert on function errors
  
- [ ] **Monitor API usage**
  - Google Cloud Console > APIs & Services > Dashboard
  - Check Calendar API quota usage

### 13. Documentation

- [ ] **Update deployment documentation**
  - Record deployment date
  - Note any issues encountered
  - Document configuration values (non-sensitive)
  
- [ ] **Train team members**
  - Show how to monitor sync status
  - Explain troubleshooting steps
  - Share documentation links

### 14. Webhook Maintenance Schedule

- [ ] **Set webhook renewal reminder**
  - Webhooks expire after ~7 days to 1 year
  - Set calendar reminder to renew
  - Consider implementing auto-renewal function
  
- [ ] **Document webhook renewal process**
  - Save renewal command/script
  - Note renewal frequency

## Rollback Plan (If Needed)

### 15. Emergency Rollback Procedure

- [ ] **Disable Google Calendar sync** (if issues occur)
  ```bash
  # Remove Google Calendar configuration (sync will stop but won't break existing functionality)
  firebase functions:config:unset google.service_account
  firebase functions:config:unset google.calendar_id
  firebase deploy --only functions
  ```
  
- [ ] **Verify website still works**
  - Bookings can still be created
  - Calendar displays correctly
  - Emails are sent
  
- [ ] **Investigation**
  - Review function logs
  - Check Google Cloud Console
  - Identify root cause

## Security Checklist

### 16. Security Verification

- [ ] **Service account key not in version control**
  - Check git history
  - Verify `.gitignore` includes `service-account-key.json`
  
- [ ] **Configuration not in version control**
  - `.runtimeconfig.json` in `.gitignore`
  - No secrets in committed files
  
- [ ] **Service account permissions limited**
  - Only has Calendar API access
  - No excessive permissions
  
- [ ] **Calendar sharing limited**
  - Only service account has access
  - No public sharing enabled
  
- [ ] **Webhook endpoint secured**
  - Validates incoming requests
  - Handles errors gracefully

## Sign-Off

### 17. Deployment Approval

- [ ] **Tested by**: _________________ Date: _________________
- [ ] **Reviewed by**: _________________ Date: _________________
- [ ] **Approved by**: _________________ Date: _________________

### Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Google Calendar Integration Version**: 1.0.0
**Status**: ☐ In Progress  ☐ Completed  ☐ Rolled Back
