# Google Calendar Sync Bug Fix - January 2026

## Executive Summary

Fixed critical bugs in the Google Calendar bidirectional synchronization system that caused events to disappear from the website after being created in Google Calendar. The issues became apparent in January 2026, likely due to sync token invalidation at the year boundary.

## Problem Statement

**Symptoms:**
- Events created in Google Calendar were not appearing in the website reservation calendar
- Existing bookings were disappearing from the website
- The `calendarWebhook` function was processing notifications but causing data loss

**Timeline:**
- Issue started: Early January 2026
- Root cause identified: January 9, 2026
- Fix implemented: January 9, 2026

## Root Cause Analysis

### Bug 1: Incorrect Deletion Logic (Critical)

**Location:** `functions/index.js`, lines 1404-1425 (old code)

**Issue:**
The webhook function was performing a bulk deletion operation after processing incremental sync events:

```javascript
// INCORRECT CODE (removed):
const allBookings = await db.collection(BOOKINGS_COLLECTION)
  .where('googleEventId', '!=', null)
  .get();

const eventIds = new Set(events.map(e => e.id));
for (const doc of allBookings.docs) {
  if (booking.googleEventId && !eventIds.has(booking.googleEventId)) {
    await doc.ref.delete(); // Deletes ALL bookings not in current event list!
  }
}
```

**Why this was wrong:**
- When using `syncToken` for incremental sync, Google Calendar API only returns **changed** events
- The code was comparing all bookings against only the changed events
- This meant every incremental sync would delete all unchanged bookings
- Sync tokens commonly become invalid at year boundaries, causing a full sync followed by incremental syncs that delete everything

**Impact:**
- Every webhook notification after the initial sync would delete most/all bookings
- This is why events disappeared shortly after being created

### Bug 2: Missing `showDeleted` Parameter

**Location:** `functions/index.js`, lines 1307-1312 and 1287-1293

**Issue:**
The incremental sync was not requesting deleted events:

```javascript
// INCOMPLETE CODE:
const resp = await calendar.events.list({
  calendarId,
  syncToken,
  singleEvents: true,  // Invalid with syncToken
  maxResults: 2500
  // Missing: showDeleted: true
});
```

**Why this was wrong:**
- Without `showDeleted: true`, the API doesn't return cancelled/deleted events
- The webhook couldn't detect when events were deleted in Google Calendar
- Bookings would remain in Firestore even after deletion in Google Calendar

### Bug 3: Invalid API Parameters

**Location:** `functions/calendarwebhook.js`, lines 88-95

**Issue:**
Using incompatible parameters with `syncToken`:

```javascript
// INCORRECT CODE:
const res = await calendar.events.list({
  calendarId,
  syncToken,
  singleEvents: true,  // NOT ALLOWED with syncToken
  orderBy: 'startTime' // NOT ALLOWED with syncToken
});
```

**Why this was wrong:**
- Google Calendar API documentation explicitly states that `orderBy` and `singleEvents` cannot be used with `syncToken`
- This would cause API errors and prevent successful incremental sync
- The standalone calendarwebhook.js file had this issue

## Solution

### Fix 1: Correct Deletion Logic

**Changed approach:**
- Only delete bookings when the event is explicitly marked as cancelled or deleted
- Do not perform bulk reconciliation on every webhook
- Trust the incremental sync to provide accurate change information

```javascript
// CORRECT CODE:
for (const eventItem of events) {
  // Handle deleted/cancelled events
  if (eventItem.status === 'cancelled' || eventItem.deleted) {
    const existingSnapshot = await db.collection(BOOKINGS_COLLECTION)
      .where('googleEventId', '==', eventItem.id)
      .limit(1)
      .get();
    
    if (!existingSnapshot.empty) {
      const docRef = existingSnapshot.docs[0].ref;
      await docRef.update({ deletedFromGoogle: true });
      await new Promise(r => setTimeout(r, 100));
      await docRef.delete();
      deletedCount++;
    }
    continue;
  }
  
  // Handle active events (create/update)...
}
```

### Fix 2: Add `showDeleted` Parameter

**Incremental sync (with syncToken):**
```javascript
const resp = await calendar.events.list({
  calendarId,
  syncToken,
  showDeleted: true,  // ADDED: Receive deletion notifications
  maxResults: 2500
});
```

**Full sync (without syncToken):**
```javascript
const resp = await calendar.events.list({
  calendarId,
  timeMin: oneMonthAgo.toISOString(),
  singleEvents: true,
  showDeleted: true,  // ADDED: Include deleted events in initial sync
  maxResults: 2500,
  orderBy: 'startTime'
});
```

### Fix 3: Remove Invalid Parameters

**Corrected incremental sync:**
```javascript
// CORRECT CODE:
const res = await calendar.events.list({
  calendarId,
  syncToken,
  showDeleted: true,
  maxResults: 2500
  // Removed: singleEvents, orderBy (not allowed with syncToken)
});
```

## Files Modified

1. **functions/index.js**
   - Removed bulk deletion logic (lines 1403-1425)
   - Added `showDeleted: true` to incremental sync
   - Added `showDeleted: true` to full sync
   - Added proper handling of cancelled/deleted events
   - Added explanatory comments

2. **functions/calendarwebhook.js**
   - Removed `orderBy: 'startTime'` from incremental sync
   - Removed `singleEvents: true` from incremental sync
   - Added explanatory comment about API restrictions

## Testing Recommendations

### Manual Testing Steps

1. **Test Event Creation:**
   ```
   - Create event in Google Calendar
   - Wait for webhook notification (check logs)
   - Verify booking appears in Firestore 'varaukset' collection
   - Verify booking shows on website
   ```

2. **Test Event Modification:**
   ```
   - Modify event in Google Calendar (change time/description)
   - Wait for webhook notification
   - Verify booking is updated in Firestore
   - Verify changes appear on website
   ```

3. **Test Event Deletion:**
   ```
   - Delete event in Google Calendar
   - Wait for webhook notification
   - Verify booking is removed from Firestore
   - Verify event no longer shows on website
   ```

4. **Test Sync Token Invalidation:**
   ```
   - Manually invalidate sync token in Firestore (delete calendarWatch docs)
   - Trigger webhook
   - Verify full sync occurs successfully
   - Verify all events are synced correctly
   ```

### Monitoring

**Key logs to monitor:**
```javascript
// Successful incremental sync:
"Attempting incremental sync with syncToken"
"Incremental sync returned X events"
"Updated nextSyncToken after incremental sync"

// Successful deletion:
"Deleted booking for cancelled calendar event: {eventId}"

// Fallback to full sync (expected after token expiration):
"Sync token invalid/expired, falling back to full list"
"Performing full calendar list from: {date}"
```

**Red flags:**
```javascript
// These indicate problems:
"Failed to fetch events from Google Calendar"
"calendarWebhook error"
// Large number of deletions (unless actually deleting many events)
```

## API Reference

### Google Calendar Events.List Parameters

**Valid with syncToken (incremental sync):**
- `calendarId` (required)
- `syncToken` (required)
- `showDeleted` (recommended)
- `maxResults` (optional)
- `pageToken` (for pagination)

**NOT allowed with syncToken:**
- `orderBy` ❌
- `singleEvents` ❌
- `timeMin` ❌
- `timeMax` ❌
- `q` (search query) ❌

**Valid for full sync (without syncToken):**
- `calendarId` (required)
- `timeMin` (recommended)
- `timeMax` (optional)
- `orderBy` (required if using timeMin/timeMax)
- `singleEvents` (recommended)
- `showDeleted` (recommended)
- `maxResults` (optional)

### Event Status Values

- `confirmed` - Active event
- `cancelled` - Deleted/cancelled event
- `tentative` - Tentative event

When `showDeleted: true` is used:
- Deleted events return with `status === 'cancelled'`
- May also have `deleted: true` property set

## Future Improvements

1. **Add unit tests** for webhook processing logic
2. **Add integration tests** simulating webhook notifications
3. **Implement retry logic** for transient API failures
4. **Add metrics/monitoring** for sync success/failure rates
5. **Add alerting** for sync failures or high deletion rates
6. **Consider batch operations** for better performance with many events
7. **Add validation** to prevent accidental bulk deletions

## References

- [Google Calendar API - Events.list](https://developers.google.com/calendar/api/v3/reference/events/list)
- [Google Calendar API - Push Notifications](https://developers.google.com/calendar/api/guides/push)
- [Google Calendar API - Sync Tokens](https://developers.google.com/calendar/api/guides/sync)

## Version History

- **v1.0** (2026-01-09): Initial fix implemented
  - Fixed critical deletion bug
  - Added showDeleted parameter
  - Fixed invalid API parameters

## Contributors

- GitHub Copilot (Analysis and Implementation)
- TomiServices (Repository Owner)
