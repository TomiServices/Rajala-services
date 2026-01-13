# Firebase Project Migration to Webbi1

**Date:** 2026-01-13  
**Status:** Complete  
**Migration Direction:** fxnr-web → Webbi1

## Overview

This document summarizes the migration from Firebase project "fxnr-web" to the new Firebase project "Webbi1" with updated domain and service accounts.

## What Changed

### 1. Firebase Project Configuration

- **Old Project:** fxnr-web
- **New Project:** Webbi1
- **Files Updated:**
  - `.firebaserc` - Updated project reference
  - `firebase.json` - Updated Cloud Functions URL in CSP header

### 2. Domain Migration

- **Old Domain:** www.rajala-services.com
- **New Domain:** www.fixnero.fi
- **Files Updated:**
  - `CNAME` - Updated to fixnero.fi
  - `functions/index.js` - Updated ALLOWED_ORIGINS

### 3. Service Accounts

Updated service account references in Firestore security rules:

| Service Account | Old | New |
|----------------|-----|-----|
| Email Extension | `ext-firestore-send-email@fxnr-web.iam.gserviceaccount.com` | `ext-firestore-send-email@Webbi1.iam.gserviceaccount.com` |
| Default Extension | N/A | `ext-default@webbi1.iam.gserviceaccount.com` |
| Compute Engine | `*-compute@developer.gserviceaccount.com` | (unchanged - uses pattern) |

**Note:** The calendar service account reference was replaced with the default extension service account (`ext-default@webbi1.iam.gserviceaccount.com`) in the Webbi1 project.

### 4. Email Configuration

Updated to use **Palvelut@fixnero.fi** for:
- Sending booking confirmation emails
- Google Calendar integration
- Service account authentication

**Files Updated:**
- `functions/.env.example` - Updated EMAIL_USER and EMAIL_FROM

### 5. Cloud Functions URLs

Updated all Firebase Cloud Functions endpoints:

- **Old:** `https://us-central1-fxnr-web.cloudfunctions.net`
- **New:** `https://us-central1-webbi1.cloudfunctions.net`

**Files Updated:**
- `booking-system.js` - Frontend booking endpoints
- `booking-system.min.js` - Minified version
- `test-booking-flow.js` - Test endpoints
- `firebase.json` - CSP header
- `functions/.env.example` - WATCH_CALLBACK_URL

### 6. Calendar Integration

Updated calendar configuration to use:
- **Calendar Owner:** Palvelut@fixnero.fi
- **Service Account:** Should be configured for Webbi1 project
- **Calendar Webhook URL:** `https://us-central1-webbi1.cloudfunctions.net/calendarWebhook`

## Deployment Steps

### 1. Update Environment Variables

Configure the following in Firebase Functions (using Secret Manager or .env):

```bash
# Required Secrets
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set EMAIL_PASSWORD
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
```

**Environment Variables:**
```env
EMAIL_USER=Palvelut@fixnero.fi
EMAIL_FROM=Fixnero <Palvelut@fixnero.fi>
GOOGLE_CALENDAR_ID=<calendar-id-for-palvelut@fixnero.fi>
WATCH_CALLBACK_URL=https://us-central1-webbi1.cloudfunctions.net/calendarWebhook
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Cloud Functions

```bash
cd functions
firebase deploy --only functions
```

### 4. Deploy Hosting

```bash
firebase deploy --only hosting
```

### 5. Configure Service Accounts

Ensure the following service accounts exist in the Webbi1 project:

1. **ext-firestore-send-email@Webbi1.iam.gserviceaccount.com**
   - Created by Firebase Email Extension
   - Needs Firestore read/write permissions

2. **ext-default@webbi1.iam.gserviceaccount.com**
   - Created automatically by Firebase Extensions
   - Used for calendar integration and general extension operations

3. **{PROJECT_NUMBER}-compute@developer.gserviceaccount.com**
   - Created automatically by Google Cloud
   - Used by Cloud Functions

### 6. Configure Firebase Email Extension

Install and configure the "Trigger Email from Firestore" extension:

```bash
firebase ext:install firestore-send-email
```

Configure with:
- **SMTP Connection URI:** `smtps://Palvelut@fixnero.fi:${EMAIL_PASSWORD}@smtp.gmail.com:465`
- **Default FROM:** `Fixnero <Palvelut@fixnero.fi>`
- **Collection:** `mail`

### 7. Share Google Calendar

Share the calendar (Palvelut@fixnero.fi) with the service account:
- Grant "Make changes to events" permission
- Use the service account email from GOOGLE_SERVICE_ACCOUNT configuration

## Validation

Run the verification script:

```bash
./verify-booking-config.sh
```

Expected checks:
- ✓ CSP allows Firebase Functions endpoint (webbi1)
- ✓ CORS includes fixnero.fi domains
- ✓ reCAPTCHA configuration present
- ✓ Error handling present

## Testing

1. **Test Booking Flow:**
   ```bash
   node test-booking-flow.js
   ```

2. **Test Calendar Sync:**
   - Create a booking through the website
   - Verify it appears in Google Calendar (Palvelut@fixnero.fi)
   - Verify email confirmation is sent

3. **Test Email Trigger:**
   - Monitor Firebase Extensions logs
   - Check that emails are sent from Palvelut@fixnero.fi

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Verify ALLOWED_ORIGINS in `functions/index.js` includes fixnero.fi
   - Redeploy functions

2. **Service Account Permissions:**
   - Verify service accounts in Firestore rules match those in Firebase console
   - Check IAM permissions in GCP console

3. **Email Not Sending:**
   - Verify EMAIL_USER and EMAIL_PASSWORD are set correctly
   - Check Gmail app password is valid
   - Verify Firebase Email Extension is installed and configured

4. **Calendar Sync Not Working:**
   - Verify calendar is shared with service account
   - Check GOOGLE_SERVICE_ACCOUNT secret is set
   - Verify GOOGLE_CALENDAR_ID is correct

## Files Changed

**Configuration Files (9 files):**
- `.firebaserc`
- `CNAME`
- `firebase.json`
- `firestore.rules`
- `functions/.env.example`
- `functions/index.js`
- `booking-system.js`
- `booking-system.min.js`
- `test-booking-flow.js`

**Scripts (1 file):**
- `verify-booking-config.sh`

**Documentation (1 file):**
- `docs/WEBBI1_MIGRATION_SUMMARY.md` (this file)

## Next Steps

1. Deploy all changes to Firebase
2. Update DNS settings to point fixnero.fi to Firebase Hosting
3. Configure all required secrets in Firebase Secret Manager
4. Install and configure Firebase Email Extension
5. Test complete booking flow end-to-end
6. Monitor logs for any errors

## Support

For issues or questions:
- Check Firebase Console logs
- Review Firestore rules in Firebase Console
- Verify service accounts in GCP IAM console
- Check email extension logs in Firebase Extensions

---

**Migration Completed:** 2026-01-13  
**Project:** Webbi1  
**Domain:** www.fixnero.fi  
**Email:** Palvelut@fixnero.fi
