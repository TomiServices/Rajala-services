# Administrator Setup Guide
## Managing Rajala Services After Migration

**Document Version:** 1.0  
**Created:** January 13, 2026  
**Audience:** New System Administrators  
**Prerequisites:** Completed migration from MIGRATION_GUIDE.md

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Daily Operations](#daily-operations)
3. [System Management](#system-management)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Emergency Procedures](#emergency-procedures)

---

## Initial Setup

### 1. Development Environment Setup

#### Prerequisites

Install the following tools:

```bash
# Node.js (version 20 or higher)
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should be v20.x or higher
npm --version   # Should be 10.x or higher

# Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version

# Git (for version control)
# Download from: https://git-scm.com/

# Verify installation
git --version
```

#### Clone Repository

```bash
# Clone the repository
git clone https://github.com/TomiServices/Rajala-services.git
cd Rajala-services

# Install dependencies
cd functions
npm install
cd ..

# Verify installation
firebase projects:list
```

#### Configure Firebase

```bash
# Login to Firebase
firebase login

# Select the project
firebase use fxnr-web

# Verify project is selected
firebase projects:list
# Should show "(current)" next to fxnr-web
```

### 2. Environment Variables Setup

#### Create Local Configuration

```bash
# Navigate to functions directory
cd functions

# Copy example environment file
cp .env.example .env

# Edit the file with your values
nano .env  # or use your preferred editor
```

#### Required Environment Variables

Edit `functions/.env` with these values:

```bash
# ============================================
# Email Configuration
# ============================================
# Gmail account for sending booking confirmations
EMAIL_USER=bookings@fixnero.fi
# Gmail App Password (16 characters, no spaces)
EMAIL_PASSWORD=abcd efgh ijkl mnop
# Display name and email for outgoing emails
EMAIL_FROM=Rajala Services <noreply@fixnero.fi>

# ============================================
# Google Calendar Configuration
# ============================================
# Service Account JSON (minified, as single line)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account","project_id":"fxnr-web",...}
# Google Calendar ID (found in calendar settings)
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
# Webhook callback URL (your Cloud Functions URL)
WATCH_CALLBACK_URL=https://europe-north1-fxnr-web.cloudfunctions.net/calendarWebhook

# ============================================
# NOTE: RECAPTCHA_SECRET is set via Secret Manager
# Do NOT add it to this file!
# Set it with: firebase functions:secrets:set RECAPTCHA_SECRET
# ============================================
```

#### Set Secrets (One-Time Setup)

```bash
# Set reCAPTCHA secret
firebase functions:secrets:set RECAPTCHA_SECRET
# When prompted, enter the secret key from:
# https://www.google.com/recaptcha/admin

# Optional: Set email password as secret for better security
firebase functions:secrets:set EMAIL_PASSWORD
# Enter the Gmail App Password when prompted
# Then remove EMAIL_PASSWORD from .env file
```

### 3. Access Credentials Inventory

Create a secure password manager entry with:

**Firebase Console:**
- URL: https://console.firebase.google.com/project/fxnr-web
- Email: [admin email]
- Password: [use password manager]
- 2FA: [backup codes stored]

**Google Calendar:**
- URL: https://calendar.google.com
- Calendar ID: [from environment variables]
- Email: [admin email]

**Google Analytics:**
- URL: https://analytics.google.com
- Property: Rajala Services
- Measurement ID: G-1DZ4WCV7ZK

**reCAPTCHA:**
- URL: https://www.google.com/recaptcha/admin
- Site: fixnero.fi
- Site Key: 6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM
- Secret Key: [in Secret Manager]

**Domain Registrar:**
- URL: [registrar website]
- Account: [registrar account]
- Domain: fixnero.fi

**GitHub:**
- URL: https://github.com/TomiServices/Rajala-services
- Account: [GitHub username]

---

## Daily Operations

### 1. Monitoring Bookings

#### Check New Bookings

**Via Firebase Console:**
```
1. Go to https://console.firebase.google.com/project/fxnr-web
2. Navigate to Firestore Database
3. Select collection: "varaukset"
4. Review documents sorted by timestamp
5. Verify booking details are complete
```

**Via Google Calendar:**
```
1. Go to https://calendar.google.com
2. Select "Rajala Services - Varaukset" calendar
3. Review today's and upcoming appointments
4. Verify times match Firestore bookings
```

#### Booking Data Structure

Each booking in Firestore contains:
```javascript
{
  aika: "2026-01-15T10:00:00.000Z",          // Booking date/time
  nimi: "John Doe",                           // Customer name
  sahkoposti: "john@example.com",            // Customer email
  puhelin: "+358 40 123 4567",               // Customer phone
  services: [                                 // Selected services
    {
      serviceName: "Pesupalvelut",
      taskName: "Ulkopesu",
      price: "50€"
    }
  ],
  totalPrice: "50€",                         // Total price
  totalNumericPrice: 50,                     // Numeric price
  calendarEventId: "abc123xyz",              // Google Calendar event ID
  createdAt: Timestamp,                      // Creation timestamp
  updatedAt: Timestamp                       // Last update timestamp
}
```

### 2. Handling Customer Inquiries

#### Common Questions

**"I didn't receive a confirmation email"**
```
Solution:
1. Check Firestore for their booking
2. Verify email address is correct
3. Check spam folder
4. Resend manually if needed:
   - Get customer email from booking
   - Send manual confirmation with details
5. Check function logs for email errors:
   firebase functions:log --only onBookingCreated
```

**"I want to change my booking time"**
```
Solution:
1. Find booking in Firestore
2. Edit the "aika" field with new date/time
3. Firestore trigger will automatically:
   - Update Google Calendar event
   - Send updated confirmation email
4. Verify calendar updated
```

**"I want to cancel my booking"**
```
Solution:
1. Find booking in Firestore
2. Delete the document
3. Firestore trigger will automatically:
   - Remove Google Calendar event
   - (Optional: could send cancellation email)
4. Verify calendar event removed
```

### 3. Email Management

#### Verify Email Delivery

```bash
# Check function logs for email sending
firebase functions:log --only onBookingCreated --limit 10

# Look for successful sends:
# "Email sent successfully to: customer@email.com"

# Look for errors:
# "Error sending email: ..."
```

#### Update Email Template

Email template is in `functions/index.js`, in the `onBookingCreated` function:

```javascript
// Find this section to edit email content:
const mailOptions = {
  from: emailFrom,
  to: newBooking.sahkoposti,
  subject: '✅ Varauksesi on vahvistettu - Rajala Services',
  html: `
    <div style="font-family: Arial, sans-serif; ...">
      <!-- Email content here -->
    </div>
  `
};
```

After editing:
```bash
firebase deploy --only functions
```

---

## System Management

### 1. Deploying Changes

#### Hosting (Website Content)

```bash
# After making changes to HTML, CSS, or JavaScript files

# Preview changes locally
# Open index.html in browser
# Or use: python3 -m http.server 8000

# Deploy to Firebase
firebase deploy --only hosting

# Verify deployment
# Visit https://fixnero.fi
# Check changes are live
```

#### Functions (Backend Code)

```bash
# After making changes to functions/index.js or other function code

# Test locally (optional)
firebase emulators:start

# Deploy to production
firebase deploy --only functions

# Monitor deployment
firebase functions:log --limit 20

# Test functions
curl https://europe-north1-fxnr-web.cloudfunctions.net/bookings
```

#### Deploy Everything

```bash
# Deploy both hosting and functions
firebase deploy

# Or specific targets
firebase deploy --only hosting,functions
```

### 2. Environment Variable Management

#### View Current Configuration

```bash
# View non-secret environment variables
cat functions/.env

# View secrets (requires authentication)
firebase functions:secrets:access RECAPTCHA_SECRET
```

#### Update Environment Variables

**For non-sensitive values (local):**
```bash
# Edit functions/.env
nano functions/.env

# Redeploy functions
firebase deploy --only functions
```

**For sensitive values (Secret Manager):**
```bash
# Update secret
firebase functions:secrets:set RECAPTCHA_SECRET
# Enter new value when prompted

# Redeploy functions
firebase deploy --only functions
```

### 3. Database Management

#### Backup Firestore Data

**Manual Backup:**
```bash
# Using Firebase Console
# 1. Go to Firestore Database
# 2. Click three dots menu > Export data
# 3. Select collections
# 4. Choose bucket or create new one
# 5. Export

# Using gcloud CLI
gcloud firestore export gs://fxnr-web-backup/firestore-$(date +%Y%m%d)
```

**Automated Backup (Recommended):**

Set up Cloud Scheduler to run daily backups:
```bash
# This requires Google Cloud Console setup
# See: https://firebase.google.com/docs/firestore/manage-data/export-import
```

#### Restore from Backup

```bash
# Using gcloud CLI
gcloud firestore import gs://fxnr-web-backup/firestore-YYYYMMDD

# Or via Firebase Console
# 1. Go to Firestore Database
# 2. Three dots menu > Import data
# 3. Select backup location
```

#### Clean Old Data (Optional)

If you want to archive old bookings:

```javascript
// Run this in Firebase Console > Firestore > Query
// Or create a Cloud Function to run periodically

// Find bookings older than 6 months
// Delete or move to archive collection
```

---

## Monitoring and Alerts

### 1. Set Up Email Alerts

#### Firebase Console Alerts

```
1. Go to Firebase Console > Project Settings
2. Click "Integrations" tab
3. Set up Cloud Monitoring integration
4. Create alert policies:
   - Function errors > 10 in 5 minutes
   - Firestore read/write failures
   - Hosting high error rate (5xx)
```

#### Google Cloud Monitoring

```
1. Go to https://console.cloud.google.com/monitoring
2. Select project: fxnr-web
3. Create alerts for:
   - Function execution errors
   - High response times
   - API quota limits approaching
```

### 2. Daily Monitoring Checklist

**Morning Routine (5-10 minutes):**
- [ ] Check Firebase Console for errors
- [ ] Review function logs for issues
- [ ] Verify new bookings created overnight
- [ ] Check email delivery success rate
- [ ] Review Google Analytics for traffic anomalies

**Weekly Review (15-20 minutes):**
- [ ] Review all logs for patterns
- [ ] Check quota usage (Firestore, Functions)
- [ ] Verify backups completed successfully
- [ ] Review customer feedback
- [ ] Update documentation if needed

### 3. Key Metrics to Monitor

**Firebase Functions:**
- Invocations per day
- Error rate (should be <1%)
- Average execution time
- Memory usage

**Firestore:**
- Read/write operations
- Storage size
- Number of bookings

**Website (Analytics):**
- Daily visitors
- Booking conversion rate
- Page load times
- Bounce rate

**Costs:**
- Firebase monthly bill
- Google Cloud costs
- Domain renewal dates

---

## Maintenance Procedures

### 1. Regular Updates

#### Update Dependencies (Monthly)

```bash
# Navigate to functions directory
cd functions

# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Test locally
firebase emulators:start

# If tests pass, deploy
firebase deploy --only functions
```

#### Update Firebase CLI

```bash
# Check current version
firebase --version

# Update to latest
npm install -g firebase-tools@latest

# Verify update
firebase --version
```

### 2. Security Maintenance

#### Rotate Service Account Keys (Quarterly)

```bash
# Create new service account key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=SERVICE_ACCOUNT_EMAIL

# Minify JSON
cat new-key.json | jq -c '.' > new-key-minified.json

# Update environment variable
# Copy content to functions/.env GOOGLE_SERVICE_ACCOUNT

# Deploy
firebase deploy --only functions

# Wait 24 hours, then delete old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=SERVICE_ACCOUNT_EMAIL
```

#### Rotate Email App Password (Annually)

```bash
# 1. Create new App Password in Gmail
# 2. Update secret
firebase functions:secrets:set EMAIL_PASSWORD
# Enter new password

# 3. Deploy
firebase deploy --only functions

# 4. Test email delivery
# Make test booking or manually trigger email function

# 5. Revoke old App Password in Gmail
```

### 3. Performance Optimization

#### Monitor Function Cold Starts

```bash
# Check function execution times
firebase functions:log --limit 50 | grep "execution took"

# If cold starts are slow, consider:
# - Keeping functions warm with scheduled pings
# - Increasing function memory allocation
# - Optimizing initialization code
```

#### Optimize Firestore Indexes

```
# If queries are slow, create indexes
# Firebase Console will suggest indexes
# Or create manually in Firestore > Indexes
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: Website Not Loading

**Symptoms:** fixnero.fi shows error or doesn't load

**Diagnosis:**
```bash
# Check hosting status
firebase hosting:channel:list

# Check DNS
dig fixnero.fi

# Check SSL certificate
echo | openssl s_client -servername fixnero.fi -connect fixnero.fi:443
```

**Solution:**
```bash
# Redeploy hosting
firebase deploy --only hosting

# If DNS issue, check domain registrar
# If SSL issue, check Firebase Console > Hosting
```

#### Issue: Bookings Not Saving

**Symptoms:** Customers report bookings fail

**Diagnosis:**
```bash
# Check function logs
firebase functions:log --only book --limit 20

# Look for errors:
# - reCAPTCHA validation failures
# - Firestore permission errors
# - Input validation errors
```

**Solution:**
```bash
# If reCAPTCHA errors:
# - Verify secret is correct
firebase functions:secrets:access RECAPTCHA_SECRET

# If Firestore errors:
# - Check Firestore rules
# - Verify service account permissions

# If validation errors:
# - Check booking-system.js validation logic
# - Verify form inputs are correct
```

#### Issue: Emails Not Sending

**Symptoms:** Customers don't receive confirmation emails

**Diagnosis:**
```bash
# Check email function logs
firebase functions:log --only onBookingCreated --limit 10

# Look for errors:
# - SMTP authentication failures
# - Network errors
# - Invalid email addresses
```

**Solution:**
```bash
# If authentication error:
# 1. Regenerate Gmail App Password
# 2. Update secret
firebase functions:secrets:set EMAIL_PASSWORD

# If network error:
# - Check Gmail SMTP settings
# - Verify EMAIL_USER and EMAIL_FROM in .env

# If invalid email:
# - Check booking data in Firestore
# - Verify email validation in booking form
```

#### Issue: Calendar Not Syncing

**Symptoms:** Calendar events not created or updated

**Diagnosis:**
```bash
# Check calendar function logs
firebase functions:log --only onBookingUpdated --limit 10

# Look for errors:
# - Service account authentication errors
# - Calendar API permission errors
# - Invalid calendar ID
```

**Solution:**
```bash
# If auth error:
# 1. Verify service account JSON is valid
# 2. Check service account email has calendar access

# If permission error:
# 1. Go to Google Calendar settings
# 2. Verify service account email has "Make changes" permission

# If invalid calendar ID:
# 1. Check GOOGLE_CALENDAR_ID in .env
# 2. Verify calendar exists and is accessible
```

### Advanced Troubleshooting

#### Enable Debug Logging

Add this to `functions/index.js`:

```javascript
// At the top of the file
const DEBUG = true;

// In functions, add:
if (DEBUG) {
  console.log('Debug info:', data);
}
```

Then deploy and check logs:
```bash
firebase deploy --only functions
firebase functions:log --limit 50
```

#### Test Individual Components

**Test reCAPTCHA:**
```bash
# Visit test page
# Open browser console
# Execute reCAPTCHA manually
grecaptcha.execute('SITE_KEY', {action: 'test'}).then(token => console.log(token));
```

**Test Email:**
```javascript
// Create test function in functions/index.js
exports.testEmail = onRequest(async (req, res) => {
  // Copy email sending code here
  // Send to test address
});
```

**Test Calendar:**
```bash
# Use Google Calendar API Explorer
# https://developers.google.com/calendar/api/v3/reference
```

---

## Emergency Procedures

### Critical System Failure

**If the entire website is down:**

1. **Immediate Assessment (2 minutes)**
   ```bash
   # Check if Firebase is up
   curl https://status.firebase.google.com
   
   # Check if site is reachable
   curl -I https://fixnero.fi
   ```

2. **Emergency Contact**
   ```
   - Firebase Support: https://console.firebase.google.com/support
   - Priority: Critical - Production down
   ```

3. **Rollback to Last Known Good Version**
   ```bash
   # Get last deployment
   firebase hosting:channel:list
   
   # Rollback (if needed)
   git log --oneline
   git revert HEAD
   firebase deploy --only hosting
   ```

### Data Loss or Corruption

**If bookings are deleted or corrupted:**

1. **Stop All Operations**
   ```bash
   # Disable booking form (edit index.html)
   # Comment out booking button or form
   firebase deploy --only hosting
   ```

2. **Assess Damage**
   ```bash
   # Check Firestore
   # Compare with last backup
   # Identify missing/corrupted records
   ```

3. **Restore from Backup**
   ```bash
   # Import from last backup
   gcloud firestore import gs://fxnr-web-backup/firestore-YYYYMMDD
   ```

4. **Verify and Re-enable**
   ```bash
   # Verify data looks correct
   # Re-enable booking form
   # Monitor closely for 24 hours
   ```

### Security Breach

**If unauthorized access is suspected:**

1. **Immediate Actions**
   ```bash
   # Change all passwords immediately
   # Revoke all API keys
   # Disable service accounts
   # Check audit logs
   ```

2. **Investigation**
   ```bash
   # Review Firebase audit logs
   # Check Cloud Functions logs for suspicious activity
   # Review Firestore access logs
   # Check for data exfiltration
   ```

3. **Recovery**
   ```bash
   # Rotate all credentials
   # Update all secrets
   # Redeploy with new configuration
   # Monitor for 48 hours
   ```

---

## Additional Resources

### Documentation
- Firebase Documentation: https://firebase.google.com/docs
- Google Calendar API: https://developers.google.com/calendar
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

### Support Channels
- Firebase Community: https://firebase.google.com/community
- Stack Overflow: [firebase] tag
- GitHub Issues: TomiServices/Rajala-services

### Training Resources
- Firebase YouTube Channel
- Google Cloud Skills Boost
- freeCodeCamp Firebase tutorials

---

## Appendix: Quick Commands Reference

### Firebase Commands
```bash
# Login
firebase login

# List projects
firebase projects:list

# Select project
firebase use fxnr-web

# Deploy
firebase deploy
firebase deploy --only hosting
firebase deploy --only functions

# View logs
firebase functions:log
firebase functions:log --only FUNCTION_NAME
firebase functions:log --limit 50

# Secrets
firebase functions:secrets:set SECRET_NAME
firebase functions:secrets:access SECRET_NAME

# Emulators
firebase emulators:start
```

### Git Commands
```bash
# Status
git status
git log --oneline

# Changes
git add .
git commit -m "Description"
git push

# Undo
git revert HEAD
git reset --hard HEAD~1
```

### System Checks
```bash
# Website status
curl -I https://fixnero.fi

# Functions status
curl https://europe-north1-fxnr-web.cloudfunctions.net/bookings

# DNS check
dig fixnero.fi
```

---

**Document Prepared By:** GitHub Copilot Coding Agent  
**Review Status:** Ready for Review  
**Last Updated:** January 13, 2026  
**Next Review:** Quarterly or after major changes
