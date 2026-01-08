# Service Accounts and APIs Documentation

This document provides a comprehensive overview of all service accounts, email addresses, APIs, and plugins used in the Rajala Services (Fixnero) booking system via Google Cloud Console and Firebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Service Accounts](#service-accounts)
3. [Google Cloud APIs](#google-cloud-apis)
4. [Firebase Services](#firebase-services)
5. [Email Addresses](#email-addresses)
6. [Third-Party Integrations](#third-party-integrations)
7. [Creating New Service Accounts](#creating-new-service-accounts)

---

## Project Overview

### Firebase Project
- **Project ID**: `fxnr-web`
- **Project Name**: Fixnero Web
- **Region**: `us-central1` (primary for Cloud Functions)
- **Purpose**: Booking and reservation system for automotive services

### Primary Services
- **Frontend**: Firebase Hosting (static website)
- **Backend**: Firebase Functions (Gen2, Node.js 20)
- **Database**: Cloud Firestore
- **Calendar Integration**: Google Calendar API
- **Email**: Gmail SMTP / Firebase Email Extension

---

## Service Accounts

Service accounts are special Google accounts that applications use to access Google Cloud services programmatically.

### 1. Google Calendar Sync Service Account

**Purpose**: Enables bidirectional synchronization between the booking system and Google Calendar.

#### Account Details
- **Suggested Name**: `fixnero-calendar-sync` or `rajala-calendar-sync`
- **Email Format**: `[account-name]@[project-id].iam.gserviceaccount.com`
- **Example**: `fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com`
- **Role**: Editor (with Calendar API access)
- **Scopes**: `https://www.googleapis.com/auth/calendar`

#### Created By
- **Component**: Manual creation via Google Cloud Console
- **API/Plugin**: Google Calendar API
- **Purpose**: 
  - Create calendar events when bookings are made
  - Update events when bookings change
  - Delete events when bookings are cancelled
  - Sync changes from Google Calendar back to Firestore

#### How It's Used
```javascript
// In functions/index.js
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJSON,
  scopes: ['https://www.googleapis.com/auth/calendar']
});
const calendar = google.calendar({ version: 'v3', auth });
```

#### Configuration Location
- **Environment Variable**: `GOOGLE_SERVICE_ACCOUNT` (in functions/.env)
- **Legacy Config**: `google.service_account` (in .runtimeconfig.json)
- **Production**: Firebase Functions config or Secret Manager

#### Setup Instructions
See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed setup steps.

### 2. Firebase Admin SDK Default Service Account

**Purpose**: Default service account used by Firebase Admin SDK for backend operations.

#### Account Details
- **Email Format**: `firebase-adminsdk-[random]@[project-id].iam.gserviceaccount.com`
- **Example**: `firebase-adminsdk-xxxxx@fxnr-web.iam.gserviceaccount.com`
- **Role**: Firebase Admin
- **Automatically Created**: Yes (when Firebase is initialized)

#### Created By
- **Component**: Firebase initialization
- **Plugin**: Firebase Admin SDK (`firebase-admin` npm package)
- **Purpose**:
  - Access Firestore database
  - Manage authentication
  - Send Firebase Cloud Messaging notifications
  - Access other Firebase services

#### How It's Used
```javascript
// In functions/index.js
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
```

#### Configuration
- Automatically configured in Firebase Functions environment
- No manual setup required
- Uses Application Default Credentials (ADC)

### 3. Firebase Functions Service Account (Gen2)

**Purpose**: Execution identity for Cloud Run services (Firebase Functions Gen2).

#### Account Details
- **Email Format**: `[project-number]-compute@developer.gserviceaccount.com`
- **Role**: Cloud Run Service Agent
- **Automatically Created**: Yes (when deploying Gen2 functions)

#### Created By
- **Component**: Firebase Functions Gen2 deployment
- **Platform**: Cloud Run (underlying platform for Gen2 functions)
- **Purpose**:
  - Execute Cloud Functions
  - Access Secret Manager secrets
  - Invoke other Cloud services

---

## Google Cloud APIs

APIs enabled and used in this project.

### 1. Google Calendar API

**Status**: ✅ Must be enabled manually

#### Details
- **API Name**: `calendar-json.googleapis.com`
- **Version**: v3
- **Enable At**: [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library)
- **Cost**: Free tier (1M queries/day)

#### Used By
- `functions/index.js` - Calendar event CRUD operations
- Service Account: Google Calendar Sync

#### Functions Using This API
- `createGoogleCalendarEvent()` - Create events
- `onBookingUpdated` - Update events
- `onBookingDeleted` - Delete events
- `calendarWebhook` - Receive change notifications

#### NPM Package
```json
{
  "googleapis": "^166.0.0"
}
```

### 2. Cloud Firestore API

**Status**: ✅ Automatically enabled with Firebase

#### Details
- **API Name**: `firestore.googleapis.com`
- **Database**: `(default)` database in Firestore Native mode
- **Location**: `us-central` (multi-region)
- **Cost**: Free tier (50K reads/day, 20K writes/day)

#### Collections
- `varaukset` (bookings) - Main booking data
- `mail` - Email queue for Firebase Email Extension
- `calendarWatch` - Google Calendar webhook registration data

#### NPM Package
```json
{
  "firebase-admin": "^13.6.0"
}
```

### 3. Cloud Functions API

**Status**: ✅ Automatically enabled with Firebase Functions

#### Details
- **API Name**: `cloudfunctions.googleapis.com`
- **Generation**: Gen2 (Cloud Run based)
- **Runtime**: Node.js 20

#### Deployed Functions
- `bookings` (HTTP GET) - Fetch all bookings
- `book` (HTTP POST) - Create new booking
- `onBookingCreated` (Firestore trigger) - Send confirmation email
- `onBookingUpdated` (Firestore trigger) - Sync to Google Calendar
- `onBookingDeleted` (Firestore trigger) - Remove from Google Calendar
- `calendarWebhook` (HTTP POST) - Receive Google Calendar notifications
- `watchRegistrar` (HTTP POST) - Register calendar webhook
- `renewCalendarWatch` (HTTP POST) - Renew webhook subscription

### 4. Secret Manager API

**Status**: ✅ Required for sensitive data

#### Details
- **API Name**: `secretmanager.googleapis.com`
- **Purpose**: Store sensitive configuration (API keys, passwords)
- **Cost**: Free tier (6 secret versions)

#### Secrets Stored
- `RECAPTCHA_SECRET` - reCAPTCHA v3 secret key (required)
- `EMAIL_PASSWORD` - Gmail App Password (optional, recommended)
- `GOOGLE_SERVICE_ACCOUNT` - Service account JSON (optional)

#### Set Via Firebase CLI
```bash
firebase functions:secrets:set RECAPTCHA_SECRET
firebase functions:secrets:set EMAIL_PASSWORD
```

See [SECRET_MANAGER.md](./SECRET_MANAGER.md) for detailed instructions.

### 5. Firebase Hosting API

**Status**: ✅ Automatically enabled with Firebase Hosting

#### Details
- **API Name**: `firebasehosting.googleapis.com`
- **Domain**: `rajala-services.com`, `www.rajala-services.com`
- **CDN**: Firebase CDN (global)
- **SSL**: Automatic (Let's Encrypt)

---

## Firebase Services

Firebase products and extensions in use.

### 1. Firebase Hosting

**Purpose**: Host the static website and booking system frontend.

#### Configuration
- **File**: `firebase.json`
- **Public Directory**: `.` (root)
- **Clean URLs**: Enabled
- **Rewrites**: HTML extension removal
- **Headers**: Security headers (CSP, HSTS, etc.)

### 2. Firebase Functions (Gen2)

**Purpose**: Backend API for booking operations and integrations.

#### Configuration
- **File**: `firebase.json` → `functions.source: "functions"`
- **Runtime**: Node.js 20
- **Region**: us-central1
- **CORS**: Allowed origins configured

#### Package Dependencies
```json
{
  "axios": "^1.13.2",
  "cors": "^2.8.5",
  "firebase-admin": "^13.6.0",
  "firebase-functions": "^6.6.0",
  "google-auth-library": "^10.5.0",
  "googleapis": "^166.0.0",
  "nodemailer": "^7.0.10"
}
```

### 3. Firebase Firestore

**Purpose**: Database for bookings and system data.

#### Collections Schema
- **varaukset** (bookings)
  - `nimi` (name)
  - `sahkoposti` (email)
  - `puhelin` (phone)
  - `aika` (timestamp)
  - `services` (array)
  - `totalPrice` (string)
  - `googleEventId` (string, optional)
  - `syncedFromGoogle` (boolean)
  - `emailSent` (boolean)

- **mail** (email queue - used by Firebase Email Extension)
  - `to` (email address)
  - `message` (object with subject and html)
  - `bookingId` (reference)

- **calendarWatch** (webhook registration)
  - `channelId` (string)
  - `resourceId` (string)
  - `expiration` (timestamp)

### 4. Firebase Email Extension (Optional)

**Extension Name**: Trigger Email from Firestore

**Status**: ⚠️ Optional (fallback to Nodemailer if not installed)

#### Installation
```bash
firebase ext:install firebaseextensions/firestore-send-email
```

#### How It Works
1. Function creates document in `mail` collection
2. Extension detects new document
3. Extension sends email via configured SMTP
4. Extension updates document with delivery status

#### Configuration
- **Collection**: `mail`
- **SMTP Settings**: Configured during extension installation
- **Email Templates**: Defined in function code (HTML)

#### Alternative: Nodemailer
If extension is not installed, the system falls back to direct Nodemailer integration:
```javascript
// Dual-path email sending
// 1. Try Firebase Email Extension (write to 'mail' collection)
// 2. Fallback to Nodemailer if extension not available
```

---

## Email Addresses

Email addresses used by the system.

### 1. Booking Confirmation Sender

**Purpose**: Send booking confirmation emails to customers.

#### Configuration Options

**Option A: Gmail Account with App Password**
- **Type**: Gmail SMTP
- **Email**: User-configured (e.g., `noreply@fixnero.fi`)
- **Authentication**: Gmail App Password (not regular password)
- **Environment Variable**: `EMAIL_USER`, `EMAIL_PASSWORD`
- **Limit**: 500 emails/day (free Gmail), 2000/day (Google Workspace)

**Option B: Firebase Email Extension**
- **Type**: SMTP via Firebase Extension
- **Configuration**: During extension installation
- **Advantages**: Better deliverability, monitoring, retries

#### Setup Instructions
See [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)

### 2. Service Account Emails

These are technical accounts, not real email addresses:

- **Calendar Sync**: `fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com`
  - Purpose: Google Calendar API access
  - Setup: Manually created in Google Cloud Console

- **Firebase Admin**: `firebase-adminsdk-xxxxx@fxnr-web.iam.gserviceaccount.com`
  - Purpose: Firebase Admin SDK operations
  - Setup: Automatically created by Firebase

### 3. Company Contact Emails

**Purpose**: Displayed to customers for support.

#### Constants in Code
```javascript
// In functions/index.js
const COMPANY_EMAIL = 'info@fixnero.fi';
const COMPANY_PHONE = '+358401935001';
```

These are not service accounts but contact information shown in emails and website.

---

## Third-Party Integrations

External services integrated with the system.

### 1. Google reCAPTCHA v3

**Purpose**: Bot protection for booking form submissions.

#### Details
- **Version**: v3 (score-based)
- **Site Key**: Public (in frontend code)
- **Secret Key**: Stored in Secret Manager (`RECAPTCHA_SECRET`)
- **Admin Console**: https://www.google.com/recaptcha/admin

#### Created By
- **Plugin/API**: Google reCAPTCHA API
- **Configuration**: Manual setup in reCAPTCHA Admin Console
- **Verification**: `verifyRecaptcha()` function in `index.js`

#### How It's Used
```javascript
// Client-side (booking-system.js)
grecaptcha.execute('SITE_KEY', { action: 'booking' })

// Server-side (functions/index.js)
const recaptchaResult = await verifyRecaptcha(token, { 
  expectedAction: 'booking' 
});
```

#### Environment Variables
- `RECAPTCHA_SECRET` - Secret key (in Secret Manager)
- `RECAPTCHA_SCORE_THRESHOLD` - Minimum score (default: 0.5)

### 2. Gmail SMTP

**Purpose**: Send transactional emails (booking confirmations).

#### Details
- **Service**: Gmail SMTP (smtp.gmail.com)
- **Port**: 465 (SSL) or 587 (TLS)
- **Authentication**: App Password
- **NPM Package**: `nodemailer` v7.0.10

#### Created By
- **Manual Setup**: Google Account > Security > App Passwords
- **Configuration**: `EMAIL_USER`, `EMAIL_PASSWORD` environment variables

#### Usage
```javascript
// In functions/index.js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUserVal,
    pass: emailPasswordVal
  }
});
```

### 3. Google Analytics (GA4)

**Purpose**: Website traffic and conversion tracking.

#### Details
- **Version**: Google Analytics 4 (GA4)
- **Configuration**: `ga-config.js`
- **Tracking**: Page views, events, conversions

**Note**: This uses a client-side integration, not a service account.

---

## Creating New Service Accounts

Instructions for creating additional service accounts for new features or reservation systems.

### When to Create a New Service Account

Create a new service account when:
- ✅ Adding a new Google Cloud API integration
- ✅ Separating concerns (different services, different accounts)
- ✅ Setting up a separate environment (staging, production)
- ✅ Implementing a new reservation or booking system
- ❌ Don't create for frontend-only features
- ❌ Don't create if existing account has needed permissions

### Step-by-Step Guide

#### 1. Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `fxnr-web` (or create new project)
3. Navigate to: **IAM & Admin > Service Accounts**

#### 2. Create Service Account

1. Click **+ CREATE SERVICE ACCOUNT**
2. Fill in details:
   - **Name**: Descriptive name (e.g., `email-reservation-system`)
   - **Description**: Purpose (e.g., "Service account for new email-based reservation system")
   - **Service account ID**: Auto-generated from name
3. Click **CREATE AND CONTINUE**

#### 3. Grant Permissions

1. Select appropriate role(s):
   - **Editor**: Full read/write access (use cautiously)
   - **Specific roles**: e.g., "Calendar Editor", "Firestore User"
   - **Custom role**: Create if needed for fine-grained control
2. Click **CONTINUE**
3. Click **DONE**

#### 4. Create Key (Credentials)

1. Click on the newly created service account
2. Go to **KEYS** tab
3. Click **ADD KEY > Create new key**
4. Select **JSON** format
5. Click **CREATE**
6. **Save the downloaded JSON file securely**

⚠️ **Security Warning**: This JSON file contains private keys. Never commit to version control!

#### 5. Configure in Firebase Functions

**For Development (Local)**:
```bash
cd functions
cp .env.example .env
# Edit .env and add:
# NEW_SERVICE_ACCOUNT={"type":"service_account",...}
```

**For Production (Recommended - Secret Manager)**:
```bash
firebase functions:secrets:set NEW_SERVICE_ACCOUNT
# Paste the JSON content when prompted
```

**For Production (Alternative - Environment Variables)**:
```bash
# Create .env file for specific project
echo 'NEW_SERVICE_ACCOUNT={"type":"service_account",...}' > functions/.env.fxnr-web
```

#### 6. Use in Code

```javascript
// In your Cloud Function
const { google } = require('googleapis');

// Parse service account JSON
const serviceAccountJSON = JSON.parse(
  process.env.NEW_SERVICE_ACCOUNT
);

// Create auth client
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJSON,
  scopes: ['https://www.googleapis.com/auth/calendar']
});

// Use with Google API
const service = google.calendar({ version: 'v3', auth });
```

#### 7. Grant Access to Resources

If accessing Google Calendar, Gmail, or other user resources:

1. Go to the resource (e.g., Google Calendar)
2. Share with the service account email
3. Set appropriate permissions (e.g., "Make changes to events")

**Example for Google Calendar**:
- Share calendar with: `email-reservation-system@fxnr-web.iam.gserviceaccount.com`
- Permission: "Make changes to events"

### Example: Creating Email Reservation System Account

**Scenario**: You want to create a new reservation system that sends emails and manages a separate calendar.

**Steps**:

1. **Create Service Account**:
   - Name: `email-reservation-system`
   - Email: `email-reservation-system@fxnr-web.iam.gserviceaccount.com`

2. **Enable APIs**:
   - Google Calendar API
   - Gmail API (if sending via API instead of SMTP)

3. **Grant Permissions**:
   - Calendar: Share new calendar with service account
   - Gmail: Set up domain-wide delegation (if using Gmail API)

4. **Configure Environment**:
   ```bash
   firebase functions:secrets:set EMAIL_RESERVATION_SERVICE_ACCOUNT
   firebase functions:secrets:set EMAIL_RESERVATION_CALENDAR_ID
   ```

5. **Implement Function**:
   ```javascript
   exports.emailReservation = onRequest(async (req, res) => {
     // Use EMAIL_RESERVATION_SERVICE_ACCOUNT
     // Access EMAIL_RESERVATION_CALENDAR_ID
     // Create booking, send email, add to calendar
   });
   ```

### Best Practices for Service Accounts

#### Security
- ✅ Use Secret Manager for production credentials
- ✅ Rotate keys every 90 days
- ✅ Use least-privilege principle (minimum required permissions)
- ✅ Monitor service account usage in Cloud Console
- ❌ Never commit service account keys to Git
- ❌ Don't share keys via email or chat

#### Organization
- ✅ Use descriptive names
- ✅ Document purpose in description field
- ✅ Track which apps/functions use which accounts
- ✅ Clean up unused accounts regularly

#### Access Control
- ✅ Grant access only to specific resources needed
- ✅ Review permissions quarterly
- ✅ Use separate accounts for dev/staging/production
- ✅ Enable audit logging for sensitive operations

---

## Summary Table

| Component | Type | Purpose | Creation Method |
|-----------|------|---------|----------------|
| `fixnero-calendar-sync@...` | Service Account | Google Calendar sync | Manual (Cloud Console) |
| `firebase-adminsdk-...@...` | Service Account | Firebase Admin SDK | Automatic (Firebase) |
| Gmail SMTP Account | Email Account | Send booking confirmations | Manual (Gmail) |
| `info@fixnero.fi` | Email Address | Customer support contact | Manual (domain email) |
| Google Calendar API | API | Calendar integration | Manual (enable in Console) |
| Cloud Firestore API | API | Database | Automatic (Firebase) |
| Cloud Functions API | API | Backend functions | Automatic (Firebase) |
| Secret Manager API | API | Secure config storage | Manual (enable in Console) |
| reCAPTCHA v3 | Service | Bot protection | Manual (reCAPTCHA Admin) |
| Firebase Email Extension | Extension | Email delivery | Optional (Firebase Extension) |

---

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Firebase Functions Gen2 Documentation](https://firebase.google.com/docs/functions)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

---

## Maintenance

This document should be updated when:
- New service accounts are created
- New APIs are enabled
- New Firebase extensions are installed
- Email configuration changes
- New integrations are added

**Last Updated**: 2026-01-08  
**Document Version**: 1.0.0  
**Maintained By**: Development Team
