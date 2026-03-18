# Google Calendar Integration - Troubleshooting Guide

Quick reference for common issues and their solutions.

## Quick Diagnostics

### Check System Status

```bash
# 1. Check Firebase Functions configuration
firebase functions:config:get

# 2. Check function deployment status
firebase functions:list

# 3. View recent logs
firebase functions:log --limit 50

# 4. Check specific function logs
firebase functions:log --only onBookingCreated,onBookingUpdated,onBookingDeleted,calendarWebhook
```

### Verify Integration Components

| Component | Status Check | Expected Result |
|-----------|--------------|-----------------|
| Firebase Functions | `firebase functions:list` | Shows all 7 functions |
| Google Calendar API | Google Cloud Console > APIs & Services | Enabled |
| Service Account | Google Cloud Console > IAM & Admin | Active |
| Calendar Sharing | Google Calendar Settings | Service account has access |
| Webhook | Function logs | Receives notifications |

## Common Issues

### Issue 1: "Google Calendar not configured"

**Symptoms:**
- Functions log shows: `Google Calendar not configured - service account or calendar ID missing`
- Bookings created but not synced to Google Calendar

**Diagnosis:**
```bash
firebase functions:config:get
```

**Solution:**
```bash
# Set service account
firebase functions:config:set google.service_account="$(cat service-account-key.json | jq -c)"

# Set calendar ID
firebase functions:config:set google.calendar_id="your-calendar-id@group.calendar.google.com"

# Redeploy
firebase deploy --only functions
```

**Prevention:**
- Always verify config after deployment
- Document configuration values (non-sensitive parts)

---

### Issue 2: 403 Forbidden / Permission Denied

**Symptoms:**
- Function logs show: `Error syncing to Google Calendar: 403 Forbidden`
- Events not created in Google Calendar

**Diagnosis:**
1. Check if Calendar API is enabled
2. Verify service account email
3. Check calendar sharing settings

**Solution:**
```bash
# 1. Verify service account email
firebase functions:config:get | grep client_email

# 2. In Google Calendar:
#    - Settings > Share with specific people
#    - Add service account email
#    - Permission: "Make changes to events"

# 3. Verify Calendar API is enabled
# Go to: Google Cloud Console > APIs & Services > Library
# Search: "Google Calendar API"
# Status should be: "Enabled"
```

**Prevention:**
- Keep service account email documented
- Set calendar reminder to check sharing settings quarterly

---

### Issue 3: Events Not Syncing from Website to Google Calendar

**Symptoms:**
- Bookings created on website
- No error in logs
- Events don't appear in Google Calendar

**Diagnosis:**
```bash
# Check if onBookingCreated is triggered
firebase functions:log --only onBookingCreated

# Check for errors
grep -i "error" functions.log
```

**Solution:**
1. Verify function is deployed:
   ```bash
   firebase functions:list | grep onBookingCreated
   ```

2. Check Firestore trigger path:
   - Should be: `varaukset/{bookingId}`
   - Verify collection name in Firestore

3. Manual trigger test:
   - Create test booking
   - Watch logs in real-time:
     ```bash
     firebase functions:log --only onBookingCreated --follow
     ```

**Prevention:**
- Monitor function execution counts in Firebase Console
- Set up error alerting

---

### Issue 4: Events Not Syncing from Google Calendar to Website

**Symptoms:**
- Create event in Google Calendar
- Event doesn't appear on website
- Webhook not triggered

**Diagnosis:**
```bash
# Check if webhook is receiving notifications
firebase functions:log --only calendarWebhook

# Manually trigger webhook
curl -X POST https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook \
  -H "x-goog-resource-state: exists" \
  -H "x-goog-channel-id: test" \
  -H "x-goog-resource-id: test"
```

**Solution:**

1. **Webhook not registered:**
   ```bash
   # Register webhook using Google Calendar API
   # See GOOGLE_CALENDAR_SETUP.md Step 5 for details
   ```

2. **Webhook expired:**
   - Webhooks expire after some time
   - Need to be renewed
   - Check expiration in logs
   - Re-register webhook

3. **Function error:**
   - Check function logs for errors
   - Verify Calendar API quota not exceeded
   - Check Firestore write permissions

**Prevention:**
- Set up webhook renewal reminder
- Implement auto-renewal function
- Monitor webhook execution frequency

---

### Issue 5: Duplicate Events Created

**Symptoms:**
- Single booking creates multiple calendar events
- Or multiple Firestore bookings from one calendar event

**Diagnosis:**
```bash
# Check if updates are triggering creates
firebase functions:log | grep -E "Creating|Updating"

# Check for infinite loops
firebase functions:log | grep -A 5 "Skipping Google Calendar sync"
```

**Solution:**

1. **Firestore trigger loop:**
   - Check if `onBookingUpdated` is creating new events
   - Verify loop prevention logic is working:
     ```javascript
     // Should skip if update is from sync itself
     if (!bookingBefore.googleEventId && bookingAfter.googleEventId) {
         return null;
     }
     ```

2. **Webhook creating duplicates:**
   - Check if events already have Firestore ID
   - Verify `createBookingFromGoogleEvent` checks for existing bookings

**Prevention:**
- Always include loop prevention checks
- Add unique identifiers to events
- Monitor for duplicate creations

---

### Issue 6: Slow Sync Performance

**Symptoms:**
- Sync takes > 10 seconds
- Website feels sluggish
- Timeout errors

**Diagnosis:**
```bash
# Check function execution times
firebase functions:log | grep "Execution took"

# Check for timeout errors
firebase functions:log | grep "timeout"
```

**Solution:**

1. **Increase function timeout:**
   ```javascript
   // In index.js.js
   exports.onBookingCreated = functions
       .runWith({ timeoutSeconds: 120 }) // Increase from default 60s
       .firestore.document('varaukset/{bookingId}')
       .onCreate(async (snapshot, context) => {
           // ...
       });
   ```

2. **Optimize Calendar API calls:**
   - Batch operations when possible
   - Cache calendar ID
   - Reduce API calls per sync

3. **Check network latency:**
   - Test from different regions
   - Consider using Cloud Functions in correct region

**Prevention:**
- Monitor function execution times
- Set performance budgets
- Use Firebase Performance Monitoring

---

### Issue 7: Booking Details Not Syncing Correctly

**Symptoms:**
- Event created but missing customer info
- Incorrect times or dates
- Services not showing in description

**Diagnosis:**
```bash
# Check what data is being sent
firebase functions:log --only onBookingCreated | grep "booking"

# Check event creation payload
firebase functions:log | grep "Creating event"
```

**Solution:**

1. **Verify Firestore data structure:**
   - Check that booking has all required fields
   - Verify field names match code expectations

2. **Check time zone handling:**
   ```javascript
   // Should always use Europe/Helsinki
   timeZone: 'Europe/Helsinki'
   ```

3. **Verify service list formatting:**
   - Check `services` array structure
   - Ensure description is properly formatted

**Prevention:**
- Add data validation in booking creation
- Log full event payload in development
- Add unit tests for data transformation

---

### Issue 8: reCAPTCHA Blocking Bookings

**Symptoms:**
- Users can't complete bookings
- "Turvavarmennus epäonnistui" error
- reCAPTCHA score too low

**Diagnosis:**
```bash
# Check reCAPTCHA logs
firebase functions:log --only book | grep "reCAPTCHA"
```

**Solution:**

1. **Adjust score threshold:**
   ```javascript
   // In index.js.js, line ~28
   const RECAPTCHA_SCORE_THRESHOLD = 0.5; // Lower to 0.3 for less strict
   ```

2. **Check reCAPTCHA domain registration:**
   - Go to Google reCAPTCHA Admin Console
   - Verify domains are registered
   - Add test domains if needed

3. **Verify secret key:**
   ```bash
   firebase functions:config:get recaptcha.secret
   ```

**Prevention:**
- Monitor reCAPTCHA scores
- Adjust threshold based on real user data
- Keep backup of working configuration

---

## Emergency Procedures

### Disable Google Calendar Sync (Emergency)

If sync is causing critical issues:

```bash
# 1. Unset Google Calendar config (keeps reCAPTCHA working)
firebase functions:config:unset google.service_account
firebase functions:config:unset google.calendar_id

# 2. Redeploy functions
firebase deploy --only functions

# 3. Verify website still works
# - Bookings should still be created
# - Just won't sync to Google Calendar
```

### Restore Previous Version

```bash
# 1. List recent deployments
gcloud functions list --project=fxnr-web

# 2. Rollback to previous version
# (Not directly supported - need to redeploy old code)

# 3. Alternative: Redeploy from git
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

## Monitoring Checklist

Daily:
- [ ] Check function error rate
- [ ] Verify recent bookings synced

Weekly:
- [ ] Review function execution times
- [ ] Check API quota usage
- [ ] Verify webhook still active

Monthly:
- [ ] Review logs for patterns
- [ ] Check service account status
- [ ] Verify calendar sharing settings
- [ ] Test full sync cycle

## Getting Help

### Information to Gather

When reporting an issue, collect:

1. **Function logs:**
   ```bash
   firebase functions:log --limit 100 > functions-logs.txt
   ```

2. **Configuration (non-sensitive):**
   ```bash
   firebase functions:config:get > config-dump.txt
   # Remove sensitive values before sharing!
   ```

3. **Function status:**
   ```bash
   firebase functions:list > functions-status.txt
   ```

4. **Error details:**
   - Error message
   - Timestamp
   - Affected booking IDs
   - Steps to reproduce

### Support Channels

1. **Firebase Support**: https://firebase.google.com/support
2. **Google Calendar API**: https://developers.google.com/calendar/api/support
3. **Stack Overflow**: Tag with `firebase`, `google-calendar-api`
4. **Internal team**: See team documentation

## Useful Commands

```bash
# Watch logs in real-time
firebase functions:log --follow

# Filter logs by function
firebase functions:log --only onBookingCreated,calendarWebhook

# Get config
firebase functions:config:get

# List all functions
firebase functions:list

# Delete a function
firebase functions:delete functionName

# Check Firebase project
firebase projects:list

# Switch project
firebase use project-id

# Check deployment history
firebase deploy:history
```

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
