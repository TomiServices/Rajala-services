# External Services Audit and Inventory
## Fixnero (Fixnero) - Complete Integration Analysis

**Document Version:** 1.0  
**Audit Date:** January 13, 2026  
**Last Updated:** January 13, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Service Inventory](#service-inventory)
3. [Current Configuration Analysis](#current-configuration-analysis)
4. [Security Assessment](#security-assessment)
5. [Dependencies and Integration Points](#dependencies-and-integration-points)
6. [Recommendations](#recommendations)

---

## Executive Summary

This document provides a comprehensive audit of all external services and integrations used by the Fixnero (Fixnero) website. The platform is a modern web application for an auto service company in Espoo, Finland, offering online booking, service management, and customer communication.

### Key Findings

- **Total External Services:** 7 major integrations
- **Critical Dependencies:** 5 services
- **Current Owner:** Personal accounts (migration needed)
- **Security Status:** Good (environment variables in use, secrets protected)
- **Migration Complexity:** Medium (well-documented codebase)

### Services Overview

| Service | Purpose | Critical | Current Status |
|---------|---------|----------|----------------|
| Firebase Hosting | Website hosting | ✅ Yes | Active |
| Firestore | Database for bookings | ✅ Yes | Active |
| Firebase Functions | Backend API | ✅ Yes | Active |
| Google Calendar API | Booking synchronization | ✅ Yes | Active |
| Google Analytics 4 | Website analytics | ⚠️ Optional | Active |
| Google reCAPTCHA v3 | Anti-spam protection | ✅ Yes | Active |
| Gmail/Nodemailer | Email notifications | ✅ Yes | Active |
| Google Maps | Location display | ⚠️ Optional | Active |
| Google Fonts | Typography | ⚠️ Optional | Active |

---

## Service Inventory

### 1. Firebase Platform

**Service Type:** Cloud Platform (Hosting, Database, Functions)  
**Provider:** Google Cloud Platform  
**Criticality:** ✅ Critical  
**Current Project ID:** `Webbi1`

#### Components

##### 1.1 Firebase Hosting
- **Purpose:** Static website hosting with CDN
- **Configuration File:** `firebase.json`
- **Domain:** fixnero.fi (primary), fixnero.fi (secondary)
- **Features Used:**
  - Clean URLs
  - Custom headers (security, caching)
  - 301 redirects
  - HTTPS enforcement
  - CDN distribution

##### 1.2 Cloud Firestore
- **Purpose:** NoSQL database for booking data
- **Collection:** `varaukset` (bookings)
- **Data Stored:**
  - Customer information (name, email, phone)
  - Booking details (date, time, services)
  - Pricing information
  - Google Calendar event IDs
  - Timestamps

##### 1.3 Firebase Cloud Functions (Gen2)
- **Purpose:** Backend API and automation
- **Runtime:** Node.js 20
- **Region:** us-central1
- **Functions Deployed:**
  - `bookings` (GET) - Fetch all bookings
  - `book` (POST) - Create new booking
  - `calendarWebhook` (POST) - Google Calendar notifications
  - `onBookingCreated` - Firestore trigger for email notifications
  - `onBookingUpdated` - Firestore trigger for calendar sync
  - `onBookingDeleted` - Firestore trigger for calendar cleanup

#### Configuration Files
- `.firebaserc` - Project configuration
- `firebase.json` - Hosting and security configuration
- `functions/package.json` - Dependencies

#### Access Requirements
- Firebase Console access
- Firebase CLI with project permissions
- Service account for deployments

---

### 2. Google Calendar API

**Service Type:** Calendar Integration  
**Provider:** Google Workspace/Google Cloud  
**Criticality:** ✅ Critical  
**API Version:** v3

#### Purpose
Synchronizes customer bookings with a shared Google Calendar for the business to manage appointments.

#### Features Used
- Create calendar events for new bookings
- Update events when bookings change
- Delete events when bookings are cancelled
- Push notifications via webhook for calendar changes
- Time zone handling (Europe/Helsinki)

#### Authentication Methods
- **Primary:** Service Account with JWT (JSON Web Token)
- **Fallback:** Application Default Credentials (ADC)

#### Configuration Required
- Google Calendar ID (calendar email address)
- Service Account JSON key (recommended via Secret Manager)
- Calendar webhook callback URL
- API scopes: `https://www.googleapis.com/auth/calendar`

#### Code Locations
- `functions/index.js` - Calendar event management
- `functions/calendarwebhook.js` - Webhook handler
- `functions/src/googleCalendarAuth.js` - Authentication helper
- `functions/lib/auth-client.js` - Auth client library

#### Current Environment Variables
```
GOOGLE_CALENDAR_ID=<calendar_id>@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT=<stringified_json>
WATCH_CALLBACK_URL=https://us-central1-Webbi1.cloudfunctions.net/calendarWebhook
```

---

### 3. Google Analytics 4 (GA4)

**Service Type:** Web Analytics  
**Provider:** Google Marketing Platform  
**Criticality:** ⚠️ Optional (but recommended)  
**Measurement ID:** `G-SP5R1MN1H9`

#### Purpose
Tracks website visitor behavior, page views, conversions, and user interactions for business intelligence.

#### Implementation
- **Library:** gtag.js (Google Tag Manager)
- **Consent Management:** GDPR-compliant with cookie consent banner
- **Configuration:** `ga-config.js`
- **Loading:** Deferred until user consent via `cookie-consent.js`

#### Features Used
- Page view tracking
- Event tracking (potential for booking events)
- Anonymized IP addresses
- Secure cookies (SameSite=Lax)

#### Data Collected
- Page views
- Session duration
- Traffic sources
- Device/browser information
- Geographic location (anonymized)

#### Setup Requirements
- Google Analytics account
- GA4 property setup
- Measurement ID configuration

#### Code Locations
- `ga-config.js` - Configuration file
- `cookie-consent.js` - GDPR consent and GA initialization
- `index.html` - Script loading (conditional)

---

### 4. Google reCAPTCHA v3

**Service Type:** Anti-Spam Protection  
**Provider:** Google Cloud  
**Criticality:** ✅ Critical  
**Version:** v3 (Invisible, Score-based)

#### Purpose
Protects the booking form from spam and bot submissions by analyzing user behavior and providing a risk score.

#### Configuration
- **Site Key (Public):** `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- **Secret Key:** Stored in Firebase Secret Manager (not in code)

#### Implementation
- **Frontend:** `booking-system.js` - Executes reCAPTCHA on form submission
- **Backend:** `functions/index.js` - Validates token server-side
- **Action Name:** `booking_submission`

#### Features Used
- Invisible reCAPTCHA (no user interaction required)
- Score-based verification (0.0 to 1.0)
- Server-side validation
- Action-based analysis

#### Security Configuration
- Secret stored via: `firebase functions:secrets:set RECAPTCHA_SECRET`
- Token validation required for all booking submissions
- Minimum score threshold enforced

#### Code Locations
- `booking-system.js` - Frontend execution
- `functions/index.js` - Backend validation
- `.env.example` - Configuration template

---

### 5. Email Service (Gmail + Nodemailer)

**Service Type:** Transactional Email  
**Provider:** Gmail with Nodemailer library  
**Criticality:** ✅ Critical  
**Version:** Nodemailer 7.0.10

#### Purpose
Sends automated booking confirmation emails to customers when they make a reservation.

#### Implementation
- **Method 1 (Preferred):** Firebase Mail Extension (queue-based)
- **Method 2 (Fallback):** Direct Nodemailer with Gmail SMTP

#### Email Features
- Booking confirmation emails
- HTML formatted messages
- Finnish language
- Business branding
- Booking details summary

#### Configuration Required
- Gmail account with App Password
- SMTP settings configured
- Sender name and email address

#### Environment Variables
```
EMAIL_USER=<gmail_address>
EMAIL_PASSWORD=<app_password>
EMAIL_FROM=Fixnero <Palvelut@fixnero.fi>
```

#### Code Locations
- `functions/index.js` - Email sending logic in `onBookingCreated` trigger
- `.env.example` - Configuration template

#### Setup Requirements
- Gmail account
- 2-Step Verification enabled
- App Password generated
- SMTP access enabled

---

### 6. Google Maps Platform

**Service Type:** Maps and Location Services  
**Provider:** Google Cloud  
**Criticality:** ⚠️ Optional (enhances user experience)

#### Purpose
Displays an interactive map showing the business location (Tiilenvalajantie 6, Espoo).

#### Implementation
- **Method:** Embedded iframe
- **Map Type:** Standard embedded map
- **Features:** Place marker, zoom controls, location name

#### Configuration
- No API key required (using embed URL)
- Static configuration in HTML
- Coordinates: 60.1699°N, 24.6384°E

#### Code Locations
- `index.html` - Map iframe embed
- Service pages (various HTML files)

#### Alternative Options
- Could migrate to Maps JavaScript API (requires API key)
- Could use static map image (no interaction)
- Current embed method is free and requires no authentication

---

### 7. Google Fonts

**Service Type:** Web Fonts CDN  
**Provider:** Google Fonts  
**Criticality:** ⚠️ Optional (could be self-hosted)

#### Purpose
Provides custom typography for better branding and readability.

#### Fonts Used
- Yanone Kaffeesatz (weight: 700) - Headers
- Bebas Neue - Display text
- Inter (weights: 400, 600, 700) - Body text

#### Implementation
- **Method:** CDN link with preconnect optimization
- **Loading:** Deferred with media query trick
- **Fallback:** System fonts defined in CSS

#### Performance Optimizations
- DNS prefetch for faster resolution
- Preconnect for early connection setup
- Font display swap for FOUT prevention
- Subset loading for reduced file size

#### Code Locations
- `index.html` and all page HTML files - Font link tags
- CSS - Font-family declarations with fallbacks

#### Alternative Options
- Self-host fonts for better privacy and control
- Use variable fonts for smaller file sizes
- Consider system font stack for maximum performance

---

## Current Configuration Analysis

### Environment Variable Management

#### Production Environment (Firebase Functions)
Environment variables are managed through two methods:

1. **Secret Manager (Recommended for Sensitive Data)**
   - `RECAPTCHA_SECRET` - reCAPTCHA secret key
   - Optionally: `EMAIL_PASSWORD`, `GOOGLE_SERVICE_ACCOUNT`

2. **Environment Variables (Non-Sensitive)**
   - Set via Firebase CLI or `.env` files locally
   - Examples: `GOOGLE_CALENDAR_ID`, `EMAIL_USER`, `EMAIL_FROM`

#### Local Development
- Configuration file: `functions/.env`
- Template provided: `functions/.env.example`
- Ignored by Git for security

### Security Implementation

#### Strengths ✅
1. **Secret Management:** Sensitive keys stored in Secret Manager
2. **Git Security:** `.env` files ignored, no secrets in repository
3. **HTTPS Enforcement:** All traffic encrypted
4. **Security Headers:** Comprehensive CSP, HSTS, XSS protection
5. **Input Validation:** Server-side validation for all user inputs
6. **CORS Protection:** Restricted origins for API calls
7. **reCAPTCHA:** Anti-spam protection on forms

#### Areas for Improvement ⚠️
1. **Service Account Keys:** Consider using workload identity federation
2. **Email Credentials:** Migrate from App Passwords to OAuth2
3. **API Key Rotation:** No documented rotation policy
4. **Access Logging:** Limited monitoring of API access
5. **Rate Limiting:** No explicit rate limiting on endpoints

### Dependency Management

#### Frontend Dependencies
- **Bundled:** None (vanilla JavaScript)
- **CDN Resources:**
  - Google Fonts
  - reCAPTCHA script
  - Google Analytics (gtag.js)
  - Google Maps embed

#### Backend Dependencies (functions/package.json)
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

**Security Status:** All dependencies up-to-date with no known vulnerabilities (as of last audit).

---

## Dependencies and Integration Points

### Critical Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User (Customer)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Website (Firebase Hosting)                      │
│  - Static HTML/CSS/JS                                        │
│  - Google Fonts, Google Maps                                 │
│  - Google Analytics (with consent)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (Booking Form Submission)
┌─────────────────────────────────────────────────────────────┐
│         Google reCAPTCHA v3 (Token Generation)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (Token + Form Data)
┌─────────────────────────────────────────────────────────────┐
│       Firebase Functions - book() endpoint                   │
│  1. Validate reCAPTCHA token                                 │
│  2. Validate form inputs                                     │
│  3. Create Firestore document                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────────┐
│   Firestore     │         │ Firestore Trigger:  │
│   (Database)    │         │ onBookingCreated    │
│                 │         └──────┬──────────────┘
│ Collection:     │                │
│ varaukset       │                ▼
│                 │         ┌─────────────────────┐
└─────────────────┘         │  Send Email         │
                            │  (Gmail/Nodemailer) │
                            └─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│       Firestore Trigger: onBookingUpdated                    │
│  - Create/Update Google Calendar event                       │
│  - Sync booking changes to calendar                          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Calendar API                             │
│  - Business appointment calendar                             │
│  - Webhook notifications for external changes                │
└─────────────────────────────────────────────────────────────┘
```

### External Service Dependencies Matrix

| Service | Depends On | Impact if Unavailable |
|---------|------------|----------------------|
| Firebase Hosting | None | Website completely down ❌ |
| Firestore | Firebase Auth | No booking data storage ❌ |
| Firebase Functions | Firestore, reCAPTCHA, Calendar, Email | Backend fails ❌ |
| Google Calendar | Service Account | No calendar sync ⚠️ |
| reCAPTCHA | Google Cloud | Spam vulnerability ⚠️ |
| Email (Gmail) | Gmail SMTP | No confirmations ⚠️ |
| Google Analytics | Cookie Consent | No analytics ✅ |
| Google Maps | None | No map display ✅ |
| Google Fonts | None | Fallback to system fonts ✅ |

**Legend:**
- ❌ Critical failure
- ⚠️ Degraded functionality
- ✅ Graceful degradation

---

## Security Assessment

### Current Security Posture: **GOOD** ✅

#### Security Controls in Place

1. **Credential Protection**
   - ✅ Environment variables for sensitive data
   - ✅ Secret Manager for critical secrets
   - ✅ `.gitignore` prevents credential commits
   - ✅ Service accounts with limited scopes

2. **Web Security**
   - ✅ HTTPS enforcement
   - ✅ HSTS header configured
   - ✅ Content Security Policy (CSP)
   - ✅ XSS protection headers
   - ✅ Clickjacking protection (X-Frame-Options)

3. **Application Security**
   - ✅ Server-side input validation
   - ✅ reCAPTCHA anti-spam
   - ✅ CORS restrictions
   - ✅ Secure cookie flags

4. **Data Protection**
   - ✅ GDPR-compliant cookie consent
   - ✅ Privacy policy published
   - ✅ Data minimization (only necessary fields collected)
   - ✅ Secure data transmission (HTTPS only)

#### Security Recommendations

1. **Access Management**
   - [ ] Implement multi-factor authentication for all admin accounts
   - [ ] Document and limit service account permissions
   - [ ] Regular access reviews (quarterly)
   - [ ] Separate dev/staging/production environments

2. **Credential Rotation**
   - [ ] Establish rotation schedule for service account keys (90 days)
   - [ ] Rotate API keys annually
   - [ ] Update email app passwords regularly
   - [ ] Document rotation procedures

3. **Monitoring and Alerting**
   - [ ] Set up Firebase alerts for function errors
   - [ ] Monitor reCAPTCHA scores for anomalies
   - [ ] Alert on suspicious booking patterns
   - [ ] Log access to sensitive functions

4. **Backup and Recovery**
   - [ ] Regular Firestore backups (automated)
   - [ ] Document recovery procedures
   - [ ] Test restore process quarterly
   - [ ] Export booking data regularly

---

## Recommendations

### Immediate Actions (Priority: HIGH)

1. **Document Current Ownership**
   - [ ] List all Google accounts with access
   - [ ] Document Firebase project permissions
   - [ ] Inventory service account keys
   - [ ] Note calendar ownership

2. **Create Migration Checklist**
   - [ ] Prepare new Google Workspace/Cloud account
   - [ ] Plan Firebase project transfer
   - [ ] Schedule downtime window (if needed)
   - [ ] Create rollback plan

3. **Backup Current Configuration**
   - [ ] Export Firestore data
   - [ ] Document all environment variables
   - [ ] Save current Firebase configuration
   - [ ] Archive service account keys securely

### Short-term Improvements (1-2 weeks)

1. **Enhanced Configuration Management**
   - [ ] Create comprehensive `.env.example` files
   - [ ] Add configuration validation scripts
   - [ ] Document all required environment variables
   - [ ] Create setup automation scripts

2. **Testing Infrastructure**
   - [ ] Add integration tests for each service
   - [ ] Create smoke tests for critical paths
   - [ ] Document testing procedures
   - [ ] Set up staging environment

3. **Documentation**
   - [ ] Write setup guide for new administrators
   - [ ] Create troubleshooting guide
   - [ ] Document architecture diagrams
   - [ ] Update README with prerequisites

### Long-term Improvements (1-3 months)

1. **Infrastructure as Code**
   - [ ] Consider Terraform for infrastructure management
   - [ ] Automate Firebase configuration deployment
   - [ ] Version control all infrastructure changes
   - [ ] Implement CI/CD pipelines

2. **Enhanced Monitoring**
   - [ ] Set up Google Cloud Monitoring
   - [ ] Create custom dashboards
   - [ ] Implement alerting rules
   - [ ] Add application performance monitoring

3. **Service Optimization**
   - [ ] Consider OAuth2 for email (instead of App Passwords)
   - [ ] Evaluate Firebase Extensions for email
   - [ ] Optimize function cold starts
   - [ ] Implement caching strategies

---

## Appendices

### A. Quick Reference - API Keys and IDs

**Public (Safe to Share):**
- Firebase Project ID: `Webbi1`
- reCAPTCHA Site Key: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`
- Google Analytics ID: `G-SP5R1MN1H9`
- Domain: fixnero.fi

**Private (Never Share - Store Securely):**
- reCAPTCHA Secret Key (Secret Manager)
- Google Service Account JSON
- Email App Password
- Google Calendar ID

### B. Contact Points for Service Management

| Service | Management Console | Support Contact |
|---------|-------------------|-----------------|
| Firebase | console.firebase.google.com | Firebase Support |
| Google Calendar | calendar.google.com | Google Workspace Support |
| Google Analytics | analytics.google.com | GA Support |
| reCAPTCHA | google.com/recaptcha/admin | reCAPTCHA Support |
| Google Cloud | console.cloud.google.com | GCP Support |

### C. Useful Commands

```bash
# Firebase
firebase login
firebase projects:list
firebase deploy --only hosting
firebase deploy --only functions
firebase functions:config:get
firebase functions:secrets:access RECAPTCHA_SECRET

# Git
git status
git log --oneline
git diff

# Node.js
npm install
npm audit
npm audit fix

# Firebase Emulator
firebase emulators:start
```

---

## Conclusion

The Fixnero website is built on a solid foundation of modern cloud services with good security practices. The main challenge for migration will be transferring ownership of the Firebase project and associated Google Cloud services to new administrator accounts.

**Migration Complexity Assessment:** MEDIUM
- Well-documented codebase ✅
- Clear separation of concerns ✅
- Good use of environment variables ✅
- Some manual configuration steps ⚠️
- Requires coordination with Google Support ⚠️

**Estimated Migration Time:** 4-8 hours (excluding waiting for Google support)

**Next Steps:**
1. Review this audit with stakeholders
2. Identify new account owners
3. Create detailed migration plan
4. Schedule migration window
5. Execute migration with testing
6. Verify all services operational
7. Update documentation

---

**Document Prepared By:** GitHub Copilot Coding Agent  
**Review Status:** Ready for Review  
**Confidentiality:** Internal Use Only - Contains sensitive system information
