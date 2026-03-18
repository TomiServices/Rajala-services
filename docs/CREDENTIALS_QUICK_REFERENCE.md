# Quick Reference: External Integrations Credentials

This document contains all the key information for external integrations after migration to new company accounts.

## 🔐 Critical Credentials

### Firebase Project
- **Project ID**: `fxnr-web`
- **Project Console**: https://console.firebase.google.com/project/fxnr-web
- **Region**: europe-north1

### Google Analytics
- **Measurement ID**: `G-SP5R1MN1H9`
- **Property Name**: (Your Google Analytics property name)
- **Console**: https://analytics.google.com

### reCAPTCHA v3
- **Site Key** (Public): `6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr`
- **Secret Key** (Private): `6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96`
- **Console**: https://www.google.com/recaptcha/admin
- **Type**: reCAPTCHA v3 (Invisible)

### Google Calendar
- **Calendar Owner**: palvelut@fixnero.fi
- **Calendar Access**: https://calendar.google.com
- **Service Accounts with Access**:
  - `calendar@fxnr-web.iam.gserviceaccount.com`
  - `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`

### Email Configuration
- **From Address**: info@fixnero.fi
- **SMTP Server**: smtp.gmail.com
- **SMTP Port**: 465 (SSL) or 587 (TLS)
- **Method**: Firebase Email Extension + Nodemailer fallback

## 📋 Service Accounts

### Manual Creation Required

1. **Calendar Service Account**
   - Email: `calendar@fxnr-web.iam.gserviceaccount.com`
   - Purpose: Google Calendar integration
   - Status: ⚠️ NEEDS TO BE CREATED

### Auto-Created (Verify Exists)

2. **Compute Service Account**
   - Email: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
   - Purpose: Default Cloud Functions service account
   - Status: ✅ Auto-created by Google Cloud

3. **Firebase Admin SDK**
   - Email: `firebase-adminsdk-{ID}@fxnr-web.iam.gserviceaccount.com`
   - Purpose: Firebase Admin operations
   - Status: ✅ Auto-created by Firebase

4. **Email Extension Service Account**
   - Email: `ext-firestore-send-email@fxnr-web.iam.gserviceaccount.com`
   - Purpose: Send booking confirmation emails
   - Status: ⚠️ Created when extension is installed

5. **Extensions Default**
   - Email: `ext-default@fxnr-web.iam.gserviceaccount.com`
   - Purpose: Default for Firebase Extensions
   - Status: ✅ Auto-created when extensions enabled

## 🔧 Firebase Functions Secrets

These need to be configured in Firebase Functions:

```bash
# reCAPTCHA
RECAPTCHA_SECRET=6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96

# Google Calendar
GOOGLE_SERVICE_ACCOUNT={JSON content of calendar-key.json}
GOOGLE_CALENDAR_ID={calendar-id-for-palvelut@fixnero.fi}

# Email
EMAIL_USER=info@fixnero.fi
EMAIL_PASSWORD={Gmail app-specific password}
EMAIL_FROM=info@fixnero.fi

# Optional
WATCH_CALLBACK_URL=https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook
RECAPTCHA_SCORE_THRESHOLD=0.5
```

## 🌐 Allowed Domains

### reCAPTCHA
- rajala-services.com
- www.rajala-services.com
- fxnr-web.web.app
- fxnr-web.firebaseapp.com

### CORS (Firebase Functions)
- https://www.rajala-services.com
- https://rajala-services.com
- https://fxnr-web.web.app
- https://fxnr-web.firebaseapp.com

## 📊 Firestore Collections

- **varaukset**: Booking data
- **mail**: Email queue for Firebase Email Extension
- **calendarWatch**: Google Calendar webhook registrations

## 🔗 Important URLs

### Development & Deployment
- **Firebase Console**: https://console.firebase.google.com/project/fxnr-web
- **Cloud Functions**: https://console.firebase.google.com/project/fxnr-web/functions
- **Firestore Database**: https://console.firebase.google.com/project/fxnr-web/firestore
- **Functions Logs**: https://console.firebase.google.com/project/fxnr-web/functions/logs

### External Services
- **Google Analytics**: https://analytics.google.com
- **reCAPTCHA Admin**: https://www.google.com/recaptcha/admin
- **Google Calendar**: https://calendar.google.com
- **Google Cloud Console**: https://console.cloud.google.com/home/dashboard?project=fxnr-web
- **Calendar API Dashboard**: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com?project=fxnr-web

### Production Website
- **Main Domain**: https://rajala-services.com
- **Firebase Hosting**: https://fxnr-web.web.app

### API Endpoints
- **GET /bookings**: https://europe-north1-fxnr-web.cloudfunctions.net/bookings
- **POST /book**: https://europe-north1-fxnr-web.cloudfunctions.net/book
- **POST /calendarWebhook**: https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook
- **POST /watchRegistrar**: https://europe-north1-fxnr-web.cloudfunctions.net/watchRegistrar

## 📞 Company Contact Information

- **Email**: info@fixnero.fi
- **Phone**: +358401935001
- **Calendar Email**: palvelut@fixnero.fi
- **Website**: rajala-services.com

## ⚡ Quick Commands

### Deploy Everything
```bash
firebase deploy --project=fxnr-web
```

### Deploy Functions Only
```bash
firebase deploy --only functions --project=fxnr-web
```

### Deploy Hosting Only
```bash
firebase deploy --only hosting --project=fxnr-web
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules --project=fxnr-web
```

### View Logs
```bash
firebase functions:log --project=fxnr-web
```

### Set Secret
```bash
firebase functions:secrets:set SECRET_NAME --project=fxnr-web
```

### List Functions
```bash
firebase functions:list --project=fxnr-web
```

### Create Calendar Service Account
```bash
gcloud iam service-accounts create calendar \
  --display-name="Calendar Service Account" \
  --project=fxnr-web
```

### Create Calendar Key
```bash
gcloud iam service-accounts keys create calendar-key.json \
  --iam-account=calendar@fxnr-web.iam.gserviceaccount.com \
  --project=fxnr-web
```

## 📝 Migration Status Checklist

- [ ] Firebase project verified (fxnr-web)
- [ ] Google Analytics already updated (G-SP5R1MN1H9) ✅
- [ ] reCAPTCHA credentials updated in code
- [ ] Firestore security rules created
- [ ] Calendar service account created
- [ ] Calendar service account has calendar access
- [ ] Firebase Functions secrets configured
- [ ] Email extension installed and configured
- [ ] All code changes deployed
- [ ] Testing completed
- [ ] Monitoring verified

## 🚨 Emergency Contacts

### Technical Issues
- Firebase Support: https://firebase.google.com/support
- Google Cloud Support: https://cloud.google.com/support
- reCAPTCHA Help: https://support.google.com/recaptcha

### Repository
- GitHub Repo: TomiServices/Rajala-services
- Branch: copilot/redesign-external-integrations-again

## 📖 Documentation

Detailed guides are available in the `docs/` directory:

- **NEW_COMPANY_MIGRATION_GUIDE.md**: Complete migration guide
- **DEPLOYMENT_CHECKLIST_MIGRATION.md**: Step-by-step deployment checklist
- **SERVICE_ACCOUNTS_SETUP.md**: Service accounts creation and configuration
- **CONFIGURATION.md**: Environment variables reference
- **DEPLOYMENT_GUIDE.md**: Deployment procedures

## 🔒 Security Notes

⚠️ **NEVER commit these to version control:**
- Service account JSON keys (*.json)
- Secret keys (RECAPTCHA_SECRET, EMAIL_PASSWORD, etc.)
- Private API keys
- Passwords or tokens

✅ **Safe to commit:**
- Public API keys (reCAPTCHA site key, Google Analytics ID)
- Configuration templates
- Documentation

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Status**: Ready for deployment

Keep this document updated when credentials change!
