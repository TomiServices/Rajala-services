# Hybrid Calendar - Quick Reference

## Essential URLs

### Admin Functions
- **OAuth Authorization**: https://us-central1-fxnr-web.cloudfunctions.net/generateAuthUrl
- **OAuth Status Check**: https://us-central1-fxnr-web.cloudfunctions.net/checkAuthStatus
- **OAuth Callback**: https://us-central1-fxnr-web.cloudfunctions.net/oauth2callback

### API Endpoints
- **Create Booking**: https://us-central1-fxnr-web.cloudfunctions.net/book (POST)
- **Get Bookings**: https://us-central1-fxnr-web.cloudfunctions.net/bookings (GET)
- **Webhook**: https://us-central1-fxnr-web.cloudfunctions.net/googleCalendarWebhook (POST)

## Quick Commands

### Deployment
```bash
# Install dependencies
cd functions && npm install && cd ..

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:book
```

### Configuration
```bash
# Set OAuth credentials
firebase functions:config:set \
  google.client_id="YOUR_CLIENT_ID" \
  google.client_secret="YOUR_CLIENT_SECRET"

# View configuration
firebase functions:config:get

# Delete configuration
firebase functions:config:unset google
```

### Monitoring
```bash
# View logs (last 50 lines)
firebase functions:log --limit 50

# Follow logs in real-time
firebase functions:log --follow

# View specific function logs
firebase functions:log --only scheduledSync

# Filter by date
firebase functions:log --since 1h
```

### Database Operations
```bash
# Get all appointments
firebase database:get /appointments

# Get sync status
firebase database:get /calendar_sync

# Get OAuth tokens (admin only)
firebase database:get /google_calendar/oauth_tokens

# Export database backup
firebase database:get / > backup-$(date +%Y%m%d).json

# Import database
firebase database:set / backup.json
```

## Health Checks

### Quick Status Check (30 seconds)
1. Check OAuth: https://us-central1-fxnr-web.cloudfunctions.net/checkAuthStatus
2. Check last sync: `firebase database:get /calendar_sync/lastSyncTime`
3. Check for errors: `firebase database:get /calendar_sync/syncErrors`

### Full Health Check (5 minutes)
1. OAuth status ✓
2. Last sync within 5 minutes ✓
3. No sync errors ✓
4. Create test booking ✓
5. Verify in Google Calendar ✓
6. Check function logs ✓

## Firebase Console

- **Project**: https://console.firebase.google.com/project/fxnr-web
- **Functions**: https://console.firebase.google.com/project/fxnr-web/functions
- **Database**: https://console.firebase.google.com/project/fxnr-web/database
- **Logs**: https://console.firebase.google.com/project/fxnr-web/functions/logs

## Google Cloud Console

- **Project**: https://console.cloud.google.com
- **Calendar API**: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **OAuth Consent**: https://console.cloud.google.com/apis/credentials/consent

## Troubleshooting

### OAuth Not Working
```bash
# 1. Check OAuth tokens exist
firebase database:get /google_calendar/oauth_tokens

# 2. If missing, re-authorize
# Visit: https://us-central1-fxnr-web.cloudfunctions.net/generateAuthUrl

# 3. Verify tokens stored
firebase database:get /google_calendar/oauth_tokens/access_token
```

### Sync Not Working
```bash
# 1. Check last sync time
firebase database:get /calendar_sync/lastSyncTime

# 2. Check for errors
firebase database:get /calendar_sync/syncErrors

# 3. View function logs
firebase functions:log --only scheduledSync --limit 20

# 4. Trigger manual sync
# (Will auto-run every 5 minutes)
```

### Webhook Not Receiving
```bash
# 1. Check webhook status
firebase database:get /google_calendar/webhook

# 2. Verify channel not expired
# expiration should be > current time

# 3. Check webhook logs
firebase functions:log --only googleCalendarWebhook --limit 20
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `google.client_id` | OAuth Client ID | `123-xyz.apps.googleusercontent.com` |
| `google.client_secret` | OAuth Client Secret | `GOCSPX-abcd1234` |
| `recaptcha.secret` | reCAPTCHA Secret | `6LdmOg...` |

## Firebase Database Paths

```
/appointments/{appointmentId}
  - id: UUID
  - googleCalendarId: string
  - customerName: string
  - customerEmail: string
  - customerPhone: string
  - services: array
  - startTime: ISO timestamp
  - endTime: ISO timestamp
  - status: 'confirmed' | 'cancelled' | 'deleted'
  - syncStatus: 'synced' | 'sync_failed' | 'pending'
  - createdAt: ISO timestamp
  - updatedAt: ISO timestamp

/google_calendar
  - /oauth_tokens
  - /webhook

/calendar_sync
  - lastSyncTime: ISO timestamp
  - syncErrors: array
```

## Key Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `book` | Create appointment | HTTP POST |
| `bookings` | Get all bookings | HTTP GET |
| `generateAuthUrl` | Start OAuth flow | HTTP GET |
| `oauth2callback` | Complete OAuth | HTTP GET |
| `checkAuthStatus` | Check OAuth status | HTTP GET |
| `googleCalendarWebhook` | Receive Google notifications | HTTP POST (Webhook) |
| `scheduledSync` | Backup sync | Scheduled (every 5 min) |
| `onAppointmentCreated` | Sync new appointment | Database trigger |
| `onAppointmentUpdated` | Sync updated appointment | Database trigger |

## Performance Targets

- Page Load: < 3 seconds
- Booking Creation: < 2 seconds
- Calendar Render: < 1 second
- Sync Latency: < 10 seconds (webhook) or < 5 minutes (scheduled)
- API Calls/Day: < 10,000 (current: ~2,000)

## Security Checklist

- [ ] OAuth2 tokens stored securely
- [ ] reCAPTCHA enabled and working
- [ ] CORS configured for allowed origins
- [ ] Input validation enabled
- [ ] Firebase security rules applied
- [ ] Environment variables protected

## Support

**Documentation**:
- Implementation Guide: `HYBRID_CALENDAR_IMPLEMENTATION.md`
- Setup Guide: `docs/GOOGLE_CALENDAR_SETUP.md`
- Testing Guide: `docs/TESTING_GUIDE.md`
- Maintenance Guide: `docs/MAINTENANCE_GUIDE.md`

**Contacts**:
- Firebase Support: https://firebase.google.com/support
- Google Cloud Support: https://cloud.google.com/support
- Repository: https://github.com/TomiServices/Rajala-services

---

**Last Updated**: 2024-11-19  
**Version**: 1.0
