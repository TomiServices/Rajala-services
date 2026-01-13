# Deployment Checklist: External Integrations Migration

This checklist guides the migration from old Webbi1 accounts to new company accounts for all external integrations.

## Pre-Deployment Checklist

### 1. Google reCAPTCHA v3 Setup

- [ ] **Access reCAPTCHA Admin Console**
  - URL: https://www.google.com/recaptcha/admin
  - Log in with company Google account

- [ ] **Verify reCAPTCHA v3 Site Exists**
  - Site Key: `6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr`
  - Secret Key: `6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96`
  - Type: reCAPTCHA v3
  
- [ ] **Configure Allowed Domains**
  - Add: `fixnero.fi`
  - Add: `fixnero.fi`
  - Add: `Webbi1.web.app` (for testing)
  - Add: `Webbi1.firebaseapp.com` (for testing)

### 2. Firebase Project Setup

- [ ] **Verify Firebase Project**
  - Project ID: `Webbi1`
  - Go to: https://console.firebase.google.com/project/Webbi1
  - Verify you have Owner or Editor access

- [ ] **Enable Required APIs**
  ```bash
  # Enable Google Calendar API
  gcloud services enable calendar-json.googleapis.com --project=Webbi1
  
  # Enable Secret Manager API (for storing secrets)
  gcloud services enable secretmanager.googleapis.com --project=Webbi1
  ```

### 3. Service Accounts Creation

- [ ] **Create Calendar Service Account**
  ```bash
  gcloud iam service-accounts create calendar \
    --display-name="Calendar Service Account for Booking System" \
    --project=Webbi1
  ```
  
  Expected email: `calendar@Webbi1.iam.gserviceaccount.com`

- [ ] **Grant Service Account Permissions**
  ```bash
  # Grant Firestore access
  gcloud projects add-iam-policy-binding Webbi1 \
    --member="serviceAccount:calendar@Webbi1.iam.gserviceaccount.com" \
    --role="roles/datastore.user"
  
  # Grant Cloud Functions invoker role (if needed)
  gcloud projects add-iam-policy-binding Webbi1 \
    --member="serviceAccount:calendar@Webbi1.iam.gserviceaccount.com" \
    --role="roles/cloudfunctions.invoker"
  ```

- [ ] **Create and Download Service Account Key**
  ```bash
  gcloud iam service-accounts keys create /tmp/calendar-key.json \
    --iam-account=calendar@Webbi1.iam.gserviceaccount.com \
    --project=Webbi1
  ```
  
  ⚠️ **IMPORTANT**: Store this key securely! Never commit to version control.

- [ ] **Verify Compute Service Account**
  - Auto-created service account: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
  - Find project number:
    ```bash
    gcloud projects describe Webbi1 --format="value(projectNumber)"
    ```

### 4. Google Calendar Configuration

- [ ] **Access Google Calendar**
  - Log in to Google Calendar as: palvelut@fixnero.fi
  - URL: https://calendar.google.com

- [ ] **Share Calendar with Service Accounts**
  - Go to Settings → Settings for my calendars → `palvelut@fixnero.fi` → Share with specific people
  - Add: `calendar@Webbi1.iam.gserviceaccount.com`
    - Permission: "Make changes to events"
  - Add: `{PROJECT_NUMBER}-compute@developer.gserviceaccount.com`
    - Permission: "Make changes to events"

- [ ] **Get Calendar ID**
  - In Calendar Settings, find "Integrate calendar" section
  - Copy the Calendar ID (usually the email address or a string like `xyz@group.calendar.google.com`)
  - Save for later use

### 5. Email Configuration

**Option A: Firebase Email Extension (Recommended)**

- [ ] **Install Firebase Email Extension**
  ```bash
  firebase ext:install firestore-send-email --project=Webbi1
  ```

- [ ] **Configure SMTP Settings**
  - SMTP Server: smtp.gmail.com (for Gmail)
  - SMTP Port: 465 (SSL) or 587 (TLS)
  - SMTP Username: info@fixnero.fi
  - SMTP Password: [Create App-Specific Password]

- [ ] **Create Gmail App-Specific Password**
  1. Go to: https://myaccount.google.com/apppasswords
  2. Log in as: info@fixnero.fi
  3. Select "Mail" and "Other (Custom name)" → "Booking System"
  4. Generate password
  5. Save password securely

**Option B: Direct Nodemailer Configuration**

- [ ] **Get Gmail Credentials**
  - Email: info@fixnero.fi
  - Create App-Specific Password (same as above)

### 6. Firebase Functions Environment Setup

- [ ] **Set reCAPTCHA Secret**
  ```bash
  firebase functions:secrets:set RECAPTCHA_SECRET --project=Webbi1
  # When prompted, enter: 6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96
  ```

- [ ] **Set Google Calendar Configuration**
  ```bash
  # Set calendar service account JSON (paste entire content)
  firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT --project=Webbi1
  # Paste contents of /tmp/calendar-key.json
  
  # Set calendar ID
  firebase functions:secrets:set GOOGLE_CALENDAR_ID --project=Webbi1
  # Enter the calendar ID you copied earlier
  ```

- [ ] **Set Email Configuration**
  ```bash
  firebase functions:secrets:set EMAIL_USER --project=Webbi1
  # Enter: info@fixnero.fi
  
  firebase functions:secrets:set EMAIL_PASSWORD --project=Webbi1
  # Enter: [App-specific password from Gmail]
  
  firebase functions:secrets:set EMAIL_FROM --project=Webbi1
  # Enter: info@fixnero.fi
  ```

- [ ] **Set Optional Configuration**
  ```bash
  # Webhook callback URL for calendar sync
  firebase functions:secrets:set WATCH_CALLBACK_URL --project=Webbi1
  # Enter: https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook
  ```

### 7. Deploy Firestore Security Rules

- [ ] **Review Firestore Rules**
  - File: `firestore.rules`
  - Verify service account emails are correct
  - Verify all required collections are covered

- [ ] **Deploy Firestore Rules**
  ```bash
  firebase deploy --only firestore:rules --project=Webbi1
  ```

- [ ] **Verify Rules Deployment**
  - Go to: https://console.firebase.google.com/project/Webbi1/firestore/rules
  - Check that rules show the new service account emails

## Deployment Steps

### 8. Deploy Code Changes

- [ ] **Build Minified Files** (if needed)
  ```bash
  # If booking-system.min.js needs rebuilding:
  # (This depends on your build process)
  ```

- [ ] **Deploy Firebase Functions**
  ```bash
  cd functions
  npm install
  cd ..
  firebase deploy --only functions --project=Webbi1
  ```

- [ ] **Deploy Firebase Hosting**
  ```bash
  firebase deploy --only hosting --project=Webbi1
  ```

- [ ] **Verify Deployment**
  ```bash
  firebase functions:list --project=Webbi1
  ```
  
  Expected functions:
  - `bookings` (GET endpoint)
  - `book` (POST endpoint)
  - `calendarWebhook` (POST endpoint)
  - `onBookingCreated` (Firestore trigger)
  - `onBookingUpdated` (Firestore trigger)
  - `onBookingDeleted` (Firestore trigger)
  - `watchRegistrar` (POST endpoint)
  - `renewCalendarWatch` (POST endpoint)

## Post-Deployment Testing

### 9. Functional Testing

- [ ] **Test reCAPTCHA**
  - Open: https://fixnero.fi
  - Scroll to booking form
  - Check browser console for reCAPTCHA loading
  - Should see: `grecaptcha` object available
  - Should NOT see errors about invalid site key

- [ ] **Test Booking Creation**
  - Fill out booking form with test data
  - Submit booking
  - Expected result: Success message
  - Check Firebase Console → Firestore → `varaukset` collection
  - Verify booking document created

- [ ] **Test Email Notification**
  - Use real email address in test booking
  - Check email inbox
  - Expected: Confirmation email from info@fixnero.fi
  - Verify email content is correct

- [ ] **Test Google Calendar Sync**
  - Check Google Calendar (palvelut@fixnero.fi)
  - Expected: Event created with booking details
  - Verify event time matches booking time
  - Verify event description contains customer info

- [ ] **Test Reverse Calendar Sync**
  - Create event directly in Google Calendar
  - Set time during business hours (9-17, weekdays)
  - Wait 1-2 minutes
  - Check Firestore → `varaukset` collection
  - Expected: Booking document created with `syncedFromGoogle: true`

- [ ] **Test Google Analytics**
  - Open: https://fixnero.fi
  - Accept cookies when prompted
  - Navigate through pages
  - Check: https://analytics.google.com
  - Verify: Real-time data shows your visit
  - Property ID should be: G-SP5R1MN1H9

- [ ] **Test Calendar Webhook Registration**
  ```bash
  curl -X POST https://us-central1-Webbi1.cloudfunctions.net/watchRegistrar \
    -H "Content-Type: application/json" \
    -d '{
      "callbackUrl": "https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook"
    }'
  ```
  
  Expected: Success response with watch details

### 10. Monitoring and Verification

- [ ] **Check Firebase Functions Logs**
  ```bash
  firebase functions:log --project=Webbi1
  ```
  
  Or visit: https://console.firebase.google.com/project/Webbi1/functions/logs
  
  Look for:
  - No authentication errors
  - Successful booking creations
  - Email sent confirmations
  - Calendar sync success messages

- [ ] **Check reCAPTCHA Analytics**
  - Go to: https://www.google.com/recaptcha/admin
  - Select site: `6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr`
  - Verify: Requests being logged
  - Check: Score distribution (should be mostly high scores)

- [ ] **Check Google Analytics Dashboard**
  - Go to: https://analytics.google.com
  - Select Property: G-SP5R1MN1H9
  - Verify: Real-time users
  - Verify: Events being tracked

- [ ] **Monitor Calendar API Usage**
  - Go to: https://console.cloud.google.com/apis/dashboard?project=Webbi1
  - Select: Calendar API
  - Verify: Requests being logged
  - Check: No quota errors

### 11. Security Verification

- [ ] **Verify Firestore Security**
  - Try accessing Firestore without authentication
  - Expected: Permission denied
  - Try accessing with regular user account
  - Expected: Can only read/write own bookings

- [ ] **Verify Secret Storage**
  - Check that no secrets are in code:
    ```bash
    grep -r "6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96" .
    ```
  - Expected: No matches (secret key should NOT be in code)
  
  - Check site key is public:
    ```bash
    grep -r "6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr" .
    ```
  - Expected: Matches in booking-system.js and index.html (OK for site key)

- [ ] **Verify Service Account Keys**
  - Ensure `/tmp/calendar-key.json` is deleted or securely stored
  - Verify no `.json` key files in repository
  - Check `.gitignore` includes `*.json` for credentials

- [ ] **Test CORS Configuration**
  - Try accessing functions from unauthorized domain
  - Expected: CORS error
  - Try from fixnero.fi
  - Expected: Success

## Rollback Plan

### If Issues Occur

- [ ] **Quick Rollback - Revert Functions**
  ```bash
  # Rollback to previous deployment
  firebase functions:delete FUNCTION_NAME --project=Webbi1
  # Then redeploy old version from backup
  ```

- [ ] **Partial Rollback - Disable Features**
  - Disable calendar sync by removing GOOGLE_CALENDAR_ID secret
  - Keep email notifications working
  - Keep booking creation working

- [ ] **Emergency Contact**
  - Have old credentials ready as backup
  - Document which services are critical
  - Have plan to notify users of downtime

## Cleanup

### 12. Post-Migration Cleanup

- [ ] **Document Credentials**
  - Store all passwords in company password manager
  - Document service account emails
  - Document API keys and their purposes

- [ ] **Remove Old References**
  - Archive old Webbi1 documentation
  - Remove old service account keys
  - Clean up temporary files

- [ ] **Update Documentation**
  - Update README with new configuration
  - Update deployment guides
  - Document new monitoring URLs

- [ ] **Secure Credentials Storage**
  - Delete `/tmp/calendar-key.json` if still exists
  - Verify backup of all credentials in secure location
  - Set calendar to alert if service account access removed

## Sign-off

- [ ] **Migration Completed By**: _______________________ Date: _______
- [ ] **Verified By**: _______________________ Date: _______
- [ ] **All Tests Passed**: ☐ Yes ☐ No (if no, document issues below)

### Issues Found:
```
[Document any issues encountered during migration]
```

### Resolution:
```
[Document how issues were resolved]
```

---

**Important Notes:**

1. Keep this checklist as a record of the migration
2. Store securely with other project documentation
3. Update if any steps need modification based on experience
4. Include in handover documentation for future administrators

**Support Resources:**
- Firebase Documentation: https://firebase.google.com/docs
- reCAPTCHA Documentation: https://developers.google.com/recaptcha/docs/v3
- Google Calendar API: https://developers.google.com/calendar
- Migration Guide: docs/NEW_COMPANY_MIGRATION_GUIDE.md
