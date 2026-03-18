# Migration Guide: Webbi1 to New Company Accounts

## Overview

This guide documents the migration from the old Webbi1 Firebase project to new company-owned accounts for all external integrations. This migration updates all service accounts, API keys, and configurations to use the new company infrastructure.

## Important Information from Previous Setup

### Old Configuration (Webbi1)
- **Firebase Project**: Webbi1
- **Google Analytics**: G-1DZ4WCV7ZK
- **Service Accounts**: Various @webbi1.iam.gserviceaccount.com accounts
- **Calendar Owner**: (Old setup)

### New Configuration
- **Firebase Project**: fxnr-web (existing, needs verification)
- **Google Analytics**: G-SP5R1MN1H9 (already configured)
- **Calendar Owner**: palvelut@fixnero.fi
- **reCAPTCHA Site Key**: 6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr
- **reCAPTCHA Secret Key**: 6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96

## New Service Accounts Required

Based on the problem statement, the following service accounts need to be created in the new Firebase project (fxnr-web):

### 1. Calendar Service Account
- **Purpose**: Google Calendar API integration
- **Old Email**: calendar@webbi1.iam.gserviceaccount.com
- **New Email**: calendar@fxnr-web.iam.gserviceaccount.com
- **Permissions Needed**:
  - Google Calendar API access
  - Edit and read access to calendar: palvelut@fixnero.fi
  - Firestore read/write access (for booking sync)

### 2. Compute Service Account
- **Purpose**: Cloud Functions default service account
- **Old Email**: 135892519284-compute@developer.gserviceaccount.com
- **New Pattern**: {PROJECT_NUMBER}-compute@developer.gserviceaccount.com
- **Note**: Auto-created by Google Cloud, just needs proper permissions

### 3. Firebase Admin SDK Service Account
- **Purpose**: Firebase Functions authentication
- **Old Email**: firebase-adminsdk-fbsvc@webbi1.iam.gserviceaccount.com
- **New Email**: firebase-adminsdk-{ID}@fxnr-web.iam.gserviceaccount.com
- **Note**: Auto-created by Firebase

### 4. Firestore Email Extension Service Account
- **Purpose**: Trigger Email from Firestore extension
- **Old Email**: ext-firestore-send-email@webbi1.iam.gserviceaccount.com
- **New Email**: ext-firestore-send-email@fxnr-web.iam.gserviceaccount.com
- **Note**: Created by Firebase Email Extension

### 5. Default Extension Service Account
- **Purpose**: Firebase Extensions default
- **Old Email**: ext-default@webbi1.iam.gserviceaccount.com
- **New Email**: ext-default@fxnr-web.iam.gserviceaccount.com
- **Note**: Created by Firebase when extensions are enabled

## Migration Steps

### Phase 1: Google Analytics Update

✅ **Status**: Already completed in repository
- Google Analytics tag already updated to G-SP5R1MN1H9
- Configured in `ga-config.js` and `cookie-consent.js`
- No action needed

### Phase 2: reCAPTCHA v3 Update

**Current Status**: Using key `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

**Action Required**:
1. Update to new reCAPTCHA v3 credentials:
   - Site Key: `6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr`
   - Secret Key: `6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96`

2. Files to update:
   - `booking-system.js` - Update RECAPTCHA_SITE_KEY constant
   - `booking-system.min.js` - Rebuild after updating source
   - `index.html` - Update reCAPTCHA script tag
   - `scripts/validate-services.sh` - Update validation script

3. Configure in Firebase Functions:
   ```bash
   firebase functions:secrets:set RECAPTCHA_SECRET
   # When prompted, enter: 6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96
   ```

4. Verify domains in reCAPTCHA Admin Console:
   - rajala-services.com
   - www.rajala-services.com
   - fxnr-web.web.app
   - fxnr-web.firebaseapp.com

### Phase 3: Firestore Security Rules Update

**Current Rules Location**: Need to be deployed to Firebase

**Action Required**:
1. Create `firestore.rules` file with updated service account emails
2. Deploy rules to Firebase

**New Firestore Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /varaukset/{id} {
      allow read, write: if request.auth != null &&
        (
          request.auth.token.admin == true ||
          request.auth.uid == resource.data.userId ||
          (!exists(/databases/$(database)/documents/varaukset/$(id)) && request.resource.data.userId == request.auth.uid) ||
          request.auth.token.email == "ext-firestore-send-email@fxnr-web.iam.gserviceaccount.com" ||
          request.auth.token.email.matches(".*-compute@developer.gserviceaccount.com")
        );
    }
  }
}
```

### Phase 4: Google Calendar Integration

**Calendar Owner**: palvelut@fixnero.fi

**Required Service Accounts with Calendar Access**:
1. {PROJECT_NUMBER}-compute@developer.gserviceaccount.com
2. calendar@fxnr-web.iam.gserviceaccount.com

**Action Required**:
1. Create calendar service account:
   ```bash
   gcloud iam service-accounts create calendar \
     --display-name="Calendar Service Account for Booking System" \
     --project=fxnr-web
   ```

2. Grant calendar access:
   - Go to Google Calendar for palvelut@fixnero.fi
   - Settings → Share with specific people
   - Add both service accounts with "Make changes to events" permission

3. Create and download service account key:
   ```bash
   gcloud iam service-accounts keys create calendar-key.json \
     --iam-account=calendar@fxnr-web.iam.gserviceaccount.com \
     --project=fxnr-web
   ```

4. Configure in Firebase Functions:
   ```bash
   # Convert JSON to base64 or store as-is
   firebase functions:config:set google.service_account="$(cat calendar-key.json)"
   firebase functions:config:set google.calendar_id="primary"
   
   # Or use Secret Manager (recommended):
   firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
   # Paste the calendar-key.json contents when prompted
   
   firebase functions:secrets:set GOOGLE_CALENDAR_ID
   # Enter: {calendar-id-of-palvelut@fixnero.fi}
   ```

### Phase 5: Email Configuration

**Email Sending Methods**:
1. Firebase Email Extension (Trigger Email from Firestore) - Primary
2. Nodemailer fallback

**Action Required**:
1. Install Firebase Email Extension if not already installed
2. Configure SMTP settings (Gmail or other)
3. Set environment variables:
   ```bash
   firebase functions:secrets:set EMAIL_USER
   # Enter: info@fixnero.fi or configured email
   
   firebase functions:secrets:set EMAIL_PASSWORD
   # Enter: app-specific password
   
   firebase functions:secrets:set EMAIL_FROM
   # Enter: info@fixnero.fi
   ```

### Phase 6: Firebase Project Verification

**Verify Current Project**: fxnr-web

**Action Required**:
1. Verify project is correctly configured:
   ```bash
   firebase projects:list
   firebase use fxnr-web
   ```

2. Verify Firestore database exists
3. Verify Cloud Functions are deployed
4. Check project permissions

## Service Account Permissions Matrix

| Service Account | Firestore | Calendar API | Cloud Functions | Email Extension |
|----------------|-----------|--------------|-----------------|-----------------|
| calendar@fxnr-web.iam.gserviceaccount.com | ✅ Read/Write | ✅ Full | ❌ | ❌ |
| {number}-compute@developer.gserviceaccount.com | ✅ Read/Write | ✅ Full | ✅ Default | ❌ |
| firebase-adminsdk@fxnr-web.iam.gserviceaccount.com | ✅ Admin | ✅ Admin | ✅ Admin | ✅ Admin |
| ext-firestore-send-email@fxnr-web.iam.gserviceaccount.com | ✅ Read | ❌ | ❌ | ✅ Full |
| ext-default@fxnr-web.iam.gserviceaccount.com | ✅ Read/Write | ❌ | ❌ | ✅ Full |

## Environment Variables Summary

**Required in Firebase Functions**:

```bash
# Google Calendar
GOOGLE_SERVICE_ACCOUNT=<calendar-service-account-json>
GOOGLE_CALENDAR_ID=<calendar-id-for-palvelut@fixnero.fi>

# Email Configuration
EMAIL_USER=info@fixnero.fi
EMAIL_PASSWORD=<app-specific-password>
EMAIL_FROM=info@fixnero.fi

# reCAPTCHA v3
RECAPTCHA_SECRET=6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96

# Optional
WATCH_CALLBACK_URL=https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook
RECAPTCHA_SCORE_THRESHOLD=0.5
```

**Public Configuration** (in code):
- reCAPTCHA Site Key: 6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr
- Google Analytics: G-SP5R1MN1H9
- Firebase Project: fxnr-web

## Testing Checklist

### Before Deployment
- [ ] Verify all service accounts created
- [ ] Verify service accounts have correct permissions
- [ ] Verify calendar sharing configured
- [ ] Verify reCAPTCHA keys configured in Admin Console
- [ ] Verify environment variables set in Firebase Functions
- [ ] Test reCAPTCHA locally
- [ ] Review Firestore rules

### After Deployment
- [ ] Test booking creation
- [ ] Verify email notifications sent
- [ ] Verify Google Calendar sync works (booking → calendar)
- [ ] Verify reverse calendar sync works (calendar → Firestore)
- [ ] Test reCAPTCHA verification
- [ ] Check Google Analytics tracking
- [ ] Monitor Firebase Functions logs
- [ ] Test on mobile devices

## Rollback Plan

If issues occur after migration:

1. **Immediate Rollback**:
   - Revert Firebase Functions deployment
   - Update reCAPTCHA back to old keys temporarily
   - Contact users about temporary service interruption

2. **Partial Rollback**:
   - Keep new configuration but temporarily disable problematic features
   - Use email fallback if calendar sync fails
   - Monitor and fix issues incrementally

3. **Data Safety**:
   - All bookings stored in Firestore (persists across changes)
   - Email confirmations sent regardless of calendar sync
   - No data loss expected

## Security Considerations

### GDPR Compliance
- ✅ Cookie consent maintained
- ✅ Email addresses encrypted in transit (HTTPS/TLS)
- ✅ Service accounts follow principle of least privilege
- ✅ reCAPTCHA v3 invisible to users
- ✅ Data retention policies unchanged

### API Keys Security
- ✅ Server-side secrets stored in Firebase Functions secrets
- ✅ Public keys (reCAPTCHA site key, GA tag) only visible in frontend
- ✅ No private keys committed to repository
- ✅ Service account keys rotatable

## Support & Troubleshooting

### Common Issues

1. **Calendar Sync Not Working**
   - Check service account has calendar access
   - Verify GOOGLE_CALENDAR_ID is correct
   - Check Firebase Functions logs for errors

2. **Email Not Sending**
   - Verify EMAIL_USER and EMAIL_PASSWORD are correct
   - Check if app-specific password is needed
   - Verify Firebase Email Extension installed

3. **reCAPTCHA Verification Failing**
   - Verify RECAPTCHA_SECRET matches site key
   - Check domain is whitelisted in reCAPTCHA console
   - Monitor reCAPTCHA Admin Console for abuse reports

4. **Firestore Permission Denied**
   - Check Firestore rules deployed
   - Verify service account emails match
   - Check user authentication status

### Monitoring

**Firebase Console**:
- Functions logs: https://console.firebase.google.com/project/fxnr-web/functions/logs
- Firestore data: https://console.firebase.google.com/project/fxnr-web/firestore
- Analytics: https://console.firebase.google.com/project/fxnr-web/analytics

**Google Services**:
- Calendar API quota: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com
- reCAPTCHA analytics: https://www.google.com/recaptcha/admin
- Google Analytics: https://analytics.google.com/

## Contacts

- **Primary Calendar**: palvelut@fixnero.fi
- **Company Email**: info@fixnero.fi
- **Company Phone**: +358401935001
- **Website**: rajala-services.com

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Calendar API](https://developers.google.com/calendar)
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Google Analytics 4](https://support.google.com/analytics)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Migration Date**: {To be filled when migration is performed}
**Performed By**: {Administrator name}
**Status**: Pending Implementation
