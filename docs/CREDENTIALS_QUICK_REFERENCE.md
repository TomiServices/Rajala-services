# Quick Reference: External Integrations Credentials

This document contains all the key information for external integrations after migration to new company accounts.

## 🔐 Critical Credentials

### Firebase Project
- **Project ID**: `Webbi1`
- **Project Console**: https://console.firebase.google.com/project/Webbi1
- **Region**: us-central1

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
  - `calendar@Webbi1.iam.gserviceaccount.com`
  - `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`

### Email Configuration
- **From Address**: info@fixnero.fi
- **SMTP Server**: smtp.gmail.com
- **SMTP Port**: 465 (SSL) or 587 (TLS)
- **Method**: Firebase Email Extension + Nodemailer fallback

## 📋 Service Accounts

### Manual Creation Required

1. **Calendar Service Account**
   - Email: `calendar@Webbi1.iam.gserviceaccount.com`
   - Purpose: Google Calendar integration
   - Status: ⚠️ NEEDS TO BE CREATED

### Auto-Created (Verify Exists)

2. **Compute Service Account**
   - Email: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
   - Purpose: Default Cloud Functions service account
   - Status: ✅ Auto-created by Google Cloud

3. **Firebase Admin SDK**
   - Email: `firebase-adminsdk-{ID}@Webbi1.iam.gserviceaccount.com`
   - Purpose: Firebase Admin operations
   - Status: ✅ Auto-created by Firebase

4. **Email Extension Service Account**
   - Email: `ext-firestore-send-email@Webbi1.iam.gserviceaccount.com`
   - Purpose: Send booking confirmation emails
   - Status: ⚠️ Created when extension is installed

5. **Extensions Default**
   - Email: `ext-default@Webbi1.iam.gserviceaccount.com`
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
WATCH_CALLBACK_URL=https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook
RECAPTCHA_SCORE_THRESHOLD=0.5
```

## 🌐 Allowed Domains

### reCAPTCHA
- fixnero.fi
- fixnero.fi
- Webbi1.web.app
- Webbi1.firebaseapp.com

### CORS (Firebase Functions)
- https://fixnero.fi
- https://fixnero.fi
- https://Webbi1.web.app
- https://Webbi1.firebaseapp.com

## 📊 Firestore Collections

- **varaukset**: Booking data
- **mail**: Email queue for Firebase Email Extension
- **calendarWatch**: Google Calendar webhook registrations

## 🔗 Important URLs

### Development & Deployment
- **Firebase Console**: https://console.firebase.google.com/project/Webbi1
- **Cloud Functions**: https://console.firebase.google.com/project/Webbi1/functions
- **Firestore Database**: https://console.firebase.google.com/project/Webbi1/firestore
- **Functions Logs**: https://console.firebase.google.com/project/Webbi1/functions/logs

### External Services
- **Google Analytics**: https://analytics.google.com
- **reCAPTCHA Admin**: https://www.google.com/recaptcha/admin
- **Google Calendar**: https://calendar.google.com
- **Google Cloud Console**: https://console.cloud.google.com/home/dashboard?project=Webbi1
- **Calendar API Dashboard**: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com?project=Webbi1

### Production Website
- **Main Domain**: https://fixnero.fi
- **Firebase Hosting**: https://Webbi1.web.app

### API Endpoints
- **GET /bookings**: https://us-central1-Webbi1.cloudfunctions.net/bookings
- **POST /book**: https://us-central1-Webbi1.cloudfunctions.net/book
- **POST /calendarWebhook**: https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook
- **POST /watchRegistrar**: https://us-central1-Webbi1.cloudfunctions.net/watchRegistrar

## 📞 Company Contact Information

- **Email**: info@fixnero.fi
- **Phone**: +358401935001
- **Calendar Email**: palvelut@fixnero.fi
- **Website**: fixnero.fi

## ⚡ Quick Commands

### Deploy Everything
```bash
firebase deploy --project=Webbi1
```

### Deploy Functions Only
```bash
firebase deploy --only functions --project=Webbi1
```

### Deploy Hosting Only
```bash
firebase deploy --only hosting --project=Webbi1
```

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules --project=Webbi1
```

### View Logs
```bash
firebase functions:log --project=Webbi1
```

### Set Secret
```bash
firebase functions:secrets:set SECRET_NAME --project=Webbi1
```

### List Functions
```bash
firebase functions:list --project=Webbi1
```

### Create Calendar Service Account
```bash
gcloud iam service-accounts create calendar \
  --display-name="Calendar Service Account" \
  --project=Webbi1
```

### Create Calendar Key
```bash
gcloud iam service-accounts keys create calendar-key.json \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

## 📝 Migration Status Checklist

- [ ] Firebase project verified (Webbi1)
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
