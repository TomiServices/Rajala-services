# Hybrid Calendar System - Testing Guide

This document provides comprehensive testing procedures for the hybrid calendar solution.

## Prerequisites

- Google Calendar API configured (see `GOOGLE_CALENDAR_SETUP.md`)
- Firebase Functions deployed
- OAuth tokens configured

## Test Scenarios

### 1. Website → Google Calendar Sync

**Test**: Create appointment on website

**Steps**:
1. Open website booking page
2. Select service (e.g., "Rengastyöt")
3. Select date and time (weekday only)
4. Fill in contact information
5. Submit booking

**Expected Result**:
- Booking confirmation shown on website
- Email confirmation sent
- Appointment appears in Google Calendar within 1 minute
- Firebase Realtime Database shows appointment with `syncStatus: 'synced'`

**Verification**:
```bash
# Check Firebase database
firebase database:get /appointments

# Check Google Calendar
# Open https://calendar.google.com
# Verify appointment appears
```

### 2. Google Calendar → Website Sync

**Test**: Modify appointment in Google Calendar

**Steps**:
1. Open Google Calendar
2. Find an existing appointment
3. Change the time (e.g., from 9:00 to 10:00)
4. Save changes
5. Wait 5-10 minutes for sync

**Expected Result**:
- Firebase database updated with new time
- Website calendar reflects the change
- No duplicate appointments created

**Verification**:
```bash
# Check last sync time
firebase database:get /calendar_sync/lastSyncTime

# Check for errors
firebase database:get /calendar_sync/syncErrors
```

### 3. Appointment Deletion

**Test**: Delete appointment from Google Calendar

**Steps**:
1. Open Google Calendar
2. Delete an appointment
3. Wait 5-10 minutes

**Expected Result**:
- Firebase shows appointment with `status: 'deleted'`
- Website no longer shows the time slot as booked

### 4. Double Booking Prevention

**Test**: Attempt to book already occupied slot

**Steps**:
1. Note a time slot that's already booked
2. Try to book the same slot on website
3. Submit booking

**Expected Result**:
- Error message: "Valittu aika ei ole enää vapaana"
- No appointment created
- No changes to Google Calendar

### 5. Weekend Booking Prevention

**Test**: Verify weekends are hidden/disabled

**Steps**:
1. Open booking calendar
2. Observe calendar display

**Expected Result**:
- Saturday and Sunday columns are not visible
- Only weekdays (Monday-Friday) shown
- Calendar shows 2 months (current + next)

### 6. Two-Month View

**Test**: Verify calendar shows correct range

**Steps**:
1. Open booking calendar
2. Check which months are visible

**Expected Result**:
- Desktop: Two months side-by-side (current month + next month)
- Mobile: 2-week view with navigation buttons
- No dates beyond 2 months shown

### 7. Mobile Responsiveness

**Test**: Test on mobile devices

**Devices to test**:
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)

**Expected Results**:
- Calendar renders correctly
- Touch interactions work smoothly
- Time selection modal appears on date tap
- Form is easy to fill out
- No horizontal scrolling required

### 8. OAuth Token Refresh

**Test**: Verify automatic token refresh

**Steps**:
1. Wait for OAuth token to expire (check expiry_date in database)
2. Create a new appointment
3. Check Firebase Functions logs

**Expected Result**:
- Token automatically refreshes
- Appointment successfully synced to Google Calendar
- Log shows: "Token expired, refreshing..."

### 9. Webhook Functionality

**Test**: Verify webhook receives notifications

**Steps**:
1. Make change in Google Calendar
2. Check Firebase Functions logs immediately

**Expected Result**:
- Log shows: "Webhook received"
- Log shows: "Calendar changes detected, syncing..."
- Sync completes within seconds

### 10. Scheduled Sync

**Test**: Verify scheduled sync runs

**Steps**:
1. Wait 5 minutes
2. Check Firebase Functions logs

**Expected Result**:
- Log shows: "Running scheduled calendar sync..."
- Log shows: "Scheduled sync completed successfully"
- Runs every 5 minutes

## Performance Tests

### Load Test

**Test**: Multiple simultaneous bookings

**Steps**:
1. Have 5 people book appointments simultaneously
2. Monitor Firebase Functions logs
3. Check all appointments in Google Calendar

**Expected Result**:
- All bookings succeed
- No conflicts or duplicates
- All appear in Google Calendar
- Response time < 3 seconds

### API Rate Limit Test

**Test**: Verify within Google Calendar API limits

**Monitoring**:
```bash
# Check API usage in Google Cloud Console
# Go to APIs & Services → Dashboard
# View Google Calendar API usage

# Should be well under 1,000,000 requests/day
```

## Error Handling Tests

### Test 1: Google Calendar API Unavailable

**Simulation**:
1. Temporarily revoke OAuth permissions
2. Try to create appointment

**Expected Result**:
- Appointment saves to Firebase
- `syncStatus: 'sync_failed'`
- Error logged but booking succeeds
- User receives confirmation email

### Test 2: Firebase Database Unavailable

**Simulation**:
Use Firebase Emulator with network disconnect

**Expected Result**:
- Clear error message to user
- No data loss
- Retry on reconnection

### Test 3: Webhook Failure

**Simulation**:
Stop webhook channel

**Expected Result**:
- Scheduled sync continues every 5 minutes
- Changes still propagate (with slight delay)
- Webhook auto-renewed after 7 days

## Security Tests

### Test 1: reCAPTCHA Validation

**Test**: Submit booking without reCAPTCHA

**Expected Result**:
- Booking rejected with 401 error
- Message: "Turvavarmennus puuttuu"

### Test 2: SQL Injection

**Test**: Submit malicious input in form fields

**Examples**:
```
name: '; DROP TABLE appointments; --
email: test@test.com' OR '1'='1
```

**Expected Result**:
- Input properly escaped/sanitized
- No database damage
- Booking may fail validation

### Test 3: XSS Attack

**Test**: Submit JavaScript in form fields

**Example**:
```
name: <script>alert('XSS')</script>
```

**Expected Result**:
- Script tags escaped in email
- No script execution
- Safe display in admin interface

## Monitoring

### Firebase Console

Monitor these metrics:
- Functions execution count
- Functions errors
- Database read/write operations
- Database size

### Google Cloud Console

Monitor these metrics:
- Calendar API requests
- OAuth token refreshes
- Webhook delivery success rate

### Alerts to Set Up

1. **Sync Failures**: Alert if more than 5 sync errors in 1 hour
2. **API Errors**: Alert on 500 errors from Calendar API
3. **Token Expiry**: Alert 1 day before OAuth consent expires
4. **Webhook Expiry**: Alert 1 day before webhook channel expires

## Troubleshooting

### Issue: Appointments not syncing

**Checks**:
1. Verify OAuth tokens exist: `/google_calendar/oauth_tokens`
2. Check sync errors: `/calendar_sync/syncErrors`
3. View Functions logs: `firebase functions:log`
4. Verify webhook active: `/google_calendar/webhook`

**Solutions**:
- Re-authorize OAuth if tokens missing
- Check Google Calendar API quota
- Verify webhook URL is accessible

### Issue: Double bookings

**Checks**:
1. Check Firebase database for duplicates
2. Verify slot availability function working
3. Check for race conditions in logs

**Solutions**:
- Implement database transactions
- Add pessimistic locking
- Increase validation strictness

### Issue: Calendar not loading

**Checks**:
1. Check browser console for errors
2. Verify FullCalendar CDN accessible
3. Check bookings endpoint response

**Solutions**:
- Clear browser cache
- Check ad blocker settings
- Use fallback calendar if CDN blocked

## Maintenance Tasks

### Weekly

- [ ] Review sync error logs
- [ ] Verify webhook is active
- [ ] Check database size growth
- [ ] Monitor API usage metrics

### Monthly

- [ ] Review OAuth consent expiry
- [ ] Audit appointment data accuracy
- [ ] Performance optimization review
- [ ] Security audit

### Quarterly

- [ ] Test full disaster recovery
- [ ] Review and update documentation
- [ ] Performance benchmarking
- [ ] User acceptance testing

## Test Checklist

Before deploying to production:

- [ ] All 10 test scenarios pass
- [ ] Performance tests completed
- [ ] Security tests pass
- [ ] Mobile responsiveness verified
- [ ] Error handling tested
- [ ] Monitoring alerts configured
- [ ] Documentation up to date
- [ ] Backup procedures tested

## Support

For issues during testing:
1. Check Firebase Functions logs
2. Review this testing guide
3. Consult `HYBRID_CALENDAR_IMPLEMENTATION.md`
4. Check Google Calendar API status page

---

**Last Updated:** 2024-11-19  
**Version:** 1.0
