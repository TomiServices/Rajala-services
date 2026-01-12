# External Service Integrations - Key Summary

**Last Updated:** January 2025  
**Purpose:** Track all external service integrations, API keys, and configurations used in the Rajala Services booking system.

---

## 📋 Table of Contents

1. [Google Analytics](#google-analytics)
2. [Google reCAPTCHA v3](#google-recaptcha-v3)
3. [Firebase Services](#firebase-services)
4. [Google Calendar API](#google-calendar-api)
5. [Google Cloud Secret Manager](#google-cloud-secret-manager)
6. [Email Services](#email-services)
7. [Security Recommendations](#security-recommendations)
8. [Key Locations Reference](#key-locations-reference)

---

## 🎯 Google Analytics

### Overview
Google Analytics 4 (GA4) is used for tracking website activity and user behavior.

### Configuration Details

| Property | Value | Status |
|----------|-------|--------|
| **Measurement ID** | `G-SP5R1MN1H9` | ✅ Active |
| **Setup Date** | November 2025 | - |
| **Implementation** | Cookie consent-based | ✅ GDPR Compliant |
| **Privacy Features** | IP anonymization enabled | ✅ Enabled |

### Implementation Locations

1. **`cookie-consent.js`** (Lines 52-73)
   - Initializes GA4 after user consent
   - Implements GDPR-compliant cookie handling
   - Script URL: `https://www.googletagmanager.com/gtag/js?id=G-SP5R1MN1H9`

2. **`ga-config.js`** (Lines 1-14)
   - Standalone configuration file (optional/reference)
   - Documents measurement ID

### Features
- ✅ Deferred loading (only after cookie consent)
- ✅ IP anonymization (`anonymize_ip: true`)
- ✅ Secure cookies (`SameSite=Lax;Secure`)
- ✅ GDPR compliant implementation

### Recommendations
- ✔️ Current implementation is secure and privacy-compliant
- ✔️ No changes needed
- 📝 Consider adding custom events for booking funnel tracking
- 📝 Regular review of tracking data to ensure compliance

---

## 🔐 Google reCAPTCHA v3

### Overview
Google reCAPTCHA v3 provides invisible bot protection for the booking system.

### Configuration Details

| Property | Value | Status |
|----------|-------|--------|
| **Version** | v3 (score-based) | ✅ Active |
| **Site Key (Public)** | `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM` | ✅ Active |
| **Secret Key** | Stored in Secret Manager | 🔒 Secure |
| **Score Threshold** | 0.5 (configurable) | ✅ Active |

### Implementation Locations

#### Frontend
1. **`index.html`** (Line 240-242)
   - Lazy loading implementation via IntersectionObserver
   - Loads only when booking form is visible
   - Script URL: `https://www.google.com/recaptcha/api.js?render=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

2. **`booking-system.js`** (Lines 1-68)
   - Site key constant: `RECAPTCHA_SITE_KEY`
   - `executeRecaptcha()` function for token generation
   - Action-based validation (action: 'booking')
   - Comprehensive error handling

3. **`booking-system.min.js`**
   - Minified version of booking-system.js
   - Contains same reCAPTCHA implementation

#### Backend
1. **`functions/index.js`** (Lines 356-476)
   - `verifyRecaptcha()` function
   - Server-side validation with Google's API
   - Score-based validation (threshold: 0.5)
   - Action verification
   - ⚠️ **NOTE:** Currently disabled (Lines 692-713) to allow deployment
   - TODO: Re-enable after deployment issues resolved

### Security Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend implementation | ✅ Active | Deferred loading, proper error handling |
| Backend validation | ⚠️ Disabled | Temporarily disabled for deployment |
| Secret storage | ✅ Secure | Using Secret Manager |
| HTTPS enforcement | ✅ Active | All connections encrypted |

### Critical Recommendations

⚠️ **HIGH PRIORITY:**
1. **Re-enable reCAPTCHA backend validation** in `functions/index.js`
   - Uncomment lines 701-711
   - Ensure `RECAPTCHA_SECRET` is set in Secret Manager
   - Current state leaves endpoint vulnerable to automated abuse

2. **Verify Secret Manager configuration**
   ```bash
   firebase functions:secrets:access RECAPTCHA_SECRET
   ```

3. **Consider implementing rate limiting** as additional protection

### Badge Display
- Hidden on desktop devices (`.grecaptcha-badge { visibility: hidden }`)
- Complies with reCAPTCHA terms (privacy policy link present)
- Mobile-friendly implementation

---

## 🔥 Firebase Services

### Overview
Firebase provides the backend infrastructure for the booking system.

### Project Configuration

| Property | Value | Status |
|----------|-------|--------|
| **Project ID** | `fxnr-web` | ✅ Active |
| **Region** | `us-central1` | ✅ Active |
| **Functions Generation** | Gen2 (Cloud Run) | ✅ Active |
| **Node Version** | 20 | ✅ Active |

### Services in Use

#### 1. Firebase Admin SDK
- **Purpose:** Backend authentication and Firestore access
- **Location:** `functions/index.js` (Line 5, 15-16)
- **Version:** `^13.6.0`
- **Initialization:** Application Default Credentials (ADC)

#### 2. Firestore Database
- **Purpose:** Store booking data
- **Collection:** `varaukset` (bookings)
- **Collection:** `calendarWatch` (Google Calendar watch registrations)
- **Location:** `functions/index.js` (Line 16, 72)
- **Security:** Firestore rules applied (not in repo)

#### 3. Cloud Functions (Gen2)
- **Hosting Region:** `us-central1`
- **Base URL:** `https://us-central1-fxnr-web.cloudfunctions.net`

**Available Functions:**

| Function Name | Type | Purpose | Trigger |
|---------------|------|---------|---------|
| `bookings` | HTTP GET | Fetch all bookings | HTTPS |
| `book` | HTTP POST | Create new booking | HTTPS |
| `calendarSync` | Firestore | Sync booking to Google Calendar | onDocumentCreated |
| `calendarUpdate` | Firestore | Update calendar event | onDocumentUpdated |
| `calendarDelete` | Firestore | Delete calendar event | onDocumentDeleted |
| `watchRegistrar` | HTTP POST | Register calendar push notifications | HTTPS |
| `calendarWebhook` | HTTP POST | Receive calendar change notifications | HTTPS |

#### 4. Firebase Hosting
- **Public Directory:** `.` (root)
- **Primary Domain:** `rajala-services.com`
- **Firebase Domains:**
  - `fxnr-web.web.app`
  - `fxnr-web.firebaseapp.com`
- **Configuration:** `firebase.json`

#### 5. Security Headers (CSP)
**Content Security Policy** configured in `firebase.json` (Lines 19-20):
- Allows Google services: Analytics, reCAPTCHA, Fonts, Maps
- Allows Firebase Functions for API calls
- Restricts inline scripts (with exceptions for compatibility)

### Dependencies

**Key Firebase & Google Packages** (`functions/package.json`):
```json
{
  "firebase-admin": "^13.6.0",
  "firebase-functions": "^6.6.0",
  "google-auth-library": "^10.5.0",
  "googleapis": "^166.0.0"
}
```

### Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `.firebaserc` | Project alias configuration | ✅ Active |
| `firebase.json` | Hosting & functions config | ✅ Active |
| `functions/package.json` | Dependencies | ✅ Active |

### Recommendations
- ✔️ Current Gen2 implementation is modern and scalable
- ✔️ Security headers properly configured
- 📝 Consider implementing Firestore backup strategy
- 📝 Review and document Firestore security rules

---

## 📅 Google Calendar API

### Overview
Google Calendar API integration enables automatic calendar event creation for bookings.

### Configuration Details

| Property | Value | Storage |
|----------|-------|---------|
| **API Version** | v3 | - |
| **Calendar ID** | Environment variable | `GOOGLE_CALENDAR_ID` |
| **Service Account** | JSON credentials | `GOOGLE_SERVICE_ACCOUNT` |
| **Scopes** | `https://www.googleapis.com/auth/calendar` | - |

### Implementation Locations

1. **`functions/index.js`** (Lines 12, 62-63)
   - Main integration logic
   - Calendar sync functions
   - Watch registration

2. **`functions/lib/auth-client.js`** (Lines 1-27)
   - Lightweight authentication helper
   - GoogleAuth with service account
   - ADC fallback support

3. **`functions/src/googleCalendarAuth.js`** (Lines 1-71)
   - Robust authentication module
   - JWT-based service account auth
   - Application Default Credentials fallback
   - Private key normalization

4. **`functions/calendarwebhook.js`** (Lines 1-8038)
   - Webhook handler for calendar push notifications
   - Processes calendar change events
   - Sync token management

### Features

#### Calendar Synchronization
- **Create Event:** When booking document is created in Firestore
- **Update Event:** When booking document is updated
- **Delete Event:** When booking document is deleted
- **Real-time Sync:** Via Google Calendar push notifications

#### Push Notifications
- **Watch Registration:** Automated channel registration
- **Webhook Endpoint:** `calendarWebhook` function
- **Sync Token:** Stored in Firestore for incremental sync
- **Channel Expiration:** Auto-renewal logic implemented

### Authentication Flow

```
1. Check GOOGLE_SERVICE_ACCOUNT_JSON env var
2. Parse and normalize credentials
3. Create JWT auth client
4. Fallback to ADC if service account fails
5. Return authenticated calendar client
```

### Environment Variables

Set via Firebase Functions parameters (Gen2):
```javascript
GOOGLE_SERVICE_ACCOUNT  // Service account JSON (as string)
GOOGLE_CALENDAR_ID      // Target calendar ID
```

### Related Documentation
- `docs/GOOGLE_CALENDAR_README.md`
- `docs/GOOGLE_CALENDAR_INTEGRATION_SUMMARY.md`
- `docs/GOOGLE_CALENDAR_SETUP.md`
- `docs/CALENDAR_SYNC_DEPLOYMENT.md`
- `functions/README.md`
- `functions/DEPLOYMENT.md`

### Recommendations
- ✔️ Robust implementation with fallback mechanisms
- ✔️ Proper error handling and logging
- 📝 Monitor watch channel expiration and renewal
- 📝 Consider implementing retry logic for API failures
- 📝 Add monitoring/alerting for sync failures

---

## 🔒 Google Cloud Secret Manager

### Overview
Secret Manager securely stores sensitive configuration values.

### Purpose
Prevents deployment conflicts when sensitive values are defined both as environment variables and secrets in Gen2 Cloud Functions.

### Secrets Stored

| Secret Name | Purpose | Status | Notes |
|-------------|---------|--------|-------|
| `RECAPTCHA_SECRET` | reCAPTCHA v3 secret key | 🔒 Required | **MUST** be in Secret Manager only |
| `EMAIL_PASSWORD` | Gmail app password | 📝 Recommended | Can be env var or secret |

### Configuration Commands

```bash
# Set reCAPTCHA secret (REQUIRED)
firebase functions:secrets:set RECAPTCHA_SECRET

# Verify secret is set
firebase functions:secrets:access RECAPTCHA_SECRET

# List all secrets
firebase functions:secrets:get

# Update a secret
firebase functions:secrets:set RECAPTCHA_SECRET

# Delete a secret
firebase functions:secrets:destroy RECAPTCHA_SECRET
```

### Critical Rules

⚠️ **IMPORTANT:**
1. `RECAPTCHA_SECRET` **MUST** be set via Secret Manager
2. **DO NOT** set `RECAPTCHA_SECRET` in `.env` file
3. Setting the same variable in both places causes deployment failure

### Access in Code

```javascript
// Automatically available in Gen2 functions
const secretKey = process.env.RECAPTCHA_SECRET;
```

### Documentation
- `docs/SECRET_MANAGER.md` - Full configuration guide (Finnish)
- `functions/.env.example` - Template with instructions

### Security Best Practices
- ✅ Secrets never committed to git
- ✅ `.env` files in `.gitignore`
- ✅ `.env.example` provides template without actual values
- ✅ Secrets rotated periodically
- 📝 Consider rotating reCAPTCHA keys annually
- 📝 Monitor secret access logs

### Recommendations
- ✔️ Current implementation follows best practices
- 📝 Document secret rotation procedures
- 📝 Implement secret expiration monitoring
- 📝 Consider moving `EMAIL_PASSWORD` to Secret Manager

---

## 📧 Email Services

### Overview
Email functionality for booking confirmations using Nodemailer with Gmail.

### Configuration Details

| Property | Value | Storage |
|----------|-------|---------|
| **Provider** | Gmail SMTP | - |
| **Library** | Nodemailer v7.0.10 | `functions/package.json` |
| **From Address** | Environment variable | `EMAIL_FROM` |
| **Authentication** | Gmail App Password | `EMAIL_PASSWORD` |

### Environment Variables

```bash
EMAIL_USER=your-email@gmail.com          # Gmail account
EMAIL_PASSWORD=app-password-here          # Gmail App Password (not regular password)
EMAIL_FROM=Rajala Services <noreply@rajala-services.com>
```

### Implementation Location

**`functions/index.js`** (Lines 64-66, 90-100)
- Nodemailer transporter configuration
- Email sending logic in booking functions
- HTML email templates with company branding

### Company Branding Constants

```javascript
const COMPANY_NAME = 'Fixnero';
const COMPANY_EMAIL = 'info@fixnero.fi';
const COMPANY_PHONE = '+358401935001';
const COMPANY_PHONE_DISPLAY = '0401935001'; // Formatted for Finland
```

### Email Features
- ✅ HTML email templates
- ✅ Booking confirmation emails
- ✅ Company branding (Fixnero)
- ✅ Contact information included
- ✅ Sanitized user input (HTML escaping)

### Security Considerations

| Aspect | Status | Notes |
|--------|--------|-------|
| Password storage | ⚠️ Environment variable | Consider moving to Secret Manager |
| HTML injection prevention | ✅ Implemented | `escapeHtml()` function (Line 49-57) |
| TLS/SSL | ✅ Gmail default | Encrypted transport |
| App Password | ✅ Recommended | Better than regular password |

### Gmail App Password Setup

1. Enable 2-Step Verification on Gmail account
2. Go to: Google Account > Security > 2-Step Verification > App passwords
3. Generate app password for "Mail"
4. Use generated password in `EMAIL_PASSWORD`

### Recommendations
- ⚠️ **Move `EMAIL_PASSWORD` to Secret Manager** for better security
- ✔️ HTML escaping properly implemented
- 📝 Consider using Firebase Email Extension as alternative
- 📝 Implement email delivery monitoring
- 📝 Add retry logic for failed email sends
- 📝 Consider SPF/DKIM configuration for domain

---

## 🛡️ Security Recommendations

### High Priority (Action Required)

#### 1. Re-enable reCAPTCHA Backend Validation ⚠️
**Status:** Disabled  
**Risk Level:** HIGH  
**Location:** `functions/index.js` Lines 692-713

**Action Required:**
```javascript
// Uncomment these lines in functions/index.js:
const recaptchaToken = req.body.recaptcha || req.body.recaptchaToken || req.body['g-recaptcha-response'];
const recaptchaResult = await verifyRecaptcha(recaptchaToken, { expectedAction: 'booking' });
if (!recaptchaResult.success) {
  const statusCode = recaptchaResult.error === 'missing recaptcha token' ? 400 : 401;
  return res.status(statusCode).json({
    error: recaptchaResult.error,
    message: recaptchaResult.error === 'missing recaptcha token' 
      ? 'reCAPTCHA token puuttuu.' 
      : 'Turvavarmennus epäonnistui.',
    details: recaptchaResult.details
  });
}
```

**Verification:**
```bash
# Ensure secret is set
firebase functions:secrets:access RECAPTCHA_SECRET

# Deploy functions
firebase deploy --only functions
```

#### 2. Move Email Password to Secret Manager 📝
**Status:** Environment variable  
**Risk Level:** MEDIUM  
**Current:** `.env` file  
**Recommended:** Secret Manager

**Action:**
```bash
firebase functions:secrets:set EMAIL_PASSWORD
```

### Medium Priority (Recommended)

#### 3. Implement Rate Limiting
**Purpose:** Additional protection against abuse  
**Suggestion:** Add rate limiting middleware to Cloud Functions
```javascript
// Consider using express-rate-limit or Firebase App Check
```

#### 4. Rotate reCAPTCHA Keys
**Frequency:** Annually  
**Last Rotation:** Unknown  
**Action:** Schedule key rotation in Google reCAPTCHA admin

#### 5. Monitor API Usage
**Services to Monitor:**
- Google Analytics API calls
- reCAPTCHA verification requests
- Google Calendar API quota
- Cloud Functions invocations

### Low Priority (Enhancement)

#### 6. Implement Firebase App Check
**Purpose:** Additional app attestation layer  
**Benefit:** Prevents API abuse from non-web clients

#### 7. Add Security Headers
**Current:** Good CSP implementation  
**Enhancement:** Consider adding:
- `X-Permitted-Cross-Domain-Policies`
- `Cross-Origin-Embedder-Policy`
- `Cross-Origin-Opener-Policy`

#### 8. Implement Logging & Monitoring
**Purpose:** Detect security incidents  
**Tools:** Cloud Logging, Cloud Monitoring, alerting

---

## 📍 Key Locations Reference

### Configuration Files

| File | Purpose | Keys/IDs Present |
|------|---------|------------------|
| `index.html` | Main website, reCAPTCHA loader | reCAPTCHA site key |
| `booking-system.js` | Booking logic, reCAPTCHA execution | reCAPTCHA site key, Functions URLs |
| `cookie-consent.js` | GDPR consent, GA initialization | GA4 measurement ID |
| `ga-config.js` | GA configuration reference | GA4 measurement ID |
| `firebase.json` | Hosting & functions config | CSP headers, project settings |
| `.firebaserc` | Firebase project alias | Project ID: `fxnr-web` |
| `functions/index.js` | Cloud Functions main | All backend integrations |
| `functions/package.json` | Dependencies | Package versions |
| `functions/.env.example` | Environment template | Variable names (no values) |

### External Script URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Google Analytics | `https://www.googletagmanager.com/gtag/js?id=G-SP5R1MN1H9` | Analytics tracking |
| reCAPTCHA | `https://www.google.com/recaptcha/api.js?render=6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM` | Bot protection |
| Google Fonts | `https://fonts.googleapis.com/css2?family=...` | Typography |

### API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/bookings` | GET | Fetch all bookings | None |
| `/book` | POST | Create booking | reCAPTCHA |
| `/watchRegistrar` | POST | Register calendar watch | Internal |
| `/calendarWebhook` | POST | Calendar push notifications | Google |

### Documentation Files

| File | Topic | Language |
|------|-------|----------|
| `docs/SECRET_MANAGER.md` | Secret Manager setup | Finnish |
| `docs/RECAPTCHA_V3_MIGRATION.md` | reCAPTCHA migration | Finnish/English |
| `docs/GOOGLE_CALENDAR_INTEGRATION_SUMMARY.md` | Calendar setup | English |
| `docs/ENVIRONMENT_VARIABLES.md` | Environment config | English |
| `functions/README.md` | Functions overview | English |
| `functions/DEPLOYMENT.md` | Deployment guide | English |

---

## 📊 Integration Health Status

| Integration | Status | Last Verified | Issues |
|-------------|--------|---------------|--------|
| Google Analytics | 🟢 Active | - | None |
| reCAPTCHA Frontend | 🟢 Active | - | None |
| reCAPTCHA Backend | 🔴 Disabled | - | Needs re-enabling |
| Firebase Hosting | 🟢 Active | - | None |
| Firebase Functions | 🟢 Active | - | None |
| Firestore | 🟢 Active | - | None |
| Google Calendar API | 🟢 Active | - | None |
| Secret Manager | 🟢 Active | - | None |
| Email (Nodemailer) | 🟢 Active | - | Consider Secret Manager migration |

**Legend:**
- 🟢 Active and working
- 🟡 Active with minor issues
- 🔴 Disabled or critical issue
- ⚪ Not implemented/configured

---

## 🔄 Change Log

### January 2026
- Initial documentation created
- All integrations catalogued
- Security recommendations documented

### Future Updates
- Document any API key rotations here
- Track configuration changes
- Note deprecated/removed integrations

---

## 📞 Support Resources

### Service Admin Consoles

- **Google Analytics:** https://analytics.google.com/
- **reCAPTCHA Admin:** https://www.google.com/recaptcha/admin
- **Firebase Console:** https://console.firebase.google.com/project/fxnr-web
- **Google Cloud Console:** https://console.cloud.google.com/
- **Google Calendar API:** https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

### Documentation

- **Firebase Functions:** https://firebase.google.com/docs/functions
- **Google Calendar API:** https://developers.google.com/calendar
- **reCAPTCHA v3:** https://developers.google.com/recaptcha/docs/v3
- **Google Analytics 4:** https://support.google.com/analytics

---

**Document Version:** 1.0  
**Maintained By:** Development Team  
**Review Frequency:** Quarterly or after major changes
