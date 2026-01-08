# Service Accounts Documentation - Implementation Summary

## Overview

This document summarizes the comprehensive documentation created to identify and document all service accounts, email addresses, APIs, and plugins used in the Rajala Services (Fixnero) booking system via Google Cloud Console and Firebase.

## Documentation Delivered

### 1. Main Documentation: SERVICE_ACCOUNTS_AND_APIS.md
**Size**: 19,564 characters  
**Purpose**: Complete reference for all service accounts and integrations

#### Contents
- **Service Accounts Section**
  - Google Calendar Sync service account (manual creation)
  - Firebase Admin SDK default service account (auto-created)
  - Firebase Functions service account (Gen2, auto-created)
  - Detailed configuration instructions for each
  - Environment variable mappings

- **Google Cloud APIs Section**
  - Google Calendar API (calendar-json.googleapis.com)
  - Cloud Firestore API (firestore.googleapis.com)
  - Cloud Functions API (cloudfunctions.googleapis.com)
  - Secret Manager API (secretmanager.googleapis.com)
  - Firebase Hosting API (firebasehosting.googleapis.com)
  - Cost information and usage limits

- **Firebase Services Section**
  - Firebase Hosting configuration
  - Firebase Functions (Gen2) setup
  - Firebase Firestore collections schema
  - Firebase Email Extension (optional)

- **Email Addresses Section**
  - Booking confirmation sender (Gmail SMTP)
  - Service account emails
  - Company contact emails
  - Setup instructions and alternatives

- **Third-Party Integrations Section**
  - Google reCAPTCHA v3 configuration
  - Gmail SMTP integration
  - Google Analytics GA4

- **Creating New Service Accounts**
  - Step-by-step guide for creating service accounts
  - When to create new accounts
  - Security best practices
  - Example: Email reservation system account

### 2. Quick Reference: SERVICE_ACCOUNTS_QUICK_REFERENCE.md
**Size**: 7,330 characters  
**Purpose**: One-page quick lookup and common tasks

#### Contents
- Service account quick reference table
- Enabled APIs overview
- Email addresses and accounts
- Third-party services summary
- Firebase collections reference
- Quick setup guide for new reservation systems
- Finding service account emails
- Common tasks (add account, rotate key, share calendar, setup email)
- Service account usage matrix
- Security checklist

### 3. Architecture Diagrams: SERVICE_ACCOUNTS_ARCHITECTURE.md
**Size**: 16,656 characters  
**Purpose**: Visual representation of system architecture

#### Contents
- System architecture overview diagram
- Service account access flow diagrams
- Email flow diagram (dual-path)
- API dependencies matrix
- NPM package to API mapping
- Configuration flow diagram
- Security boundaries diagram
- Deployment flow diagram
- Service account creation matrix

### 4. Documentation Index: INDEX_SERVICE_ACCOUNTS.md
**Size**: 9,597 characters  
**Purpose**: Navigation hub and learning guide

#### Contents
- Quick links to all documentation
- Use case-based navigation
- Topic-based index
- Service account lookup table
- API lookup table
- Learning paths for different roles
- Documentation coverage checklist
- Maintenance guidelines

## Key Information Identified

### Service Accounts

| Service Account | Email Format | Created By | Purpose |
|----------------|--------------|------------|---------|
| Google Calendar Sync | `fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com` | Manual (Google Cloud Console) | Bidirectional calendar sync |
| Firebase Admin SDK | `firebase-adminsdk-[random]@fxnr-web.iam.gserviceaccount.com` | Automatic (Firebase) | Firebase services access |
| Cloud Run Service Agent | `[project-number]-compute@developer.gserviceaccount.com` | Automatic (Cloud Run) | Execute Gen2 functions |

### APIs and Their Creators

| API | Created/Enabled By | Purpose |
|-----|-------------------|---------|
| Google Calendar API | Manual (Developer) | Calendar event CRUD operations |
| Cloud Firestore API | Automatic (Firebase) | Database storage |
| Cloud Functions API | Automatic (Firebase) | Backend function execution |
| Secret Manager API | Manual (Developer) | Secure credential storage |
| Firebase Hosting API | Automatic (Firebase) | Static site hosting |

### Email Addresses

| Type | Example/Format | Created By | Purpose |
|------|---------------|------------|---------|
| Gmail SMTP Account | User-configured | Manual (Gmail) | Send booking confirmations |
| Calendar Sync SA | `fixnero-calendar-sync@...` | Manual (Cloud Console) | API authentication |
| Firebase Admin SA | `firebase-adminsdk-...@...` | Automatic (Firebase) | SDK operations |
| Company Contact | `info@fixnero.fi` | Manual (Domain admin) | Customer support |

### NPM Packages and Associated APIs

```javascript
{
  "firebase-admin": "^13.6.0",       // → Cloud Firestore API, Auth API
  "firebase-functions": "^6.6.0",    // → Cloud Functions API, Secret Manager
  "googleapis": "^166.0.0",          // → Google Calendar API
  "google-auth-library": "^10.5.0",  // → Service Account authentication
  "nodemailer": "^7.0.10"            // → Gmail SMTP (smtp.gmail.com)
}
```

### Configuration Sources

**Development**:
- `functions/.env` - Local environment variables
- `functions/.runtimeconfig.json` - Legacy config format

**Production**:
- Secret Manager (recommended for sensitive data)
- Firebase Functions config (alternative)

### Third-Party Integrations

1. **Google reCAPTCHA v3**
   - Created by: Manual setup at google.com/recaptcha/admin
   - Used for: Bot protection on booking form
   - Configuration: `RECAPTCHA_SECRET` in Secret Manager

2. **Gmail SMTP**
   - Created by: Manual App Password creation
   - Used for: Sending booking confirmation emails
   - Configuration: `EMAIL_USER`, `EMAIL_PASSWORD`

3. **Firebase Email Extension** (Optional)
   - Installed by: `firebase ext:install firebaseextensions/firestore-send-email`
   - Used for: Alternative email delivery mechanism
   - Fallback: Nodemailer if extension not available

## Use Cases Addressed

### ✅ Identifying Service Accounts
- Complete list of all service accounts with email addresses
- Clear indication of which are manual vs automatic
- Purpose and permissions for each account

### ✅ Tracing Add-ons and APIs
- Documented which plugin/API creates each service account
- NPM package to API mapping
- Configuration variable tracking

### ✅ Creating New Users/Emails
- Step-by-step guide for creating new service accounts
- Example scenario: Email reservation system
- Security best practices included

### ✅ Clear Presentation
- Multiple formats: comprehensive, quick reference, diagrams, index
- Visual architecture diagrams
- Tables and matrices for quick scanning
- Organized by topic and use case

## Security Highlights

All documentation emphasizes security best practices:
- ✅ Use Secret Manager for sensitive data
- ✅ Never commit service account keys to Git
- ✅ Use App Passwords instead of Gmail passwords
- ✅ Rotate keys every 90 days
- ✅ Least-privilege principle
- ✅ Monitor service account usage

## Navigation Guide

**For Quick Lookup**:
→ Start with `SERVICE_ACCOUNTS_QUICK_REFERENCE.md`

**For Understanding Architecture**:
→ Read `SERVICE_ACCOUNTS_ARCHITECTURE.md` (visual diagrams)

**For Complete Details**:
→ Reference `SERVICE_ACCOUNTS_AND_APIS.md`

**For Finding Specific Info**:
→ Use `INDEX_SERVICE_ACCOUNTS.md` (topic/use case index)

## Maintenance Plan

Documentation should be updated when:
- New service accounts are created
- New APIs are enabled
- Email configuration changes
- New Firebase extensions are installed
- Security policies change
- New reservation systems are implemented

Update checklist provided in `INDEX_SERVICE_ACCOUNTS.md`.

## Files Created

```
docs/
├── SERVICE_ACCOUNTS_AND_APIS.md          (Main documentation)
├── SERVICE_ACCOUNTS_QUICK_REFERENCE.md    (Quick reference)
├── SERVICE_ACCOUNTS_ARCHITECTURE.md       (Architecture diagrams)
└── INDEX_SERVICE_ACCOUNTS.md              (Navigation index)
```

## Quality Assurance

- ✅ Code review: No issues found
- ✅ CodeQL security scan: N/A (documentation only)
- ✅ All requirements met
- ✅ Clear organization and formatting
- ✅ Multiple access patterns supported
- ✅ Comprehensive coverage

## Project Information

- **Project ID**: `fxnr-web`
- **Primary Region**: `us-central1`
- **Node.js Version**: 20
- **Firebase Functions**: Gen2
- **Database**: Cloud Firestore

## Summary

This documentation provides a complete reference for all service accounts, APIs, and email addresses used in the Rajala Services booking system. It includes:

1. **Identification** of all service accounts and their email formats
2. **Documentation** of which APIs/plugins create each account
3. **Instructions** for creating new service accounts for reservation systems
4. **Clear presentation** with multiple formats (comprehensive, quick reference, diagrams)
5. **Security best practices** and maintenance guidelines

The information is now available in multiple formats to suit different use cases, from quick lookups to in-depth implementation guides.

---

**Created**: 2026-01-08  
**Task**: Document service accounts and APIs  
**Status**: ✅ Complete  
**Documentation Version**: 1.0.0
