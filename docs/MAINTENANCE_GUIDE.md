# Hybrid Calendar System - Maintenance Guide

This guide covers ongoing maintenance tasks for the hybrid calendar solution.

## Daily Monitoring

### Automated Checks

The system includes self-monitoring:
- Scheduled sync runs every 5 minutes
- Failed syncs logged to `/calendar_sync/syncErrors`
- OAuth tokens auto-refresh before expiration

### Manual Checks

**Quick Health Check** (2 minutes):

1. **Check OAuth Status**
   ```
   Visit: https://us-central1-fxnr-web.cloudfunctions.net/checkAuthStatus
   Expected: "OAuth Tokens: ✅ Configured"
   ```

2. **Check Last Sync Time**
   ```bash
   firebase database:get /calendar_sync/lastSyncTime
   # Should be within last 5 minutes
   ```

3. **Check for Sync Errors**
   ```bash
   firebase database:get /calendar_sync/syncErrors
   # Should be empty or minimal
   ```

## Weekly Maintenance

### 1. Review Sync Logs (15 minutes)

```bash
# View last 100 log entries
firebase functions:log --limit 100

# Filter for sync-related logs
firebase functions:log --only scheduledSync,googleCalendarWebhook

# Check for errors
firebase functions:log --limit 50 | grep -i error
```

**What to look for**:
- Recurring sync failures
- API rate limit warnings
- OAuth token refresh issues

### 2. Verify Webhook Status (5 minutes)

```bash
# Check webhook configuration
firebase database:get /google_calendar/webhook

# Verify:
# - channelId exists
# - expiration is not past
# - created_at is within 7 days
```

**Action if webhook expired**:
The scheduled sync will attempt to renew it automatically, but you can manually trigger:
```bash
# No manual renewal needed - automatic via scheduledSync
```

### 3. Review Appointment Data (10 minutes)

```bash
# Get all appointments
firebase database:get /appointments

# Count appointments by status
# In Firebase Console:
# - Go to Realtime Database
# - Navigate to /appointments
# - Review syncStatus values
```

**What to check**:
- Any with `syncStatus: 'sync_failed'`
- Any with `status: 'deleted'` older than 30 days (can be archived)
- Verify Google Calendar IDs match

### 4. Database Size Monitoring (5 minutes)

```bash
# Check database size in Firebase Console
# Go to Realtime Database → Usage tab
```

**Cleanup if needed**:
```javascript
// Remove deleted appointments older than 90 days
// Run in Firebase Console or Cloud Functions

const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
const appointmentsRef = admin.database().ref('appointments');

appointmentsRef.once('value', snapshot => {
  snapshot.forEach(child => {
    const appointment = child.val();
    if (appointment.status === 'deleted' && 
        new Date(appointment.updatedAt).getTime() < ninetyDaysAgo) {
      // Move to archive or delete
      child.ref.remove();
    }
  });
});
```

## Monthly Maintenance

### 1. OAuth Token Review (10 minutes)

```bash
# Check token expiry
firebase database:get /google_calendar/oauth_tokens/expiry_date

# If expiring soon (< 7 days):
# Tokens auto-refresh, but verify refresh_token exists
firebase database:get /google_calendar/oauth_tokens/refresh_token
```

**If refresh_token missing**:
1. Re-authorize OAuth: Visit `/generateAuthUrl`
2. Complete authorization flow
3. Verify new tokens stored

### 2. API Usage Review (15 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Dashboard
3. Select Google Calendar API
4. Review usage metrics:
   - Daily requests (should be < 10,000)
   - Quota usage (should be < 1%)
   - Error rate (should be < 0.1%)

**Alert thresholds**:
- Daily requests > 50,000: Investigate potential loop
- Error rate > 1%: Check sync logs
- Quota > 50%: Consider optimization

### 3. Performance Audit (20 minutes)

**Metrics to check**:

1. **Function Execution Time**
   ```bash
   # In Firebase Console → Functions
   # Review execution times for:
   # - book: Should be < 2 seconds
   # - googleCalendarWebhook: Should be < 5 seconds
   # - scheduledSync: Should be < 30 seconds
   ```

2. **Database Response Time**
   ```bash
   # Test bookings endpoint
   curl -w "@-" -o /dev/null -s "https://us-central1-fxnr-web.cloudfunctions.net/bookings" <<'EOF'
   time_namelookup:  %{time_namelookup}\n
   time_connect:     %{time_connect}\n
   time_total:       %{time_total}\n
   EOF
   
   # Should be < 1 second
   ```

3. **Website Calendar Load Time**
   - Open browser DevTools
   - Load booking page
   - Check Network tab for slow requests
   - Target: Page load < 3 seconds

### 4. Security Audit (30 minutes)

**Tasks**:

1. **Review Access Logs**
   ```bash
   # Check for unusual activity
   firebase functions:log --limit 500 | grep -E "401|403|500"
   ```

2. **Verify reCAPTCHA**
   - Test booking form submission
   - Verify score threshold working (0.5)
   - Check for bot-like patterns

3. **Database Rules**
   ```bash
   # Verify security rules
   firebase database:get /.settings/rules
   
   # Should restrict unauthorized access
   ```

4. **OAuth Scope Review**
   - Verify only necessary scopes granted
   - Check for expired consents

## Quarterly Maintenance

### 1. Disaster Recovery Test (1 hour)

**Scenario**: Complete system failure

**Steps**:
1. **Backup Current Data**
   ```bash
   firebase database:get / > backup-$(date +%Y%m%d).json
   ```

2. **Simulate Failure**
   - Temporarily disable functions
   - Clear OAuth tokens

3. **Recovery Procedure**
   - Restore OAuth tokens
   - Redeploy functions
   - Verify sync resumes

4. **Verify Data Integrity**
   - Compare appointments before/after
   - Check Google Calendar matches Firebase

### 2. Documentation Update (30 minutes)

**Review and update**:
- API endpoint URLs
- Environment variable names
- Troubleshooting steps
- Contact information

### 3. Dependency Updates (45 minutes)

```bash
cd functions
npm outdated
npm update
npm audit fix

# Test locally
npm test

# Deploy
firebase deploy --only functions
```

**Test after deployment**:
- Create test appointment
- Verify sync to Google Calendar
- Check logs for errors

### 4. Performance Optimization (1 hour)

**Areas to review**:

1. **Database Queries**
   - Identify slow queries
   - Add indexes if needed
   - Optimize data structure

2. **API Calls**
   - Batch requests where possible
   - Cache frequently accessed data
   - Reduce redundant calls

3. **Frontend**
   - Minify JavaScript
   - Optimize images
   - Use CDN for libraries

## Troubleshooting Procedures

### Issue: Sync Not Working

**Diagnosis Steps**:
1. Check OAuth tokens exist and valid
2. Verify webhook is active
3. Review function logs for errors
4. Test manual sync

**Solution**:
```bash
# Trigger manual sync
# (Call scheduledSync function)
firebase functions:shell
> scheduledSync()
```

### Issue: High API Usage

**Diagnosis**:
```bash
# Review logs for loop patterns
firebase functions:log --limit 1000 | grep "createCalendarEvent"

# Count sync frequency
firebase functions:log --limit 100 | grep "scheduledSync" | wc -l
```

**Solutions**:
- Increase sync interval (5 min → 10 min)
- Implement request caching
- Add rate limiting

### Issue: Database Growing Too Large

**Current limits**:
- Firebase Realtime Database: 1 GB free tier
- Estimated: ~1 KB per appointment
- Capacity: ~1 million appointments

**Cleanup strategy**:
```javascript
// Archive old appointments
const archiveOldAppointments = async () => {
  const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
  const ref = admin.database().ref('appointments');
  
  const snapshot = await ref.once('value');
  const appointments = snapshot.val();
  
  for (const [id, appointment] of Object.entries(appointments)) {
    if (new Date(appointment.createdAt).getTime() < sixMonthsAgo) {
      // Move to archive
      await admin.database().ref(`archive/appointments/${id}`).set(appointment);
      await ref.child(id).remove();
    }
  }
};
```

## Emergency Contacts

### For Technical Issues

1. **Firebase Support**: [Firebase Console](https://console.firebase.google.com/support)
2. **Google Calendar API**: [Google Cloud Support](https://cloud.google.com/support)

### Escalation Path

1. Check this guide
2. Review Firebase Functions logs
3. Check Google Cloud Console
4. Contact Firebase support (if within support plan)

## Maintenance Checklist

### Daily
- [ ] Quick health check (OAuth, sync time, errors)

### Weekly
- [ ] Review sync logs
- [ ] Verify webhook status
- [ ] Review appointment data
- [ ] Monitor database size

### Monthly
- [ ] OAuth token review
- [ ] API usage review
- [ ] Performance audit
- [ ] Security audit

### Quarterly
- [ ] Disaster recovery test
- [ ] Documentation update
- [ ] Dependency updates
- [ ] Performance optimization

## Best Practices

1. **Always test in development first**
2. **Keep backups before major changes**
3. **Monitor logs during peak hours**
4. **Document all configuration changes**
5. **Review security regularly**

## Useful Commands

```bash
# Deploy specific function
firebase deploy --only functions:scheduledSync

# View real-time logs
firebase functions:log --lines 50 --follow

# Export database
firebase database:get / > backup.json

# Import database
firebase database:set / backup.json

# Test function locally
firebase functions:shell
> book({ data: {...} })

# Check Firebase status
curl https://status.firebase.google.com/
```

---

**Last Updated:** 2024-11-19  
**Version:** 1.0
