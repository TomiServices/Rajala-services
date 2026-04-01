# Complete Migration Guide
## Transferring Rajala Services to New Owner Accounts

**Document Version:** 1.0  
**Created:** January 13, 2026  
**Estimated Time:** 6-10 hours (excluding support wait times)  
**Difficulty:** Medium  
**Risk Level:** Medium (with proper preparation and testing)

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Account Setup](#account-setup)
4. [Service-by-Service Migration](#service-by-service-migration)
5. [Post-Migration Verification](#post-migration-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Migration Scope

This guide covers the complete transfer of the Rajala Services (Fixnero) website and all associated external services from current owner accounts to new administrator accounts.

### Services to Migrate

1. **Firebase Project** (Hosting, Firestore, Functions)
2. **Google Calendar** (Booking synchronization)
3. **Google Analytics 4** (Web analytics)
4. **Google reCAPTCHA v3** (Anti-spam)
5. **Gmail Account** (Email notifications)
6. **Domain Management** (fixnero.fi)

### Prerequisites

Before starting migration:
- [ ] New Google account created (will own all services)
- [ ] Backup of all data completed
- [ ] All current credentials documented
- [ ] Migration window scheduled (recommend off-peak hours)
- [ ] Rollback plan prepared
- [ ] All stakeholders notified

### Estimated Timeline

| Phase | Duration | Can Schedule |
|-------|----------|--------------|
| Preparation | 2-3 hours | Yes |
| Account Setup | 1-2 hours | Yes |
| Firebase Transfer | 2-4 hours | Partial |
| Service Migration | 2-3 hours | Yes |
| Testing | 1-2 hours | Yes |
| **Total** | **8-14 hours** | Spread over 2-3 days |

---

## Pre-Migration Checklist

### 1. Data Backup (CRITICAL - Do First!)

#### Firestore Database Backup

**Option A: Manual Export via Firebase Console**
```
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project: fxnr-web
3. Navigate to Firestore Database
4. Click "Export" in the top menu
5. Select all collections
6. Choose Cloud Storage bucket (or create new one)
7. Click "Export"
8. Download the export files to local storage
```

**Option B: Using gcloud CLI**
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project fxnr-web

# Export Firestore data with error handling
gcloud firestore export gs://fxnr-web-backup/firestore-backup-$(date +%Y%m%d)

# Verify export succeeded
if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
    # Download to local machine
    gsutil -m cp -r gs://fxnr-web-backup/firestore-backup-* ./backups/
    
    # Verify files downloaded
    if [ -d "./backups/firestore-backup-$(date +%Y%m%d)" ]; then
        echo "Backup verified and downloaded"
    else
        echo "ERROR: Backup download failed"
        exit 1
    fi
else
    echo "ERROR: Backup export failed"
    exit 1
fi
```

**Backup Verification:**
- [ ] Export completed successfully
- [ ] Files downloaded to secure location
- [ ] Backup size verified (should be >0 bytes)
- [ ] Test restore in emulator if possible

#### Configuration Backup

Create a secure backup document with all current settings:

```bash
# Create backup directory
mkdir -p migration-backup/$(date +%Y%m%d)
cd migration-backup/$(date +%Y%m%d)

# Export Firebase configuration
firebase projects:list > firebase-projects.txt
firebase functions:config:get > functions-config.json

# Export secrets (document, don't save in plain text!)
# Manually document these in a secure password manager:
# - RECAPTCHA_SECRET
# - EMAIL_PASSWORD
# - GOOGLE_SERVICE_ACCOUNT JSON

# Copy important files
cp ../../.firebaserc ./
cp ../../firebase.json ./
cp ../../functions/.env.example ./
cp ../../functions/package.json ./

# Document current environment
echo "Backup created: $(date)" > backup-info.txt
echo "Firebase Project: fxnr-web" >> backup-info.txt
echo "Node version: $(node --version)" >> backup-info.txt
echo "Firebase CLI: $(firebase --version)" >> backup-info.txt
```

#### Website Code Backup

```bash
# Create git archive
git archive --format=zip --output=rajala-services-$(date +%Y%m%d).zip HEAD

# Or create full repository backup
cd ..
tar -czf rajala-services-full-$(date +%Y%m%d).tar.gz Rajala-services/

# Verify backup
ls -lh *.zip *.tar.gz
```

### 2. Document Current State

Create a document with:

**Current Owners/Access:**
```
Firebase Project Owner: [email]
Google Calendar Owner: [email]
Google Analytics Owner: [email]
reCAPTCHA Owner: [email]
Domain Registrar Account: [account info]
GitHub Repository Owner: [username]
```

**Current Service IDs:**
```
Firebase Project ID: fxnr-web
Google Calendar ID: [full calendar email]
GA4 Measurement ID: G-SP5R1MN1H9
reCAPTCHA Site Key: 6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM
Domain: fixnero.fi
```

**Current URLs:**
```
Website: https://fixnero.fi
Firebase Console: https://console.firebase.google.com/project/fxnr-web
Cloud Functions: https://europe-north1-fxnr-web.cloudfunctions.net
```

### 3. Communication Plan

**Notify Stakeholders:**
- [ ] Business owners informed
- [ ] Development team notified
- [ ] Customer-facing staff aware
- [ ] Support team prepared for issues

**Communication Template:**
```
Subject: Scheduled Maintenance - Rajala Services Website

Dear Team,

We will be performing a scheduled migration of our website infrastructure on [DATE] 
at [TIME]. During this time:

- Website may be briefly unavailable (5-10 minutes)
- Booking system may be temporarily disabled (30-60 minutes)
- Email confirmations may be delayed (up to 1 hour)

Expected completion: [TIME]
Contact for issues: [NAME/EMAIL]

Thank you for your patience.
```

---

## Account Setup

### 1. Create New Google Account

This will be the primary owner account for all services.

**Steps:**
1. Go to https://accounts.google.com/signup
2. Create new account with business email
3. **Recommended format:** `admin@fixnero.fi` or `tech@fixnero.fi`
4. Use strong password (20+ characters, password manager)
5. Enable 2-Factor Authentication (2FA) **immediately**
6. Save recovery codes in secure location
7. Add recovery email and phone number

**2FA Setup (CRITICAL):**
```
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Set up authenticator app (Google Authenticator, Authy, etc.)
4. Add backup phone number
5. Download backup codes and store securely
6. Consider adding hardware security key
```

### 2. Create Google Cloud Project

Even though Firebase creates a GCP project, you may want to verify access:

```
1. Go to https://console.cloud.google.com
2. Login with new admin account
3. Verify you can create projects
4. Note: Billing account may be needed (can add later)
```

### 3. Set Up Payment Method (If Required)

```
1. Go to Firebase Console > Project Settings > Usage and billing
2. Add payment method (credit card)
3. Set up billing alerts:
   - Alert at 50% of budget
   - Alert at 90% of budget
   - Alert at 100% of budget
4. Recommended budget: €50-100/month (adjust based on usage)
```

---

## Service-by-Service Migration

### Step 1: Firebase Project Transfer

**Complexity:** ★★★★☆ (Most Complex)  
**Estimated Time:** 2-4 hours  
**Downtime:** 5-10 minutes (during final switch)

#### Option A: Transfer Existing Project (Recommended)

**Prerequisites:**
- Current owner must initiate transfer
- New owner must accept transfer
- Both accounts need access to email

**Steps:**

1. **Add New Owner as Editor (Current Owner Action)**
   ```
   1. Login to Firebase Console as current owner
   2. Go to project: https://console.firebase.google.com/project/fxnr-web
   3. Click gear icon > Project settings
   4. Go to "Users and permissions" tab
   5. Click "Add member"
   6. Enter new admin email
   7. Select role: "Editor" (or "Owner" if allowed)
   8. Click "Add member"
   ```

2. **Verify New Owner Access**
   ```
   1. New owner checks email for invitation
   2. Click "Accept invitation"
   3. Login to Firebase Console
   4. Verify you can see project: fxnr-web
   5. Navigate through: Firestore, Functions, Hosting
   6. Don't make any changes yet!
   ```

3. **Transfer Project Ownership**
   ```
   Method 1: Via Firebase Console
   1. Current owner: Project settings > Users and permissions
   2. Find new owner in list
   3. Click three dots > "Change role" > "Owner"
   4. Confirm transfer
   
   Method 2: Contact Firebase Support
   - If direct transfer not available, contact support
   - Provide project ID: fxnr-web
   - Request ownership transfer
   - Verify both current and new owner identities
   ```

4. **Remove Previous Owner (After Verification)**
   ```
   1. Wait 24-48 hours to ensure everything works
   2. New owner: Project settings > Users and permissions
   3. Find previous owner
   4. Click three dots > "Remove member"
   5. Confirm removal
   ```

#### Option B: Create New Project and Migrate Data

**Only if Option A fails - More complex and has downtime**

This is not recommended as primary approach. Document separately if needed.

#### Firebase Functions Migration

**Update Environment Variables:**

```bash
# Login as new owner
firebase login

# Select project
firebase use fxnr-web

# Set environment variables (non-secret)
cd functions

# Create new .env file
cp .env.example .env

# Edit .env with actual values
nano .env  # or vim, code, etc.

# Set secrets (critical!)
firebase functions:secrets:set RECAPTCHA_SECRET
# Enter the reCAPTCHA secret when prompted

# If using email password in secret manager
firebase functions:secrets:set EMAIL_PASSWORD
# Enter Gmail app password when prompted

# Redeploy functions to update with new owner
firebase deploy --only functions
```

**Verify Functions:**
```bash
# Test functions
curl https://europe-north1-fxnr-web.cloudfunctions.net/bookings

# Check logs
firebase functions:log

# Monitor in console
# https://console.firebase.google.com/project/fxnr-web/functions
```

#### Firebase Hosting Migration

**Update Domain Ownership:**

```
1. Firebase Console > Hosting
2. Verify domain: fixnero.fi
3. If domain verification fails:
   - Go to domain registrar
   - Verify TXT record still exists
   - Re-verify in Firebase
4. Test deployment:
   firebase deploy --only hosting
```

---

### Step 2: Google Calendar Migration

**Complexity:** ★★★☆☆  
**Estimated Time:** 1-2 hours  
**Downtime:** None (if done carefully)

#### Create New Booking Calendar

**Option A: Transfer Existing Calendar**

```
1. Current Owner:
   - Go to https://calendar.google.com
   - Find booking calendar
   - Settings and sharing > Share with specific people
   - Add new admin email with "Make changes AND manage sharing" permission
   
2. New Owner:
   - Check email for calendar sharing invitation
   - Accept invitation
   - Verify you can see all bookings
   - Test creating a test event
   - Delete test event
   
3. Transfer Ownership:
   - Current owner: Calendar settings > Access permissions
   - Find new admin
   - Change permission to "Make changes and manage sharing"
   - Note: Full ownership transfer may require Google Workspace
   
4. Update Service Account:
   - Stay with current calendar ID (easiest)
   - Or create new calendar and update GOOGLE_CALENDAR_ID
```

**Option B: Create New Calendar**

```
1. New Owner:
   - Go to https://calendar.google.com
   - Click "+" next to "Other calendars"
   - Select "Create new calendar"
   - Name: "Rajala Services - Varaukset" (Bookings)
   - Time zone: "Europe/Helsinki"
   - Create calendar
   
2. Get Calendar ID:
   - Click calendar > Settings and sharing
   - Scroll to "Integrate calendar"
   - Copy Calendar ID (format: xxxxxx@group.calendar.google.com)
   
3. Share with Service Account:
   - Settings and sharing > Share with specific people
   - Add service account email (from service-account.json)
   - Permission: "Make changes to events"
   - Save
   
4. Update Environment Variable:
   GOOGLE_CALENDAR_ID=new_calendar_id@group.calendar.google.com
   
5. Redeploy functions:
   firebase deploy --only functions
```

#### Create New Service Account (Recommended)

```bash
# Go to Google Cloud Console
# https://console.cloud.google.com

# 1. Enable Calendar API
gcloud services enable calendar-json.googleapis.com --project=fxnr-web

# 2. Create Service Account
gcloud iam service-accounts create rajala-calendar-service \
    --description="Service account for Rajala Services calendar integration" \
    --display-name="Rajala Calendar Service" \
    --project=fxnr-web

# 3. Create and download key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=rajala-calendar-service@fxnr-web.iam.gserviceaccount.com

# 4. Minify JSON (remove whitespace)
cat service-account-key.json | jq -c '.' > service-account-minified.json

# 5. Set as environment variable
# Copy content of service-account-minified.json
# Add to functions/.env:
# GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# 6. Secure the key files
chmod 600 service-account-*.json
# Move to secure location or delete after setting env var
```

---

### Step 3: Google Analytics Migration

**Complexity:** ★★☆☆☆  
**Estimated Time:** 30-60 minutes  
**Downtime:** None

#### Transfer Existing GA4 Property

```
1. Current Owner:
   - Go to https://analytics.google.com
   - Select account and property
   - Click "Admin" (gear icon)
   - Account Access Management
   - Click "+" > "Add users"
   - Enter new admin email
   - Check "Administrator" role
   - Notify by email
   - Add
   
2. New Owner:
   - Check email for Google Analytics invitation
   - Accept invitation
   - Login to analytics.google.com
   - Verify you can see data
   - Admin > Property settings > verify access
   
3. Transfer Ownership:
   - Current owner: Admin > Account Access Management
   - Find new admin
   - Verify "Administrator" role is set
   - Current owner can remain as admin or be removed later
```

**No Code Changes Needed:**
- Measurement ID remains the same: G-SP5R1MN1H9
- Website code unchanged
- Continue tracking without interruption

---

### Step 4: Google reCAPTCHA Migration

**Complexity:** ★★★☆☆  
**Estimated Time:** 30-45 minutes  
**Downtime:** 5-10 minutes (during key update)

#### Option A: Transfer Existing Keys

```
1. Current Owner:
   - Go to https://www.google.com/recaptcha/admin
   - Find site: fixnero.fi
   - Settings (gear icon)
   - Add new admin email under "Owners"
   - Save
   
2. New Owner:
   - Access https://www.google.com/recaptcha/admin
   - Verify you can see site
   - Verify you can see site and secret keys
   - **Don't regenerate keys yet!**
```

#### Option B: Create New reCAPTCHA Keys (If Transfer Fails)

```
1. New Owner:
   - Go to https://www.google.com/recaptcha/admin/create
   - Label: "Fixnero Website"
   - reCAPTCHA type: reCAPTCHA v3
   - Domains:
     * fixnero.fi
     * www.fixnero.fi
     * fixnero.fi (legacy)
     * localhost (for testing)
   - Accept terms
   - Submit
   
2. Get Keys:
   - Copy Site Key (public)
   - Copy Secret Key (private)
   
3. Update Website Code:
   - Edit booking-system.js:
     const RECAPTCHA_SITE_KEY = 'NEW_SITE_KEY_HERE';
   - Edit index.html (reCAPTCHA script tag):
     https://www.google.com/recaptcha/api.js?render=NEW_SITE_KEY_HERE
   
4. Update Secret:
   firebase functions:secrets:set RECAPTCHA_SECRET
   # Enter new secret key when prompted
   
5. Deploy Changes:
   git add booking-system.js index.html
   git commit -m "Update reCAPTCHA keys for new owner"
   git push
   firebase deploy --only hosting,functions
   
6. Test:
   - Visit website
   - Try to make a booking
   - Verify reCAPTCHA works (check browser console)
   - Verify booking succeeds
```

---

### Step 5: Email Account Migration

**Complexity:** ★★☆☆☆  
**Estimated Time:** 30-45 minutes  
**Downtime:** None (if done during off-hours)

#### Option A: Use New Gmail Account

```
1. Create New Gmail Account:
   - Go to gmail.com
   - Create new account: bookings@fixnero.fi (or similar)
   - Use business email if available
   - Enable 2FA
   
2. Enable SMTP Access:
   - Gmail settings > Forwarding and POP/IMAP
   - Enable IMAP
   - Save changes
   
3. Create App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter: "Rajala Services Booking System"
   - Generate
   - Copy 16-character password
   - Save securely
   
4. Update Environment Variables:
   EMAIL_USER=bookings@fixnero.fi
   EMAIL_PASSWORD=<16-char-app-password>
   EMAIL_FROM=Rajala Services <noreply@fixnero.fi>
   
5. Update Firebase Functions:
   # Option 1: Use .env file
   cd functions
   nano .env
   # Add EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
   
   # Option 2: Use Secret Manager (more secure)
   firebase functions:secrets:set EMAIL_PASSWORD
   
6. Redeploy:
   firebase deploy --only functions
   
7. Test:
   - Trigger test booking
   - Check email delivery
   - Verify email format and content
```

#### Option B: Use Custom Domain Email (Advanced)

If you have Google Workspace or other email hosting:

```
1. Create email: bookings@fixnero.fi
2. Follow similar steps as Option A
3. Configure SMTP settings for your provider
4. Update environment variables
```

---

### Step 6: Domain Management

**Complexity:** ★★☆☆☆  
**Estimated Time:** 15-30 minutes  
**Downtime:** None

```
1. Identify Current Domain Registrar:
   - Go to https://who.is/whois/fixnero.fi
   - Note registrar name
   - Login to registrar account
   
2. Verify DNS Settings:
   - Check DNS records for:
     * A record or CNAME for fixnero.fi
     * TXT records for Firebase verification
     * TXT records for Google verification
   
3. Transfer Registrar Account (if needed):
   - Option A: Change account email to new admin
   - Option B: Transfer domain to new registrar account
   - Option C: Add new admin as user
   
4. Document DNS Settings:
   - Export zone file if possible
   - Screenshot all DNS records
   - Save registrar login credentials
```

---

## Post-Migration Verification

### Verification Checklist

**Immediate Testing (Within 1 Hour):**

- [ ] Website loads correctly
  - [ ] https://fixnero.fi accessible
  - [ ] All pages load
  - [ ] Images and fonts display
  - [ ] Mobile responsive

- [ ] Booking system works
  - [ ] Calendar displays available times
  - [ ] Can select services
  - [ ] Form validation works
  - [ ] reCAPTCHA executes
  - [ ] Booking submission succeeds

- [ ] Backend services operational
  - [ ] Firestore saves new bookings
  - [ ] Cloud Functions execute
  - [ ] Calendar events created
  - [ ] Confirmation emails sent

- [ ] Analytics tracking
  - [ ] GA4 receives page views
  - [ ] Events tracked (if configured)
  - [ ] Real-time data visible

**Extended Testing (Within 24 Hours):**

- [ ] Monitor Firebase logs
  - [ ] No function errors
  - [ ] No authentication failures
  - [ ] No database errors

- [ ] Test edge cases
  - [ ] Multiple simultaneous bookings
  - [ ] International phone numbers
  - [ ] Special characters in names
  - [ ] Different time zones

- [ ] Verify data integrity
  - [ ] Compare booking counts before/after
  - [ ] Verify no data loss
  - [ ] Check calendar sync accuracy

**Week 1 Monitoring:**

- [ ] Daily analytics review
- [ ] Daily error log review
- [ ] Customer feedback collection
- [ ] Performance metrics tracking

### Testing Script

Create this test script to automate verification:

```bash
#!/bin/bash
# Migration Verification Test Script
# Run this after migration to verify all services

echo "=== Rajala Services Migration Verification ==="
echo "Started: $(date)"
echo ""

# Test 1: Website Accessibility
echo "Test 1: Website Accessibility"
response=$(curl -s -o /dev/null -w "%{http_code}" https://fixnero.fi)
if [ "$response" -eq 200 ]; then
    echo "✅ Website is accessible (HTTP $response)"
else
    echo "❌ Website error (HTTP $response)"
fi
echo ""

# Test 2: Functions Endpoint
echo "Test 2: Cloud Functions"
response=$(curl -s -o /dev/null -w "%{http_code}" https://europe-north1-fxnr-web.cloudfunctions.net/bookings)
if [ "$response" -eq 200 ]; then
    echo "✅ Functions responding (HTTP $response)"
else
    echo "❌ Functions error (HTTP $response)"
fi
echo ""

# Test 3: DNS Resolution
echo "Test 3: DNS Resolution"
if dig fixnero.fi +short | grep -q "[0-9]"; then
    echo "✅ DNS resolves correctly"
else
    echo "❌ DNS resolution failed"
fi
echo ""

# Test 4: SSL Certificate
echo "Test 4: SSL Certificate"
if echo | openssl s_client -servername fixnero.fi -connect fixnero.fi:443 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✅ SSL certificate valid"
else
    echo "❌ SSL certificate issue"
fi
echo ""

echo "=== Verification Complete ==="
echo "Completed: $(date)"
echo ""
echo "Next steps:"
echo "1. Review any failed tests above"
echo "2. Test booking submission manually"
echo "3. Verify email delivery"
echo "4. Check Google Analytics"
echo "5. Monitor Firebase logs"
```

Save as `verify-migration.sh` and run:
```bash
chmod +x verify-migration.sh
./verify-migration.sh
```

---

## Rollback Procedures

### When to Rollback

Consider rollback if:
- Critical functionality broken
- Data loss detected
- Unable to resolve errors within 2 hours
- Customer-facing issues severe

### Rollback Steps

#### Immediate Rollback (Within 1 Hour of Migration)

**If Firebase Transfer Failed:**

```
1. Remove new owner from project:
   - Current owner logs into Firebase Console
   - Project settings > Users and permissions
   - Remove new owner
   
2. Revert any code changes:
   git revert <commit-hash>
   git push
   firebase deploy --only hosting,functions
   
3. Restore environment variables:
   - Use backed up functions/.env
   - Restore secrets from secure backup
   firebase functions:secrets:set RECAPTCHA_SECRET
```

**If Calendar Issues:**

```
1. Revert to old calendar:
   - Update GOOGLE_CALENDAR_ID to original value
   - Redeploy functions
   
2. Remove new service account:
   - Calendar settings > Remove access
   
3. Restore original service account:
   - Re-add original service account
   - Verify permissions
```

**If reCAPTCHA Issues:**

```
1. Revert code changes:
   git revert <commit-hash>
   
2. Restore original secret:
   firebase functions:secrets:set RECAPTCHA_SECRET
   # Enter original secret
   
3. Redeploy:
   firebase deploy --only hosting,functions
```

#### Database Restore (If Data Lost)

```bash
# Import from backup
gcloud firestore import gs://fxnr-web-backup/firestore-backup-YYYYMMDD

# Or via Firebase Console
# Firestore > Import/Export > Import
# Select backup location
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Permission Denied" in Firebase Console

**Cause:** Insufficient permissions for new owner

**Solution:**
```
1. Current owner adds new owner as "Owner" role
2. Wait 5-10 minutes for propagation
3. New owner refreshes console
4. If still failing, contact Firebase Support
```

#### Issue: Functions Deployment Fails

**Cause:** Missing environment variables or secrets

**Solution:**
```
1. Verify .env file exists in functions/
2. Check all required variables present:
   cat functions/.env
3. Verify secrets set:
   firebase functions:secrets:access RECAPTCHA_SECRET
4. Redeploy:
   firebase deploy --only functions --debug
```

#### Issue: Calendar Events Not Creating

**Cause:** Service account lacks permissions

**Solution:**
```
1. Go to Google Calendar
2. Settings > Share with specific people
3. Find service account email
4. Ensure permission: "Make changes to events"
5. Try creating test event via functions
```

#### Issue: Emails Not Sending

**Cause:** App password incorrect or SMTP blocked

**Solution:**
```
1. Generate new app password
2. Update EMAIL_PASSWORD
3. Verify SMTP enabled in Gmail settings
4. Check function logs:
   firebase functions:log --only onBookingCreated
5. Test with simple nodemailer script
```

#### Issue: reCAPTCHA Verification Fails

**Cause:** Site key or secret key mismatch

**Solution:**
```
1. Verify site key in booking-system.js matches admin console
2. Verify secret key set correctly:
   firebase functions:secrets:access RECAPTCHA_SECRET
3. Check browser console for errors
4. Verify domain added to reCAPTCHA allowed list
```

#### Issue: Website Shows Old Version

**Cause:** CDN caching or deployment issue

**Solution:**
```
1. Force cache clear:
   - Ctrl+Shift+R in browser
   - Or incognito mode
2. Verify deployment:
   firebase hosting:channel:list
3. Redeploy if needed:
   firebase deploy --only hosting
```

### Getting Help

**Firebase Support:**
- Console: https://console.firebase.google.com/support
- Community: https://firebase.google.com/support
- Email: firebase-support@google.com

**Google Cloud Support:**
- Console: https://console.cloud.google.com/support
- Documentation: https://cloud.google.com/docs

**Community Resources:**
- Stack Overflow: [firebase], [google-cloud-functions]
- Firebase Discord: https://discord.gg/firebase
- Reddit: r/Firebase

---

## Success Criteria

Migration is considered successful when:

- [ ] All services accessible by new owner
- [ ] No customer-facing errors for 24 hours
- [ ] Website fully functional
- [ ] Bookings creating correctly
- [ ] Emails sending reliably
- [ ] Calendar syncing properly
- [ ] Analytics tracking active
- [ ] No data loss verified
- [ ] Old owner access revoked (after grace period)
- [ ] Documentation updated
- [ ] Team trained on new access

---

## Post-Migration Tasks

### Week 1
- [ ] Daily monitoring of logs and analytics
- [ ] Document any issues and resolutions
- [ ] Collect feedback from users
- [ ] Verify billing charges are as expected

### Month 1
- [ ] Review access logs
- [ ] Update contact information
- [ ] Review and optimize performance
- [ ] Schedule first backup verification

### Ongoing
- [ ] Quarterly security review
- [ ] Regular backups (automated)
- [ ] Access review (remove unused accounts)
- [ ] Credential rotation schedule

---

## Conclusion

This migration, while complex, is achievable with careful planning and execution. The key is:

1. **Thorough Preparation** - Back up everything
2. **Methodical Execution** - Follow steps exactly
3. **Comprehensive Testing** - Verify each component
4. **Clear Communication** - Keep stakeholders informed
5. **Have Rollback Ready** - Be prepared to revert

**Estimated Success Rate:** 90%+ with proper preparation

**Next Document:** See `ADMINISTRATOR_SETUP_GUIDE.md` for detailed instructions on managing the system after migration.

---

**Document Prepared By:** GitHub Copilot Coding Agent  
**Review Status:** Ready for Review  
**Last Updated:** January 13, 2026
