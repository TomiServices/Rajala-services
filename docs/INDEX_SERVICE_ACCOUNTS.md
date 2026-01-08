# Documentation Index - Service Accounts and APIs

This index provides quick links to all documentation related to service accounts, APIs, email addresses, and Google Cloud/Firebase configurations for the Rajala Services (Fixnero) booking system.

## 📚 New Documentation (January 2026)

### Service Accounts & APIs Documentation

1. **[SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md)** - **START HERE**
   - Comprehensive documentation of all service accounts
   - Complete list of Google Cloud APIs in use
   - Email addresses and their purposes
   - Third-party integrations (reCAPTCHA, Gmail SMTP)
   - Step-by-step guide for creating new service accounts
   - Best practices and security guidelines

2. **[SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md)** - **QUICK LOOKUP**
   - One-page quick reference guide
   - Service account emails at a glance
   - Common tasks and commands
   - Quick setup guides
   - Security checklist

3. **[SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md)** - **VISUAL GUIDE**
   - Architecture diagrams
   - Service flow diagrams
   - API dependency matrices
   - Security boundaries visualization
   - Deployment flow charts

## 🎯 Use Cases

### "I need to understand which service accounts are being used"
→ Read: [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#service-accounts)

### "I need to find a service account email quickly"
→ Read: [SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md#-service-accounts)

### "I need to create a new service account for a reservation system"
→ Read: [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#creating-new-service-accounts)

### "I need to understand how the system integrates with Google Calendar"
→ Read: 
- [SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md) (diagrams)
- [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) (setup guide)

### "I need to configure email sending"
→ Read: [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)

### "I need to understand which APIs create which service accounts"
→ Read: [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#summary-table)

### "I need visual diagrams of the architecture"
→ Read: [SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md)

## 🔧 Related Documentation

### Setup and Configuration
- [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) - Google Calendar integration setup
- [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) - Email sender configuration
- [SECRET_MANAGER.md](./SECRET_MANAGER.md) - Secret Manager usage (Finnish)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - All environment variables

### Deployment
- [DEPLOYMENT_COMPLETE_GUIDE.md](./DEPLOYMENT_COMPLETE_GUIDE.md) - Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment checklist
- [GOOGLE_CALENDAR_DEPLOYMENT_CHECKLIST.md](./GOOGLE_CALENDAR_DEPLOYMENT_CHECKLIST.md) - Calendar-specific deployment

### Firebase Functions
- [../functions/README.md](../functions/README.md) - Functions documentation
- [../functions/DEPLOYMENT.md](../functions/DEPLOYMENT.md) - Functions deployment notes
- [FIREBASE_FUNCTIONS_GEN2_MIGRATION.md](./FIREBASE_FUNCTIONS_GEN2_MIGRATION.md) - Gen2 migration guide

### Troubleshooting
- [GOOGLE_CALENDAR_TROUBLESHOOTING.md](./GOOGLE_CALENDAR_TROUBLESHOOTING.md) - Calendar issues
- [RECAPTCHA_TROUBLESHOOTING.md](./RECAPTCHA_TROUBLESHOOTING.md) - reCAPTCHA issues

### Security
- [SECURITY_SUMMARY_GEN2.md](./SECURITY_SUMMARY_GEN2.md) - Security overview
- [RECAPTCHA_CONFIGURATION.md](./RECAPTCHA_CONFIGURATION.md) - reCAPTCHA security

## 📋 Quick Access

### Service Account Emails

**Google Calendar Sync** (Manual creation required)
```
fixnero-calendar-sync@fxnr-web.iam.gserviceaccount.com
```

**Firebase Admin SDK** (Automatically created)
```
firebase-adminsdk-[random]@fxnr-web.iam.gserviceaccount.com
```

### Environment Variables

**Required**
- `RECAPTCHA_SECRET` - Must be in Secret Manager

**Optional (for Google Calendar)**
- `GOOGLE_SERVICE_ACCOUNT` - Service account JSON
- `GOOGLE_CALENDAR_ID` - Calendar ID

**Optional (for Email)**
- `EMAIL_USER` - Gmail account
- `EMAIL_PASSWORD` - Gmail App Password
- `EMAIL_FROM` - Display name

### Key APIs

- **Google Calendar API**: `calendar-json.googleapis.com`
- **Cloud Firestore API**: `firestore.googleapis.com`
- **Secret Manager API**: `secretmanager.googleapis.com`

## 🔍 Finding Information

### By Topic

| Topic | Document |
|-------|----------|
| Service Accounts Overview | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#service-accounts) |
| Creating New Service Account | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#creating-new-service-accounts) |
| Google Cloud APIs | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#google-cloud-apis) |
| Email Addresses | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#email-addresses) |
| Third-Party Services | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#third-party-integrations) |
| Architecture Diagrams | [SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md) |
| Quick Commands | [SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md#-common-tasks) |

### By Service Account

| Service Account | Purpose | Documentation |
|----------------|---------|---------------|
| Google Calendar Sync | Calendar integration | [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) |
| Firebase Admin SDK | Firebase services | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#2-firebase-admin-sdk-default-service-account) |
| Cloud Run Service Agent | Functions execution | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#3-firebase-functions-service-account-gen2) |

### By API

| API | Purpose | Documentation |
|-----|---------|---------------|
| Google Calendar API | Event sync | [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) |
| Cloud Firestore API | Database | [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#2-cloud-firestore-api) |
| Secret Manager API | Secure storage | [SECRET_MANAGER.md](./SECRET_MANAGER.md) |
| reCAPTCHA API | Bot protection | [RECAPTCHA_CONFIGURATION.md](./RECAPTCHA_CONFIGURATION.md) |

## 🎓 Learning Path

### For New Developers

1. Start with [SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md)
2. Review [SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md) for visual overview
3. Deep dive into [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md)

### For Setting Up New Environment

1. [DEPLOYMENT_COMPLETE_GUIDE.md](./DEPLOYMENT_COMPLETE_GUIDE.md) - Overall deployment
2. [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) - Calendar setup
3. [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) - Email setup
4. [SECRET_MANAGER.md](./SECRET_MANAGER.md) - Secrets setup

### For Creating New Reservation System

1. [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md#creating-new-service-accounts) - Create service account
2. [SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md#for-new-reservation-system) - Quick setup guide
3. [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) - Calendar integration
4. [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md) - Email notifications

## 📊 Documentation Coverage

### Service Accounts ✅
- [x] Google Calendar Sync service account
- [x] Firebase Admin SDK service account
- [x] Cloud Run service account
- [x] How each is created and configured
- [x] Permissions and scopes

### APIs ✅
- [x] Google Calendar API
- [x] Cloud Firestore API
- [x] Cloud Functions API
- [x] Secret Manager API
- [x] Firebase Hosting API
- [x] How to enable and use each API

### Email Addresses ✅
- [x] Gmail SMTP account setup
- [x] Service account emails
- [x] Company contact emails
- [x] Firebase Email Extension integration

### Third-Party Integrations ✅
- [x] Google reCAPTCHA v3
- [x] Gmail SMTP
- [x] Google Analytics GA4
- [x] Firebase Email Extension

### Guides ✅
- [x] Creating new service accounts
- [x] Setting up Google Calendar integration
- [x] Configuring email sending
- [x] Managing secrets securely
- [x] Architecture diagrams and flows

## 🔄 Document Maintenance

These documents should be updated when:
- New service accounts are created
- New APIs are enabled or integrated
- Email configuration changes
- New Firebase extensions are added
- Security policies change
- New reservation systems are implemented

### Update Checklist

When making changes:
- [ ] Update [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md)
- [ ] Update [SERVICE_ACCOUNTS_QUICK_REFERENCE.md](./SERVICE_ACCOUNTS_QUICK_REFERENCE.md)
- [ ] Update diagrams in [SERVICE_ACCOUNTS_ARCHITECTURE.md](./SERVICE_ACCOUNTS_ARCHITECTURE.md) if architecture changes
- [ ] Update this index if new documents are added
- [ ] Update version numbers and "Last Updated" dates

## 📞 Support

For questions about:
- **Service Accounts**: See [SERVICE_ACCOUNTS_AND_APIS.md](./SERVICE_ACCOUNTS_AND_APIS.md)
- **Google Calendar**: See [GOOGLE_CALENDAR_TROUBLESHOOTING.md](./GOOGLE_CALENDAR_TROUBLESHOOTING.md)
- **Email**: See [EMAIL_CONFIGURATION.md](./EMAIL_CONFIGURATION.md)
- **Security**: See [SECURITY_SUMMARY_GEN2.md](./SECURITY_SUMMARY_GEN2.md)

---

**Created**: 2026-01-08  
**Index Version**: 1.0.0  
**Covers**: Service Accounts, APIs, Email Addresses, Third-Party Integrations
