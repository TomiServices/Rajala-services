# Service Accounts Setup Guide

## Overview

This guide explains all service accounts needed for the Fixnero booking system and how to create and configure them.

## What are Service Accounts?

Service accounts are special Google accounts used by applications (not humans) to access Google APIs. They allow your Firebase Functions to access Google Calendar, send emails, and manage Firestore data securely.

## Required Service Accounts

### 1. Calendar Service Account

**Purpose**: Allows Firebase Functions to create, update, and delete events in Google Calendar

**Email**: `calendar@Webbi1.iam.gserviceaccount.com`

**How to Create**:
```bash
gcloud iam service-accounts create calendar \
  --display-name="Calendar Service Account for Booking System" \
  --project=Webbi1
```

**Required Permissions**:
- Calendar API access (configured in Google Calendar sharing)
- Firestore read/write access
- Cloud Functions invoker (to call functions)

**Grant Permissions**:
```bash
# Grant Firestore access
gcloud projects add-iam-policy-binding Webbi1 \
  --member="serviceAccount:calendar@Webbi1.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Grant Cloud Functions invoker
gcloud projects add-iam-policy-binding Webbi1 \
  --member="serviceAccount:calendar@Webbi1.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.invoker"
```

**Create Key**:
```bash
gcloud iam service-accounts keys create calendar-key.json \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

⚠️ **Important**: Store `calendar-key.json` securely! This file contains credentials that allow full access to the calendar.

**Configure in Firebase Functions**:
```bash
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT --project=Webbi1
# Paste the entire contents of calendar-key.json when prompted
```

**Grant Calendar Access**:
1. Log in to Google Calendar as `palvelut@fixnero.fi`
2. Go to Settings → Settings for my calendars → [Your Calendar] → Share with specific people
3. Add `calendar@Webbi1.iam.gserviceaccount.com`
4. Set permission to "Make changes to events"
5. Save

---

### 2. Compute Service Account (Default)

**Purpose**: Default service account used by Cloud Functions and other Google Cloud services

**Email**: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`

**How to Find**:
```bash
# Get project number
gcloud projects describe Webbi1 --format="value(projectNumber)"

# The service account email will be:
# {number}-compute@developer.gserviceaccount.com
```

**Note**: This service account is **automatically created** by Google Cloud. You don't need to create it manually.

**Required Permissions**:
- Already has most permissions by default
- May need Calendar API access (configured in Google Calendar sharing)

**Grant Calendar Access**:
1. Log in to Google Calendar as `palvelut@fixnero.fi`
2. Go to Settings → Settings for my calendars → [Your Calendar] → Share with specific people
3. Add `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
4. Set permission to "Make changes to events"
5. Save

---

### 3. Firebase Admin SDK Service Account

**Purpose**: Used by Firebase Admin SDK for server-side operations

**Email**: `firebase-adminsdk-{ID}@Webbi1.iam.gserviceaccount.com`

**Note**: This service account is **automatically created** by Firebase when you initialize the project. You don't need to create it manually.

**How to Find**:
1. Go to Firebase Console: https://console.firebase.google.com/project/Webbi1/settings/serviceaccounts/adminsdk
2. Look for "Firebase Admin SDK"
3. You'll see the service account email

**Required Permissions**:
- Automatically has full Firebase admin access
- Can read/write all Firestore collections
- Can manage Firebase Authentication
- Can call Firebase Functions

---

### 4. Firebase Email Extension Service Account

**Purpose**: Used by the "Trigger Email from Firestore" extension to send emails

**Email**: `ext-firestore-send-email@Webbi1.iam.gserviceaccount.com`

**Note**: This service account is **automatically created** when you install the Firebase Email Extension.

**How to Install Extension**:
```bash
firebase ext:install firestore-send-email --project=Webbi1
```

During installation, you'll be prompted to configure:
- SMTP connection URI (for Gmail: `smtps://info@fixnero.fi:PASSWORD@smtp.gmail.com:465`)
- Default FROM address: `info@fixnero.fi`
- Collection name: `mail` (default)

**Required Permissions**:
- Automatically granted by extension installation
- Can read Firestore `mail` collection
- Can send emails via configured SMTP

**Getting Gmail App Password**:
1. Go to: https://myaccount.google.com/apppasswords
2. Log in as: info@fixnero.fi
3. Select "Mail" app and "Other (Custom name)"
4. Enter name: "Booking System Email Extension"
5. Click "Generate"
6. Copy the 16-character password
7. Use in SMTP URI: `smtps://info@fixnero.fi:YOUR_APP_PASSWORD@smtp.gmail.com:465`

---

### 5. Default Extension Service Account

**Purpose**: Default service account for Firebase Extensions

**Email**: `ext-default@Webbi1.iam.gserviceaccount.com`

**Note**: This service account is **automatically created** when you enable Firebase Extensions.

**Required Permissions**:
- Automatically granted by Firebase
- Used as fallback for extensions that don't specify their own service account

---

## Service Account Permissions Summary

| Service Account | Purpose | Firestore | Calendar | Functions | Email |
|----------------|---------|-----------|----------|-----------|-------|
| calendar@ | Calendar sync | ✅ Read/Write | ✅ Full | ✅ Invoke | ❌ |
| compute@ | Default compute | ✅ Read/Write | ✅ Full | ✅ Execute | ❌ |
| firebase-adminsdk@ | Firebase Admin | ✅ Admin | ✅ Admin | ✅ Admin | ✅ Admin |
| ext-firestore-send-email@ | Email sending | ✅ Read mail/ | ❌ | ❌ | ✅ Send |
| ext-default@ | Extensions default | ✅ Read/Write | ❌ | ❌ | ✅ Extension |

## Firestore Security Rules

The service accounts are referenced in Firestore security rules to control data access:

```javascript
// File: firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /varaukset/{id} {
      allow read, write: if request.auth != null &&
        (
          // ... other conditions ...
          
          // Email extension service account
          request.auth.token.email == "ext-firestore-send-email@Webbi1.iam.gserviceaccount.com" ||
          
          // Compute service account pattern
          request.auth.token.email.matches(".*-compute@developer.gserviceaccount.com") ||
          
          // Calendar service account
          request.auth.token.email == "calendar@Webbi1.iam.gserviceaccount.com"
        );
    }
  }
}
```

## Security Best Practices

### 1. Service Account Keys

**DO**:
- ✅ Store keys in Firebase Functions secrets
- ✅ Delete keys from local machine after uploading
- ✅ Use Secret Manager for production
- ✅ Rotate keys periodically (every 90 days recommended)

**DON'T**:
- ❌ Never commit keys to version control
- ❌ Never share keys via email or chat
- ❌ Never store keys in plaintext
- ❌ Never use the same key in multiple environments

### 2. Least Privilege

- Only grant permissions that are actually needed
- Don't grant "Owner" or "Editor" roles unless absolutely necessary
- Use specific roles like "datastore.user" instead of broad roles

### 3. Monitoring

- Regularly review service account usage in Cloud Console
- Enable audit logs for service account actions
- Set up alerts for suspicious activity

## Troubleshooting

### "Permission Denied" Errors

**Check**:
1. Service account exists: `gcloud iam service-accounts list --project=Webbi1`
2. Service account has correct roles: `gcloud projects get-iam-policy Webbi1`
3. Calendar sharing includes the service account
4. Firestore rules reference correct service account email

### "Service Account Key Not Found"

**Solution**:
```bash
# List existing keys
gcloud iam service-accounts keys list \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1

# Create new key if needed
gcloud iam service-accounts keys create calendar-key.json \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

### "Calendar API Not Enabled"

**Solution**:
```bash
gcloud services enable calendar-json.googleapis.com --project=Webbi1
```

### Email Not Sending

**Check**:
1. Firebase Email Extension installed
2. SMTP credentials correct (test with: https://www.gmass.co/smtp-test)
3. Gmail App Password valid (16 characters, no spaces)
4. `ext-firestore-send-email@` service account exists
5. Firestore `mail` collection accessible

## Command Reference

### List All Service Accounts
```bash
gcloud iam service-accounts list --project=Webbi1
```

### View Service Account Details
```bash
gcloud iam service-accounts describe calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

### List Service Account Keys
```bash
gcloud iam service-accounts keys list \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

### Delete Service Account Key
```bash
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
  --project=Webbi1
```

### View Project IAM Policy
```bash
gcloud projects get-iam-policy Webbi1
```

## Additional Resources

- [Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Calendar API Authorization](https://developers.google.com/calendar/api/guides/auth)
- [Firebase Extensions](https://firebase.google.com/docs/extensions)

---

**Last Updated**: 2026-01-13
**Project**: Webbi1
**Contact**: Administrator
