# Service Accounts and APIs Architecture Diagram

This document provides visual diagrams showing the relationships between service accounts, APIs, and system components.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Rajala Services                              │
│                    (Fixnero Booking System)                          │
│                      Project: fxnr-web                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Firebase Hosting                                                    │
│  ├── index.html                                                      │
│  ├── booking-system.js                                               │
│  └── Other static files                                              │
│                                                                       │
│  Uses:                                                                │
│  - Google reCAPTCHA v3 (client-side)                                 │
│  - Google Analytics GA4                                               │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS API Calls
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Cloud Functions Gen2)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  HTTP Functions:                                                     │
│  ├── bookings (GET)          - Fetch all bookings                    │
│  ├── book (POST)             - Create new booking                    │
│  ├── calendarWebhook (POST)  - Receive calendar changes              │
│  ├── watchRegistrar (POST)   - Register calendar webhook             │
│  └── renewCalendarWatch      - Renew webhook subscription            │
│                                                                       │
│  Firestore Triggers:                                                 │
│  ├── onBookingCreated        - Send confirmation email               │
│  ├── onBookingUpdated        - Sync to Google Calendar               │
│  └── onBookingDeleted        - Remove from Google Calendar           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         │              │              │              │
         ↓              ↓              ↓              ↓
    ┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Firestore│   │ Calendar │   │  Email   │   │reCAPTCHA │
    │   DB    │   │   API    │   │  SMTP    │   │   API    │
    └────────┘   └──────────┘   └──────────┘   └──────────┘
```

## Service Account Access Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                      SERVICE ACCOUNTS                              │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 1. Google Calendar Sync Service Account                      │
│    fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com   │
├──────────────────────────────────────────────────────────────┤
│ Created: Manually via Google Cloud Console                   │
│ Role: Editor with Calendar API scope                         │
│ Configured: GOOGLE_SERVICE_ACCOUNT env var                   │
└──────────────────────────────────────────────────────────────┘
           │
           │ Authenticates with JWT
           ↓
┌──────────────────────────────────────────────────────────────┐
│           Google Calendar API (calendar-json.googleapis.com) │
├──────────────────────────────────────────────────────────────┤
│ Operations:                                                   │
│ - events.insert()   → Create calendar event                  │
│ - events.patch()    → Update calendar event                  │
│ - events.delete()   → Remove calendar event                  │
│ - events.list()     → Sync events from calendar              │
│ - events.watch()    → Register webhook notifications         │
└──────────────────────────────────────────────────────────────┘
           │
           │ Webhook notifications
           ↓
┌──────────────────────────────────────────────────────────────┐
│          calendarWebhook Function                             │
│          (Receives change notifications)                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 2. Firebase Admin SDK Service Account                        │
│    firebase-adminsdk-[id]@fxnr-web.iam.gserviceaccount.com  │
├──────────────────────────────────────────────────────────────┤
│ Created: Automatically by Firebase                           │
│ Role: Firebase Admin                                         │
│ Configured: Application Default Credentials (ADC)            │
└──────────────────────────────────────────────────────────────┘
           │
           │ Authenticated SDK calls
           ↓
┌──────────────────────────────────────────────────────────────┐
│              Cloud Firestore Database                         │
├──────────────────────────────────────────────────────────────┤
│ Collections:                                                  │
│ - varaukset         → Booking documents                       │
│ - mail              → Email queue (for extension)             │
│ - calendarWatch     → Webhook registration data               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 3. Cloud Run Service Account (Gen2 Functions)                │
│    [project-number]-compute@developer.gserviceaccount.com    │
├──────────────────────────────────────────────────────────────┤
│ Created: Automatically by Cloud Run                          │
│ Role: Cloud Run Service Agent                                │
│ Purpose: Execute functions, access secrets                    │
└──────────────────────────────────────────────────────────────┘
           │
           │ Access secrets
           ↓
┌──────────────────────────────────────────────────────────────┐
│              Secret Manager                                   │
├──────────────────────────────────────────────────────────────┤
│ Secrets:                                                      │
│ - RECAPTCHA_SECRET        → reCAPTCHA v3 verification         │
│ - EMAIL_PASSWORD          → Gmail App Password               │
│ - GOOGLE_SERVICE_ACCOUNT  → Calendar service account JSON    │
└──────────────────────────────────────────────────────────────┘
```

## Email Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Booking Created (Firestore Trigger)             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          onBookingCreated Function Triggered                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
                  ┌────────┴────────┐
                  │                 │
                  ↓                 ↓
      ┌───────────────────┐   ┌──────────────────┐
      │ Option A:         │   │ Option B:        │
      │ Firebase Email    │   │ Nodemailer       │
      │ Extension         │   │ (Fallback)       │
      └───────────────────┘   └──────────────────┘
                  │                 │
                  ↓                 ↓
      ┌───────────────────┐   ┌──────────────────┐
      │ Write to 'mail'   │   │ Direct SMTP      │
      │ collection        │   │ Connection       │
      └───────────────────┘   └──────────────────┘
                  │                 │
                  ↓                 │
      ┌───────────────────┐         │
      │ Extension reads   │         │
      │ from collection   │         │
      └───────────────────┘         │
                  │                 │
                  └────────┬────────┘
                           ↓
                  ┌────────────────┐
                  │ Gmail SMTP     │
                  │ Email Account  │
                  └────────────────┘
                           │
                           │ EMAIL_USER
                           │ EMAIL_PASSWORD
                           │ (from Secret Manager)
                           │
                           ↓
                  ┌────────────────┐
                  │ smtp.gmail.com │
                  └────────────────┘
                           │
                           ↓
                  ┌────────────────┐
                  │ Customer Email │
                  │ (Confirmation) │
                  └────────────────┘
```

## API Dependencies Matrix

```
┌────────────────────────────────────────────────────────────────┐
│                    Function Dependencies                        │
├────────────────┬───────────┬──────────┬──────────┬────────────┤
│ Function       │ Firestore │ Calendar │ Email    │ reCAPTCHA  │
│                │ API       │ API      │ SMTP     │ API        │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│ bookings       │    ✅     │    -     │    -     │     -      │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│ book           │    ✅     │    ✅    │    -     │     ✅     │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│onBookingCreated│    ✅     │    -     │    ✅    │     -      │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│onBookingUpdated│    ✅     │    ✅    │    -     │     -      │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│onBookingDeleted│    ✅     │    ✅    │    -     │     -      │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│calendarWebhook │    ✅     │    ✅    │    -     │     -      │
├────────────────┼───────────┼──────────┼──────────┼────────────┤
│watchRegistrar  │    ✅     │    ✅    │    -     │     -      │
└────────────────┴───────────┴──────────┴──────────┴────────────┘
```

## NPM Package to API Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                  Package Dependencies                            │
└─────────────────────────────────────────────────────────────────┘

firebase-admin (v13.6.0)
    ↓
    ├── Cloud Firestore API
    ├── Firebase Authentication API
    ├── Firebase Storage API
    └── Other Firebase services

googleapis (v166.0.0)
    ↓
    ├── Google Calendar API (calendar/v3)
    ├── Gmail API (gmail/v1) - if used
    └── Other Google APIs

google-auth-library (v10.5.0)
    ↓
    ├── Service Account JWT authentication
    ├── OAuth2 authentication
    └── Application Default Credentials (ADC)

nodemailer (v7.0.10)
    ↓
    └── Gmail SMTP (smtp.gmail.com:465/587)

axios (v1.13.2)
    ↓
    └── Google reCAPTCHA API (siteverify endpoint)

firebase-functions (v6.6.0)
    ↓
    ├── Cloud Functions API (Gen2)
    ├── Cloud Run (underlying platform)
    └── Secret Manager API (for secrets)
```

## Configuration Flow

```
┌────────────────────────────────────────────────────────────────┐
│                 Configuration Sources                           │
└────────────────────────────────────────────────────────────────┘

Development (Local)
    │
    ├── functions/.env
    │   ├── GOOGLE_SERVICE_ACCOUNT
    │   ├── GOOGLE_CALENDAR_ID
    │   ├── EMAIL_USER
    │   ├── EMAIL_PASSWORD
    │   └── EMAIL_FROM
    │
    └── functions/.runtimeconfig.json (legacy)
        └── Same variables in nested format

Production (Firebase)
    │
    ├── Secret Manager (Recommended)
    │   ├── RECAPTCHA_SECRET ⚠️ Required
    │   ├── EMAIL_PASSWORD (recommended)
    │   └── GOOGLE_SERVICE_ACCOUNT (optional)
    │
    └── Environment Variables (Alternative)
        ├── Set via Firebase CLI
        └── firebase functions:config:set

Function Runtime
    │
    ├── Access via defineString() for Gen2
    │   const param = defineString('PARAM_NAME');
    │   const value = param.value();
    │
    └── Access via process.env
        const value = process.env.PARAM_NAME;
```

## Security Boundaries

```
┌────────────────────────────────────────────────────────────────┐
│                    Security Layers                              │
└────────────────────────────────────────────────────────────────┘

Public Access
    │
    ├── Frontend (Firebase Hosting)
    │   └── Rate limited by CDN
    │
    └── HTTP Functions (CORS protected)
        └── Allowed origins only

Authentication Layer
    │
    ├── reCAPTCHA v3 verification
    │   └── Score threshold: 0.5
    │
    └── Service Account authentication
        └── JWT tokens for Google APIs

Authorization Layer
    │
    ├── Service Account permissions
    │   ├── Calendar: Make changes to events
    │   └── Firestore: Read/Write to collections
    │
    └── Secret Manager access
        └── Cloud Run service agent only

Data Protection
    │
    ├── Secrets in Secret Manager
    │   └── Not in code or environment files
    │
    ├── Service account keys
    │   └── Not committed to Git (.gitignore)
    │
    └── SSL/TLS encryption
        └── All HTTPS connections
```

## Deployment Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  Deployment Process                             │
└────────────────────────────────────────────────────────────────┘

Developer
    │
    ↓
┌──────────────┐
│ git push     │
└──────────────┘
    │
    ↓
┌──────────────┐
│ GitHub       │
└──────────────┘
    │
    ↓
┌──────────────────────────┐
│ firebase deploy          │
│ --only functions         │
└──────────────────────────┘
    │
    ├─→ Build Node.js 20 container
    │
    ├─→ Bind Secret Manager secrets
    │   ├── RECAPTCHA_SECRET
    │   ├── EMAIL_PASSWORD
    │   └── Others
    │
    ├─→ Deploy to Cloud Run (Gen2)
    │   └── Creates/updates service
    │
    └─→ Cloud Functions API
        └── Routes HTTP requests

Service Accounts Created/Used:
    │
    ├── Cloud Build service account
    │   └── Builds container image
    │
    ├── Cloud Run service account
    │   └── Executes function code
    │
    └── User service accounts
        ├── Firebase Admin SDK
        └── Google Calendar Sync
```

## Summary: Who Creates What

```
┌────────────────────────────────────────────────────────────────┐
│              Service Account Creation Matrix                    │
├─────────────────────────┬──────────────────────────────────────┤
│ Component               │ Created By                            │
├─────────────────────────┼──────────────────────────────────────┤
│ Calendar Sync SA        │ Manual (Developer)                    │
│ Firebase Admin SA       │ Automatic (Firebase)                  │
│ Cloud Run SA            │ Automatic (Cloud Run)                 │
│ Cloud Build SA          │ Automatic (Cloud Build)               │
├─────────────────────────┴──────────────────────────────────────┤
│                Email Addresses                                  │
├─────────────────────────┬──────────────────────────────────────┤
│ Gmail SMTP Account      │ Manual (Developer)                    │
│ info@fixnero.fi         │ Manual (Domain admin)                 │
├─────────────────────────┴──────────────────────────────────────┤
│                    APIs                                         │
├─────────────────────────┬──────────────────────────────────────┤
│ Google Calendar API     │ Manual enable (Developer)             │
│ Secret Manager API      │ Manual enable (Developer)             │
│ Firestore API           │ Automatic (Firebase)                  │
│ Cloud Functions API     │ Automatic (Firebase)                  │
│ Hosting API             │ Automatic (Firebase)                  │
└─────────────────────────┴──────────────────────────────────────┘
```

---

**Last Updated**: 2026-01-08  
**Diagram Version**: 1.0.0
