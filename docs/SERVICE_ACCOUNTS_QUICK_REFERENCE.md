# Service Accounts & APIs - Quick Reference

Quick reference guide for all service accounts, APIs, and email addresses in the Rajala Services (Fixnero) booking system.

## 🔑 Service Accounts

### Google Calendar Sync Service Account
- **Email**: `fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com` (suggested)
- **Purpose**: Sync bookings with Google Calendar
- **Permissions**: Calendar Editor
- **Created By**: Manual (Google Cloud Console > IAM & Admin > Service Accounts)
- **Used In**: `functions/index.js` - Google Calendar API calls
- **Configuration**: `GOOGLE_SERVICE_ACCOUNT` environment variable

### Firebase Admin SDK Service Account
- **Email**: `firebase-adminsdk-[random]@fxnr-web.iam.gserviceaccount.com`
- **Purpose**: Firebase services access (Firestore, Auth, etc.)
- **Created By**: Automatic (Firebase initialization)
- **Used In**: All Cloud Functions (`firebase-admin` SDK)
- **Configuration**: Automatic (Application Default Credentials)

### Cloud Run Service Account (Gen2 Functions)
- **Email**: `[project-number]-compute@developer.gserviceaccount.com`
- **Purpose**: Execute Cloud Functions Gen2
- **Created By**: Automatic (Firebase Functions Gen2 deployment)
- **Used In**: All Gen2 Cloud Functions runtime
- **Configuration**: Automatic

---

## 🔌 Google Cloud APIs

### Enabled APIs

| API | Status | Purpose | Cost |
|-----|--------|---------|------|
| Google Calendar API | ✅ Manual | Two-way booking sync | Free (1M/day) |
| Cloud Firestore API | ✅ Auto | Database storage | Free tier available |
| Cloud Functions API | ✅ Auto | Backend functions | Pay per invocation |
| Secret Manager API | ✅ Manual | Secure credentials | Free tier (6 versions) |
| Firebase Hosting API | ✅ Auto | Host website | Free tier available |

### NPM Packages for APIs

```json
{
  "firebase-admin": "^13.6.0",      // Firestore, Auth
  "firebase-functions": "^6.6.0",   // Cloud Functions
  "googleapis": "^166.0.0",          // Google Calendar API
  "google-auth-library": "^10.5.0",  // Authentication
  "nodemailer": "^7.0.10"            // Email (Gmail SMTP)
}
```

---

## 📧 Email Addresses & Accounts

### Booking Confirmation Sender
- **Type**: Gmail Account with App Password
- **Configuration**: `EMAIL_USER`, `EMAIL_PASSWORD` (in Secret Manager)
- **Purpose**: Send booking confirmation emails
- **Limit**: 500/day (free), 2000/day (Workspace)
- **Setup**: Google Account > Security > App Passwords

### Company Contact Email
- **Email**: `info@fixnero.fi`
- **Type**: Regular email (not a service account)
- **Purpose**: Customer support contact shown in emails
- **Defined In**: `functions/index.js` (constant)

---

## 🛠️ Third-Party Services

### Google reCAPTCHA v3
- **Site Key**: Public (in frontend code)
- **Secret Key**: `RECAPTCHA_SECRET` (in Secret Manager)
- **Purpose**: Bot protection on booking form
- **Admin**: https://www.google.com/recaptcha/admin
- **Verification**: `verifyRecaptcha()` in `functions/index.js`

### Firebase Email Extension (Optional)
- **Name**: Trigger Email from Firestore
- **Status**: Optional (fallback to Nodemailer)
- **Collection**: `mail`
- **Install**: `firebase ext:install firebaseextensions/firestore-send-email`

---

## 📋 Firebase Collections (Firestore)

| Collection | Purpose | Documents |
|------------|---------|-----------|
| `varaukset` | Booking data | Customer bookings |
| `mail` | Email queue | For Firebase Email Extension |
| `calendarWatch` | Webhook registration | Google Calendar sync tokens |

---

## 🎯 Quick Setup Guide

### For New Reservation System

**1. Create Service Account**
```bash
# Go to: console.cloud.google.com > IAM & Admin > Service Accounts
# Create: new-reservation-system@fxnr-web.iam.gserviceaccount.com
```

**2. Enable APIs**
```bash
# Go to: console.cloud.google.com > APIs & Services > Library
# Enable: Google Calendar API (or other needed APIs)
```

**3. Create Credentials**
```bash
# Service Accounts > Keys > Add Key > JSON
# Save file securely (never commit to Git!)
```

**4. Configure Firebase**
```bash
firebase functions:secrets:set NEW_RESERVATION_SERVICE_ACCOUNT
# Paste JSON content when prompted
```

**5. Grant Access**
```bash
# Share Google Calendar with:
# new-reservation-system@fxnr-web.iam.gserviceaccount.com
# Permission: "Make changes to events"
```

**6. Use in Code**
```javascript
const serviceAccount = JSON.parse(process.env.NEW_RESERVATION_SERVICE_ACCOUNT);
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/calendar']
});
```

---

## 🔍 Finding Service Account Emails

### In Google Cloud Console
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select project: `fxnr-web`
3. Navigate to: **IAM & Admin > Service Accounts**
4. See list with emails

### In Firebase Console
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select project: `fxnr-web`
3. Settings > Service Accounts > Generate new private key
4. Email shown in JSON file

### In Environment Variables
```bash
# Check configured service accounts
firebase functions:config:get
firebase functions:secrets:get

# Local development
cat functions/.env | grep SERVICE_ACCOUNT
```

---

## ⚡ Common Tasks

### Add New Service Account
1. Cloud Console > IAM & Admin > Service Accounts > Create
2. Download JSON key
3. `firebase functions:secrets:set ACCOUNT_NAME`
4. Update code to use new account

### Rotate Service Account Key
1. Service Account > Keys > Add Key > Create new key
2. Update Secret Manager: `firebase functions:secrets:set ACCOUNT_NAME`
3. Deploy: `firebase deploy --only functions`
4. Delete old key after verification

### Share Calendar with Service Account
1. Google Calendar > Settings > Share with specific people
2. Add: `service-account-name@project-id.iam.gserviceaccount.com`
3. Permission: "Make changes to events"

### Setup New Email Sender
1. Create Gmail account or use existing
2. Enable 2-Step Verification
3. Create App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. `firebase functions:secrets:set EMAIL_USER`
5. `firebase functions:secrets:set EMAIL_PASSWORD`

---

## 📊 Service Account Usage Matrix

| Service Account | Google Calendar | Firestore | Cloud Functions | Secret Manager |
|----------------|----------------|-----------|-----------------|----------------|
| Calendar Sync | ✅ | ✅ | ✅ | - |
| Firebase Admin | - | ✅ | ✅ | - |
| Cloud Run Agent | - | - | ✅ | ✅ |

---

## 🔒 Security Checklist

- [ ] Service account keys in Secret Manager (not `.env`)
- [ ] `.env` and `.runtimeconfig.json` in `.gitignore`
- [ ] Using App Passwords (not Gmail password)
- [ ] Least privilege permissions on service accounts
- [ ] Regular key rotation (90 days)
- [ ] Monitoring service account usage
- [ ] Separate accounts for dev/staging/prod

---

## 📚 Related Documentation

- [Full Documentation](./SERVICE_ACCOUNTS_AND_APIS.md) - Complete reference
- [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md) - Calendar integration
- [Email Configuration](./EMAIL_CONFIGURATION.md) - Email setup
- [Secret Manager](./SECRET_MANAGER.md) - Managing secrets (Finnish)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - All env vars

---

**Last Updated**: 2026-01-08  
**Quick Reference Version**: 1.0.0
