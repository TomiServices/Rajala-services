# reCAPTCHA Implementation Flow

## Current Implementation: FREE reCAPTCHA v2 (Checkbox)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER BOOKING FLOW                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Browser    │
│  (Frontend)  │
└──────┬───────┘
       │
       │ 1. User navigates to booking section
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  index.html - Booking Form                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Lazy-load reCAPTCHA script when user scrolls           │ │
│  │    Script: https://www.google.com/recaptcha/api.js        │ │
│  │                                                            │ │
│  │  • Render reCAPTCHA widget:                               │ │
│  │    <div class="g-recaptcha"                               │ │
│  │         data-sitekey="6LdmOggsAAAA...">                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 2. User fills form and checks reCAPTCHA
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  booking-system.js - Client-side Validation                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Check if grecaptcha is loaded:                        │ │
│  │     if (typeof grecaptcha === 'undefined')                │ │
│  │                                                            │ │
│  │  2. Get reCAPTCHA response token:                         │ │
│  │     const token = grecaptcha.getResponse();               │ │
│  │                                                            │ │
│  │  3. Validate token exists:                                │ │
│  │     if (!token) → Show error                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 3. Submit booking with token
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Firebase Cloud Function (Backend)                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /book                                                │ │
│  │                                                            │ │
│  │  1. Receive booking data + reCAPTCHA token                │ │
│  │     { name, email, phone, services, recaptcha }           │ │
│  │                                                            │ │
│  │  2. Verify reCAPTCHA token:                               │ │
│  │     POST https://www.google.com/recaptcha/api/siteverify  │ │
│  │     params: {                                             │ │
│  │       secret: RECAPTCHA_SECRET,  // from Firebase config  │ │
│  │       response: recaptcha         // user's token         │ │
│  │     }                                                      │ │
│  │                                                            │ │
│  │  3. Check verification response:                          │ │
│  │     if (!success) → Return 401 Unauthorized               │ │
│  │                                                            │ │
│  │  4. Process booking if validation passes                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 4. Return response to frontend
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Frontend Response Handling                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Success: Display confirmation, send email              │ │
│  │  • Failure: Display error message                         │ │
│  │  • Reset: grecaptcha.reset() for new submission           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                     SECURITY VALIDATION                         │
└────────────────────────────────────────────────────────────────┘

Layer 1: CLIENT-SIDE VALIDATION
┌─────────────────────────────────────────────────────────────┐
│  • Check if reCAPTCHA widget loaded                         │
│  • Verify user completed reCAPTCHA challenge                │
│  • Prevent form submission if token missing                 │
│  Purpose: User experience, prevent accidental submissions   │
└─────────────────────────────────────────────────────────────┘
       │ Token passes to backend
       ▼
Layer 2: SERVER-SIDE VERIFICATION
┌─────────────────────────────────────────────────────────────┐
│  • Validate token with Google's API                         │
│  • Verify token hasn't expired (~2 min lifetime)            │
│  • Check token is for correct domain                        │
│  • Prevent bot submissions and replay attacks               │
│  Purpose: Security, prevent malicious bypassing             │
└─────────────────────────────────────────────────────────────┘
       │ All checks pass
       ▼
Layer 3: FIREBASE SECURITY
┌─────────────────────────────────────────────────────────────┐
│  • CORS validates request origin                            │
│  • Secret key stored in environment (not in code)           │
│  • HTTPS enforced for all communications                    │
│  Purpose: Infrastructure security                           │
└─────────────────────────────────────────────────────────────┘
```

---

## API Comparison: FREE v2 vs Enterprise

```
┌───────────────────────────────────────────────────────────────┐
│               FREE reCAPTCHA v2 (CURRENT)                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND:                                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Script: https://www.google.com/recaptcha/api.js         │ │
│  │ API: grecaptcha.getResponse()                           │ │
│  │ API: grecaptcha.reset()                                 │ │
│  │ Widget: <div class="g-recaptcha">                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  BACKEND:                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Endpoint: /recaptcha/api/siteverify                     │ │
│  │ Params: secret, response                                │ │
│  │ Returns: { success: true/false }                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  COST: $0/month ✅                                            │
└───────────────────────────────────────────────────────────────┘

                            VS

┌───────────────────────────────────────────────────────────────┐
│            reCAPTCHA Enterprise (NOT USED)                    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND:                                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Script: /recaptcha/enterprise.js                        │ │
│  │ API: grecaptcha.enterprise.execute()                    │ │
│  │ Widget: Different implementation                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  BACKEND:                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Endpoint: /recaptcha/api/siteverify?key=...             │ │
│  │ Enhanced scoring and analytics                          │ │
│  │ Returns: { success, score, reasons }                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  COST: Paid service ❌                                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Configuration Files

```
Repository Structure:
├── index.html                    ← reCAPTCHA widget
├── booking-system.js             ← Client validation
├── functions/
│   └── index.js.js               ← Server verification
├── firebase.json                 ← CSP headers, CORS
└── Documentation:
    ├── RECAPTCHA_CONFIGURATION.md         ← Setup guide
    ├── RECAPTCHA_MIGRATION_SUMMARY.md     ← Implementation details
    └── RECAPTCHA_VERIFICATION_CHECKLIST.md ← Testing guide
```

---

## Key Configuration Values

```yaml
Site Key (Public):
  Value: "6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM"
  Location: index.html (line 3566)
  Type: FREE reCAPTCHA v2 Checkbox
  
Secret Key (Private):
  Storage: Firebase Functions config
  Command: firebase functions:config:get recaptcha.secret
  ⚠️ NEVER commit to repository
  
Script URL:
  Frontend: https://www.google.com/recaptcha/api.js
  Verification: https://www.google.com/recaptcha/api/siteverify
  
Registered Domains:
  - rajala-services.com
  - www.rajala-services.com
  - fxnr-web.web.app (testing)
  - fxnr-web.firebaseapp.com (testing)
```

---

## Token Lifecycle

```
1. USER ACTION
   │
   ▼
2. WIDGET GENERATES TOKEN
   │ (Valid for ~2 minutes)
   ▼
3. SUBMIT TO BACKEND
   │
   ▼
4. BACKEND VERIFIES TOKEN
   │ → Success: Process booking
   │ → Failure: Return 401
   ▼
5. RESET WIDGET (if success)
   │ grecaptcha.reset()
   ▼
6. READY FOR NEXT SUBMISSION
```

---

## Error Flow

```
Possible Errors:

CLIENT-SIDE:
┌────────────────────────────────────────────┐
│ • "reCAPTCHA ei ole latautunut"           │ → Script failed to load
│ • "Vahvista että et ole robotti!"         │ → User didn't complete challenge
└────────────────────────────────────────────┘

SERVER-SIDE:
┌────────────────────────────────────────────┐
│ • 401 Unauthorized                         │ → Token verification failed
│ • "reCAPTCHA verification failed"          │ → Invalid/expired token
│ • "reCAPTCHA secret not configured"        │ → Missing secret key
└────────────────────────────────────────────┘

GOOGLE reCAPTCHA:
┌────────────────────────────────────────────┐
│ • "Invalid site key"                       │ → Wrong key or not registered
│ • "Invalid domain for site key"            │ → Domain not in allowed list
└────────────────────────────────────────────┘
```

---

## Monitoring Points

```
✅ Things to Monitor:

1. Client-side:
   • Script load time (should be < 1s)
   • Widget render success rate
   • User completion rate
   
2. Server-side:
   • Token verification success rate (should be > 95%)
   • Response time from Google API (should be < 500ms)
   • 401 error rate (low is good)
   
3. Business metrics:
   • Booking completion rate
   • Spam/bot booking rate (should be near 0)
   • User drop-off at reCAPTCHA step
```

---

## Quick Reference

**To test on production:**
1. Visit: https://www.rajala-services.com
2. Scroll to booking section
3. Fill form and check reCAPTCHA
4. Submit and verify success

**To verify configuration:**
```bash
# Check site key in code
grep "data-sitekey" index.html

# Check secret key in Firebase
firebase functions:config:get recaptcha.secret

# View function logs
firebase functions:log --only book
```

**Common commands:**
```bash
# Deploy to production
firebase deploy --only hosting,functions

# Test locally
firebase emulators:start

# View logs
firebase functions:log
```

---

**Documentation Version:** 1.0  
**Last Updated:** 2025-11-10  
**reCAPTCHA Type:** FREE v2 Checkbox  
**Status:** Active and Verified ✅
