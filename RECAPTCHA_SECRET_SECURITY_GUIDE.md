# reCAPTCHA Secret Key Security and Deployment Guide

This document provides a comprehensive guide for securing reCAPTCHA secret keys and deploying Firebase Functions with proper secret management.

## Security Verification Summary

### ✅ Current Security Status

**Verified Secure Implementations:**
- ✅ No hardcoded reCAPTCHA secrets in repository
- ✅ Code uses Firebase Gen2 `defineString('RECAPTCHA_SECRET')` pattern
- ✅ `.gitignore` properly excludes `.env` and sensitive files
- ✅ Example configuration files use placeholder values
- ✅ Secret accessed at runtime via `recaptchaSecret.value()`
- ✅ Site keys (public) properly used in frontend code
- ✅ Server-side validation implemented in Cloud Functions

**Files Checked:**
- `functions/index.js` - Uses proper Gen2 parameter approach
- `functions/.env.example` - Contains safe placeholder values
- `.gitignore` - Excludes all sensitive files
- `booking-system.js` - Only contains public site key
- `index.html` - Only contains public site key

## reCAPTCHA Keys Overview

### Site Key (Public) ✅
**Current Site Key**: `6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM`

**Note**: This is the actual production site key registered for `rajala-services.com` domains.

**Safe to expose:**
- ✅ Used in frontend HTML/JavaScript
- ✅ Committed to repository
- ✅ Visible in browser source code

**Locations:**
- `index.html`: reCAPTCHA script tag
- `booking-system.js`: `RECAPTCHA_SITE_KEY` constant

### Secret Key (Private) 🔒
**NEVER commit to repository**

**Secure storage:**
- Production: Firebase Secrets or Environment Variables
- Local Development: `functions/.env` (gitignored)

**Current Implementation:**
```javascript
// functions/index.js
const { defineString } = require('firebase-functions/params');
const recaptchaSecret = defineString('RECAPTCHA_SECRET');

// Access at runtime
const secretKey = recaptchaSecret.value();
```

## Deployment Guide

### Prerequisites

1. **Firebase CLI** installed and authenticated:
```bash
npm install -g firebase-tools
firebase login
```

2. **reCAPTCHA Keys** registered at https://www.google.com/recaptcha/admin
   - Site Key: Already configured in code
   - Secret Key: Obtained from admin console

3. **Firebase Project** selected:
```bash
firebase use your-project-id
```

### Step 1: Configure Production Secrets

**Recommended Method: Firebase Secrets (Gen2)**

```bash
# Set reCAPTCHA secret
firebase functions:secrets:set RECAPTCHA_SECRET
# When prompted, enter your reCAPTCHA secret key

# Verify it's set
firebase functions:secrets:access RECAPTCHA_SECRET
```

**Alternative Method: Environment Variables**

```bash
# Set via functions config
firebase functions:config:set RECAPTCHA_SECRET="your_secret_key_here"

# Verify configuration
firebase functions:config:get
```

### Step 2: Configure Optional Secrets

```bash
# Google Calendar integration (optional)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
firebase functions:secrets:set GOOGLE_CALENDAR_ID
```

### Step 3: Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:book

# Deploy with specific project
firebase deploy --only functions --project your-project-id
```

### Step 4: Verify Deployment

```bash
# Check function logs
firebase functions:log --only book

# Test the endpoint
curl https://us-central1-your-project-id.cloudfunctions.net/bookings
```

## Local Development Setup

### 1. Create .env File

```bash
cd functions
cp .env.example .env
```

### 2. Add Your Test Secrets

Edit `functions/.env`:

```env
# reCAPTCHA Secret Key (use TEST key, not production)
RECAPTCHA_SECRET=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Service Account (optional for local testing)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Google Calendar ID (optional for local testing)
GOOGLE_CALENDAR_ID=test-calendar@group.calendar.google.com
```

**Important:**
- Use TEST reCAPTCHA keys for development
- NEVER copy production secrets to local `.env`
- The `.env` file is already in `.gitignore`

### 3. Start Local Emulator

```bash
# From project root
firebase emulators:start

# Access at:
# - Functions: http://localhost:5001
# - Firestore: http://localhost:8080
# - Emulator UI: http://localhost:4000
```

## Security Checklist

### Before Every Commit

- [ ] Run `git status --ignored` to verify `.env` is not staged
- [ ] Search codebase for exposed secrets: `grep -r "6L[a-zA-Z0-9_-]{38}" .`
- [ ] Verify only example files contain placeholder values
- [ ] Check that actual secret values are not in any files

### Before Deployment

- [ ] Secrets are configured in Firebase (not hardcoded)
- [ ] Production secrets are different from test secrets
- [ ] `.gitignore` includes all sensitive files
- [ ] Example files use safe placeholder values
- [ ] Functions logs don't expose secrets
- [ ] Error messages don't leak secret information

### After Deployment

- [ ] Test reCAPTCHA verification with production site
- [ ] Verify bookings work correctly
- [ ] Check Firebase Functions logs for errors
- [ ] Monitor reCAPTCHA admin console for usage
- [ ] Confirm no secrets in browser console/network tab

## Files That Should NEVER Be Committed

```
# Already in .gitignore
*.env
functions/.env
functions/.runtimeconfig.json
functions/service-account.json
*service-account*.json
.firebase/

# Additional files to watch for
service-account-key.json
firebase-service-account.json
*-key.json (service account keys)
```

### Verify .gitignore

```bash
# Check what's ignored
git status --ignored

# Check if any sensitive files are tracked
git ls-files | grep -E '\.env$|service-account|runtimeconfig'

# Should return empty (no results)
```

## Incident Response

### If Secret Key is Accidentally Committed

**Immediate Actions:**

1. **Revoke the compromised key:**
   - Go to https://www.google.com/recaptcha/admin
   - Delete the compromised site key
   - Create a new site key immediately

2. **Update Firebase configuration:**
```bash
# Set new secret
firebase functions:secrets:set RECAPTCHA_SECRET
# Enter new secret key when prompted

# Deploy immediately
firebase deploy --only functions
```

3. **Update frontend (if site key changed):**
```javascript
// booking-system.js
const RECAPTCHA_SITE_KEY = 'NEW_SITE_KEY_HERE';
```
```html
<!-- index.html -->
<script src="https://www.google.com/recaptcha/api.js?render=NEW_SITE_KEY_HERE"></script>
```

4. **Deploy frontend:**
```bash
firebase deploy --only hosting
```

5. **Remove from Git history** (if needed):
```bash
# WARNING: This rewrites history - coordinate with team
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch functions/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous)
git push --force --all
```

6. **Notify team and stakeholders**

### If Secret Key is Exposed in Logs

1. **Redact logs** in Firebase Console
2. **Review logging code** to prevent future exposure
3. **Rotate the secret key** as a precaution
4. **Update error handling** to avoid logging secrets

## Monitoring and Maintenance

### Regular Security Audits

**Monthly:**
- [ ] Review Firebase Functions logs for unusual activity
- [ ] Check reCAPTCHA admin console for score distribution
- [ ] Verify no new sensitive files in repository
- [ ] Review access logs for unauthorized access

**Quarterly:**
- [ ] Rotate reCAPTCHA keys
- [ ] Review and update security documentation
- [ ] Audit permissions on service accounts
- [ ] Test incident response procedures

**Annually:**
- [ ] Complete security review of entire system
- [ ] Update all API keys and secrets
- [ ] Review and update .gitignore
- [ ] Security training for team members

### Monitoring Commands

```bash
# Check recent function invocations
firebase functions:log --only book --lines 50

# Monitor in real-time
firebase functions:log --only book --follow

# Check secrets configuration
firebase functions:secrets:access RECAPTCHA_SECRET
```

## Best Practices Summary

### ✅ DO

- Use Firebase Secrets for production (Gen2 recommended)
- Use `.env` files for local development
- Keep `.gitignore` updated
- Rotate keys regularly
- Monitor logs for security issues
- Use different keys for dev/test/prod
- Document security procedures

### ❌ DON'T

- Commit secrets to Git (ever!)
- Use production secrets locally
- Share `.env` files via email/chat
- Log secret values
- Expose secrets in error messages
- Use same keys across environments
- Ignore security warnings

## Testing Secret Management

### Test 1: Verify Secrets Not in Repository

```bash
# Search for potential secrets (excluding legitimate parameter usage)
git grep -i "secret" | grep -v "defineString\|placeholder\|example\|SECRET_NAME\|RECAPTCHA_SECRET\|secretKey\|your_secret"

# Search for reCAPTCHA secret patterns (should only find site key)
git grep -E "6L[a-zA-Z0-9_-]{38}"

# Should only find site key (public), not secret key
```

### Test 2: Verify .gitignore Works

```bash
# Create test .env file
echo "RECAPTCHA_SECRET=test123" > functions/.env.test

# Check git status
git status

# functions/.env.test should NOT appear in untracked files
rm functions/.env.test
```

### Test 3: Verify Secrets Load Correctly

```bash
# Start emulator and check logs
firebase emulators:start

# Should see:
# ✔ functions[us-central1-book]: http function initialized
# (no "secret not configured" errors)
```

## Additional Resources

- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Git Secrets Detection](https://github.com/awslabs/git-secrets)
- [Environment Variables Best Practices](https://firebase.google.com/docs/functions/config-env)

## Support

For security concerns:
1. Review this documentation
2. Check Firebase Functions logs
3. Verify reCAPTCHA admin console
4. Contact development team lead
5. Report security incidents immediately

---

**Last Updated**: 2025-11-23
**Security Review**: Passed ✅
**Firebase Functions**: Gen2
**Classification**: Internal Use Only
