# External Integrations Migration - README

## 📋 Quick Start

This repository contains the complete migration from old Webbi1 Firebase project to new company-owned accounts for all external integrations.

## ✅ What's Done

All code changes are **COMPLETE** and ready for deployment:

- ✅ reCAPTCHA v3 updated to new credentials
- ✅ Firestore security rules created with new service accounts
- ✅ Google Analytics already using new account (no changes needed)
- ✅ Comprehensive documentation created

## ⏳ What's Needed

The **administrator** needs to complete the following tasks (estimated 60 minutes total):

1. Create calendar service account
2. Configure Firebase Functions secrets
3. Share Google Calendar with service accounts
4. Deploy Firestore rules
5. Configure reCAPTCHA domains
6. Install Firebase Email Extension
7. Test the system

## 📚 Documentation Guide

### For Administrators (Start Here)

1. **[MIGRATION_IMPLEMENTATION_SUMMARY.md](./MIGRATION_IMPLEMENTATION_SUMMARY.md)**
   - Read this first for quick overview
   - Shows what changed and what's needed
   - Estimated time: 5 minutes

2. **[DEPLOYMENT_CHECKLIST_MIGRATION.md](./DEPLOYMENT_CHECKLIST_MIGRATION.md)**
   - Step-by-step deployment guide
   - Use this during deployment
   - Check off each step as you complete it
   - Estimated time: 60 minutes to complete all steps

3. **[CREDENTIALS_QUICK_REFERENCE.md](./CREDENTIALS_QUICK_REFERENCE.md)**
   - Quick reference for all credentials and URLs
   - Keep this handy during deployment
   - Good for copy-paste commands

### Detailed Technical Guides

4. **[NEW_COMPANY_MIGRATION_GUIDE.md](./NEW_COMPANY_MIGRATION_GUIDE.md)**
   - Complete technical migration guide
   - Detailed explanations of all changes
   - Use for deep understanding

5. **[SERVICE_ACCOUNTS_SETUP.md](./SERVICE_ACCOUNTS_SETUP.md)**
   - How to create and configure service accounts
   - Permissions and access control
   - Troubleshooting guide

## 🔑 Key Credentials

### Public (In Code)
- reCAPTCHA Site Key: `6Lf7wx0sAAAAAK2mvnbNt3V6lINTfu0g9Mw8Flcr`
- Google Analytics: `G-SP5R1MN1H9`
- Firebase Project: `Webbi1`

### Private (Must Configure)
- reCAPTCHA Secret: `6Lf7wx0sAAAAAIZrJ_IIHzkZUHKO0GCx6moRlf96`
- Calendar service account key (to be created)
- Email credentials (info@fixnero.fi)

## 🎯 Critical Information

### From Problem Statement

**Calendar Owner**: palvelut@fixnero.fi

**Service Accounts Needed**:
1. `calendar@Webbi1.iam.gserviceaccount.com` (create manually)
2. `{number}-compute@developer.gserviceaccount.com` (auto-created)
3. `ext-firestore-send-email@Webbi1.iam.gserviceaccount.com` (from extension)

**Firestore Security Rules**: Now include updated service account references

**Two-Way Calendar Sync**: 
- Website booking → Google Calendar ✅
- Google Calendar → Website booking ✅

## 📋 Files Changed in This PR

### Code Files
- `booking-system.js` - Updated reCAPTCHA site key
- `booking-system.min.js` - Updated reCAPTCHA site key
- `index.html` - Updated reCAPTCHA script tag
- `scripts/validate-services.sh` - Updated validation

### New Files
- `firestore.rules` - Security rules with new service accounts
- `docs/MIGRATION_IMPLEMENTATION_SUMMARY.md` - This summary
- `docs/NEW_COMPANY_MIGRATION_GUIDE.md` - Complete guide
- `docs/DEPLOYMENT_CHECKLIST_MIGRATION.md` - Deployment steps
- `docs/SERVICE_ACCOUNTS_SETUP.md` - Service account guide
- `docs/CREDENTIALS_QUICK_REFERENCE.md` - Quick reference

## 🚀 Deployment Order

Follow this sequence:

1. **Read Documentation** (10 min)
   - Read MIGRATION_IMPLEMENTATION_SUMMARY.md
   - Review DEPLOYMENT_CHECKLIST_MIGRATION.md

2. **Prepare** (15 min)
   - Create calendar service account
   - Generate service account key
   - Create Gmail app password

3. **Configure** (15 min)
   - Set Firebase Functions secrets
   - Share Google Calendar
   - Configure reCAPTCHA domains

4. **Deploy** (10 min)
   - Deploy Firestore rules
   - (Optional) Redeploy functions if needed

5. **Test** (20 min)
   - Test booking creation
   - Test email sending
   - Test calendar sync
   - Test Google Analytics

**Total**: ~60-70 minutes

## ⚠️ Important Notes

### Security
- ⚠️ Never commit service account keys to Git
- ⚠️ Delete `calendar-key.json` after uploading to Firebase
- ⚠️ Store all credentials in password manager
- ✅ Secrets use Firebase Functions Secret Manager

### GDPR Compliance
- ✅ Cookie consent maintained
- ✅ User data encrypted (HTTPS/TLS)
- ✅ Service accounts follow least privilege
- ✅ Email confirmations only to user's email

### Testing
- Test on staging environment first if available
- Test all features before announcing to users
- Monitor Firebase Functions logs during testing
- Keep rollback plan ready

## 🆘 Troubleshooting

### Quick Checks

**reCAPTCHA not working?**
- Verify site key matches in code and admin console
- Check domains are whitelisted
- Check secret is set in Firebase Functions

**Email not sending?**
- Check EMAIL_USER and EMAIL_PASSWORD in Firebase Functions
- Verify Gmail app password is correct
- Check Firebase Email Extension is installed
- Review Functions logs for errors

**Calendar not syncing?**
- Verify service accounts have calendar access
- Check GOOGLE_CALENDAR_ID is set
- Verify GOOGLE_SERVICE_ACCOUNT contains valid JSON
- Check Calendar API is enabled

**Permission errors?**
- Deploy Firestore rules
- Verify service account emails in rules
- Check service accounts exist and have permissions

### Get Help

1. Check documentation in `docs/` directory
2. Review Firebase Functions logs
3. Check error messages in browser console
4. Verify configuration in admin consoles

## 📞 Contact

**Company Information**:
- Website: fixnero.fi
- Email: info@fixnero.fi
- Phone: +358401935001
- Calendar: palvelut@fixnero.fi

**Technical Resources**:
- Firebase Console: https://console.firebase.google.com/project/Webbi1
- Google Cloud Console: https://console.cloud.google.com/home/dashboard?project=Webbi1
- reCAPTCHA Admin: https://www.google.com/recaptcha/admin
- Google Analytics: https://analytics.google.com

## ✅ Success Criteria

Migration is successful when:

- [ ] All code deployed to production
- [ ] Service accounts created and configured
- [ ] Secrets set in Firebase Functions
- [ ] Firestore rules deployed
- [ ] Test booking completes successfully
- [ ] Email confirmation received
- [ ] Calendar event created
- [ ] Google Analytics tracking verified
- [ ] No errors in production logs
- [ ] Mobile devices tested

## 📝 Next Steps

1. **Review all documentation** in this directory
2. **Follow DEPLOYMENT_CHECKLIST_MIGRATION.md** step by step
3. **Test thoroughly** before announcing
4. **Monitor** for 24-48 hours after deployment
5. **Document any issues** encountered
6. **Update credentials** in password manager

---

**Version**: 1.0  
**Date**: 2026-01-13  
**Status**: Ready for Deployment  
**Estimated Deployment Time**: 60 minutes

Good luck with the deployment! 🚀
