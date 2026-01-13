# Deployment Checklist - Calendar Sync Fix (January 2026)

## Pre-Deployment

- [x] Code changes reviewed and tested
- [x] All tests pass locally (4/4 tests passed)
- [x] Security scan completed (CodeQL - 0 alerts)
- [x] Documentation created
- [ ] Backup current Firestore data (optional but recommended)
- [ ] Note current sync token status

## Deployment Steps

### 1. Deploy Firebase Functions

```bash
# Navigate to project directory
cd /path/to/Rajala-services

# Deploy only the modified functions (recommended)
firebase deploy --only functions:calendarWebhook

# Or deploy all functions if needed
firebase deploy --only functions
```

### 2. Verify Deployment

```bash
# Check function logs after deployment
firebase functions:log --only calendarWebhook --lines 50

# Expected: No errors, function ready to receive webhooks
```

### 3. Reset Sync Token (if needed)

If experiencing issues with stale sync tokens:

```bash
# Option A: Use Firebase Console
# 1. Go to Firestore
# 2. Navigate to 'calendarWatch' collection
# 3. Delete all documents (forces full sync on next webhook)

# Option B: Use Firebase CLI (requires firestore tools)
firebase firestore:delete calendarWatch --recursive
```

## Post-Deployment Verification

### 1. Trigger Test Webhook

```bash
# Method 1: Create a test event in Google Calendar
# - Go to Google Calendar
# - Create a new event
# - Wait for webhook notification (should happen within 1-2 minutes)

# Method 2: Manually trigger webhook (if you have the URL)
curl -X POST https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook \
  -H "Content-Type: application/json" \
  -H "X-Goog-Resource-State: exists" \
  -d '{}'
```

### 2. Monitor Logs

```bash
# Watch logs in real-time
firebase functions:log --only calendarWebhook

# Look for:
# ✅ "Calendar webhook received"
# ✅ "Processing calendar webhook with state: exists"
# ✅ "Attempting incremental sync with syncToken" OR "No sync token available, performing full list"
# ✅ "Calendar webhook completed: {eventsProcessed: X, bookingsCreated: Y, ...}"

# Red flags:
# ❌ "calendarWebhook error"
# ❌ "Failed to fetch events from Google Calendar"
# ❌ Large number of deletions (unless actually deleting many events)
```

### 3. Verify in Firestore

```bash
# Check that bookings are being created/updated correctly
# 1. Go to Firebase Console → Firestore
# 2. Check 'varaukset' collection
# 3. Verify events from Google Calendar appear with:
#    - googleEventId: (event ID from Google Calendar)
#    - syncedFromGoogle: true
#    - googleSyncedAt: (recent timestamp)
```

### 4. Verify on Website

```
1. Open the website booking calendar
2. Verify events created in Google Calendar are visible
3. Try modifying an event in Google Calendar
4. Wait 1-2 minutes and verify changes appear on website
5. Try deleting an event in Google Calendar
6. Wait 1-2 minutes and verify it's removed from website
```

## Rollback Plan

If issues arise, rollback to previous version:

```bash
# Option 1: Redeploy previous code
git revert HEAD~4  # Revert last 4 commits
firebase deploy --only functions:calendarWebhook

# Option 2: Use Firebase Console
# 1. Go to Firebase Console → Functions
# 2. Find calendarWebhook function
# 3. Click "Roll back to previous version"
```

## Success Criteria

- [ ] Function deploys without errors
- [ ] Webhook receives notifications from Google Calendar
- [ ] New events in Google Calendar appear on website within 2 minutes
- [ ] Modified events in Google Calendar update on website within 2 minutes
- [ ] Deleted events in Google Calendar are removed from website within 2 minutes
- [ ] No unexpected deletions in Firestore
- [ ] Logs show successful sync operations
- [ ] No error logs related to calendarWebhook

## Monitoring Period

Monitor the following for at least 24-48 hours after deployment:

1. **Function execution count** (should match webhook notification rate)
2. **Error rate** (should be 0% or very low)
3. **Firestore writes** (should show creates/updates/deletes matching Google Calendar changes)
4. **User reports** (monitor for any customer complaints about missing bookings)

## Contact Information

- **Developer**: GitHub Copilot
- **Repository**: TomiServices/Rajala-services
- **Documentation**: docs/CALENDAR_SYNC_BUG_FIX.md
- **Tests**: functions/test-webhook-logic.js

## Notes

- This fix addresses a critical bug that was causing event deletions
- The fix is backward compatible and doesn't require database migrations
- Sync tokens may need to be reset once to ensure clean state
- Monitor closely for the first 24 hours to catch any edge cases
