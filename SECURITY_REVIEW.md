# Security Review – Rajala Services

> **Reviewed:** 2026-04-07  
> **Scope:** TomiServices/Rajala-services (main branch)  
> **Focus:** Firebase / Firestore, Cloud Functions (Gen 2), secrets management, input validation, logging

---

## 1. Repository Component Inventory

| Component | Location | Purpose |
|-----------|----------|---------|
| **Firebase Hosting** | `/` (root HTML/JS/CSS) | Static website served via Firebase Hosting |
| **Cloud Functions (Gen 2)** | `functions/index.js` | Backend: booking API, calendar sync, email dispatch |
| **Firestore** | `firestore.rules` | Database for bookings (`varaukset`), mail queue (`mail`), calendar watches (`calendarWatch`) |
| **Firebase Extensions** | configured in project | Trigger Email from Firestore (ext-firestore-send-email) |
| **GitHub Actions CI** | `.github/workflows/` | Node.js CI, GitHub Pages deploy, CodeQL scan |
| **Static frontend JS** | `static/js/booking-system.js` | Client-side booking form, calendar, reCAPTCHA v3 |
| **Google Calendar integration** | `functions/` | Webhook push notifications, watch renewal, sync |
| **SendGrid** | `functions/index.js` | Fallback email delivery when extension fails |
| **reCAPTCHA v3** | frontend + functions | Bot protection on booking form |
| **Nodemailer** | `functions/index.js` | SMTP transport (legacy fallback, partially disabled) |

### Data flow (simplified)

```
Browser  →  Firebase Hosting (static HTML/JS)
         →  Cloud Functions (HTTPS endpoints, europe-north1)
              ├── Firestore (varaukset, mail, calendarWatch)
              ├── Firebase Email Extension (mail collection)
              ├── SendGrid (fallback)
              └── Google Calendar API (webhook sync)
```

---

## 2. Threat Model & Attack Surfaces

### 2.1 Firestore (direct client access)

| Risk | Description |
|------|-------------|
| **Unauthenticated write** | A booking without an authenticated user would be blocked by current rules, but anonymous auth is not explicitly disabled. |
| **Over-permissive compute service account pattern** | Rule 5 in `varaukset` and `calendarWatch` matches any e-mail ending in `-compute@developer.gserviceaccount.com`. A compromised *different* GCP project's service account with that pattern could gain write access. |
| **Admin claim spoofing** | `request.auth.token.admin == true` relies on custom claims being set correctly; privilege escalation is possible if custom-claim assignment code has a bug or is accessible to untrusted parties. |
| **Mail collection exposure** | Writing arbitrary documents to `mail/` would trigger emails. Write is restricted to service accounts and admin users, which is good. |

### 2.2 Cloud Functions endpoints

| Risk | Description |
|------|-------------|
| **Input validation** | Functions accept JSON bodies from the internet. Malformed or oversized inputs could cause unexpected behaviour or DoS. |
| **CORS configuration** | CORS is configured via the `cors` npm package. Overly permissive CORS (`origin: true`) would allow any domain to call the API. |
| **reCAPTCHA bypass** | If the reCAPTCHA score threshold is too low, automated bookings could slip through. |
| **Rate limiting** | No function-level rate limiting is visible; Cloud Functions has project-level quotas, but no per-IP rate limiting. |
| **Calendar webhook validation** | `calendarWebhook` must verify the `X-Goog-Channel-Token` or similar header to reject forged push notifications. |

### 2.3 Secrets & credentials

| Risk | Description |
|------|-------------|
| **Secrets in source code** | No hardcoded secrets were found in the repository. Configuration is loaded via `firebase-functions/params` (Secret Manager) and environment variables. ✅ |
| **`CREDENTIALS_QUICK_REFERENCE.md`** | `docs/CREDENTIALS_QUICK_REFERENCE.md` exists and may describe where secrets live. Ensure it contains no actual secret values. |
| **Service account key files** | No `.json` key files were found in the repository. ✅ |

### 2.4 Hosting / static frontend

| Risk | Description |
|------|-------------|
| **CSP `unsafe-inline` / `unsafe-eval`** | The Content-Security-Policy in `firebase.json` allows `'unsafe-inline'` and `'unsafe-eval'` for scripts. This weakens XSS protection. |
| **reCAPTCHA token single-use** | Frontend correctly re-executes reCAPTCHA before every retry (see `MAX_BOOKING_ATTEMPTS`). ✅ |
| **Third-party scripts from CDN** | Scripts loaded from `cdn.jsdelivr.net` and Google CDNs are not Subresource Integrity (SRI) pinned. A CDN compromise could inject malicious JS. |

### 2.5 CI/CD pipeline

| Risk | Description |
|------|-------------|
| **Node 20 EOL** | Node 20 security support ends **2026-04-30**. After that date, the runtime will not receive security patches. **High priority.** |
| **Outdated CodeQL action** | `codeql.yml` uses `github/codeql-action@v2` (deprecated); v3 should be used. |
| **`deploy.yml` uses `contents: write`** | The deploy job has broad `contents: write` permission. Scope to the minimum needed. |
| **Dependabot no grouping** | Current Dependabot config has no grouping or ignore rules; major Firebase package updates could break functionality. |

---

## 3. Firestore Security Rules Review

### Current state

```
varaukset/{id}  → auth required + (admin | own userId | service accounts)
mail/{mailId}   → auth required + (admin | service accounts)
calendarWatch/  → auth required + (admin | service accounts)
/**             → deny all  ✅
```

### Findings

| ID | Severity | Finding | Recommendation |
|----|----------|---------|----------------|
| FS-1 | **Medium** | Rule `request.auth.token.email.matches(".*-compute@developer.gserviceaccount.com")` matches compute service accounts from *any* GCP project, not just the Rajala project. | Pin to the specific project number: `request.auth.token.email == "PROJECT_NUMBER-compute@developer.gserviceaccount.com"` or use a more restrictive pattern like `"webbi1@appspot.gserviceaccount.com"`. |
| FS-2 | **Low** | The `varaukset` create rule allows any authenticated user to set an arbitrary `userId` field equal to their own UID. This is correct for self-booking, but does not validate other required fields (e.g. `date`, `service`). | Add field validation in create rules: `request.resource.data.keys().hasAll(['date', 'service', 'userId', 'name'])`. |
| FS-3 | **Low** | No explicit maximum document size or rate-limit guard in rules. Firestore rules cannot fully replace server-side validation, but field validation reduces attack surface. | Validate field types and lengths in rules where practical, e.g. `request.resource.data.name is string && request.resource.data.name.size() < 200`. |
| FS-4 | **Info** | `mail/{mailId}` write is blocked for regular users. ✅ Good — prevents users from injecting arbitrary emails. | No change needed. |
| FS-5 | **Info** | Default deny-all catch-all rule is in place. ✅ | No change needed. |

### Recommended rule hardening (FS-1 and FS-2)

```js
// FS-1 fix: restrict to known service account email(s)
// Replace the broad compute pattern with the specific account for this project:
request.auth.token.email == "WEBBI1_PROJECT_NUMBER-compute@developer.gserviceaccount.com"

// FS-2 fix: validate required fields on create
(!exists(/databases/$(database)/documents/varaukset/$(id)) &&
 request.resource.data.userId == request.auth.uid &&
 request.resource.data.keys().hasAll(['date', 'service', 'userId', 'name']) &&
 request.resource.data.name is string &&
 request.resource.data.name.size() < 200)
```

> ⚠️ **Action required before deploying FS-1 fix:** confirm the exact GCP project number for `webbi1` from the Firebase Console (Project Settings → General → Project number) and substitute it in the rule.

---

## 4. Secrets Management Review

### Current practices

- Secrets (SendGrid API key, reCAPTCHA secret, Google OAuth credentials) are loaded via **Firebase Secret Manager** using `defineString` / `defineSecret` from `firebase-functions/params`. ✅
- No hardcoded credentials found in `functions/index.js` or root-level files. ✅
- `docs/CREDENTIALS_QUICK_REFERENCE.md` exists — **verify** it contains no actual secret values (token strings, passwords, private keys); if it does, rotate all mentioned secrets immediately.

### Recommendations

| Priority | Action |
|----------|--------|
| **High** | Audit `docs/CREDENTIALS_QUICK_REFERENCE.md` for real secrets; if any found, rotate and remove from Git history. |
| **Medium** | Enable GitHub secret scanning on the repository (Settings → Security → Secret scanning). |
| **Medium** | Enable `npm audit` or `pnpm audit` as a required CI step to catch vulnerable dependencies. |
| **Low** | Set a 90-day rotation policy for API keys (SendGrid, reCAPTCHA, Google OAuth). Document in internal runbook. |

---

## 5. Input Validation & Authorization (Cloud Functions)

### Booking endpoint

- reCAPTCHA v3 token is verified server-side before processing. ✅
- CORS is restricted to allowed origins; review that `origin` is not set to `true` (allow all). Confirm in `functions/index.js` CORS options.
- Field validation for booking payloads (name, date, service) should be explicit and return 400 for invalid input.

### Calendar webhook (`calendarWebhook`)

- Verify the `X-Goog-Channel-Token` or `X-Goog-Resource-State` headers match the registered watch token stored in Firestore before processing any sync logic.
- Reject requests with unexpected channel IDs or states to avoid replay/injection attacks.

### General recommendations

| Priority | Action |
|----------|--------|
| **High** | Ensure all HTTP Cloud Functions validate `Content-Type: application/json` and reject other content types. |
| **Medium** | Add explicit input schema validation (e.g. using `zod` or manual checks) for all booking fields before writing to Firestore. |
| **Medium** | Return generic error messages to clients; log detailed errors server-side only. |
| **Low** | Consider Firebase App Check to restrict API calls to your registered app. |

---

## 6. Content Security Policy

The current CSP in `firebase.json` includes `'unsafe-inline'` and `'unsafe-eval'` for scripts. While often necessary for legacy inline scripts, these are the most common XSS vectors.

**Short-term mitigation:**
- Move inline JavaScript to external files to eventually remove `'unsafe-inline'`.
- Remove `'unsafe-eval'` if not required by a specific library (check FullCalendar, reCAPTCHA).

**Current CSP allows:**
- `script-src`: `'unsafe-inline'`, `'unsafe-eval'`, jsdelivr CDN, Google APIs ← risky
- `connect-src`: Firebase Functions endpoint pinned to `europe-north1-webbi1.cloudfunctions.net` ✅
- No `object-src` or `base-uri` directive → add `object-src 'none'; base-uri 'self'`

**Recommendation:** Add `object-src 'none'; base-uri 'self'` to CSP and gradually move inline JS to external scripts.

---

## 7. Logging & Monitoring Recommendations

| Area | Recommendation |
|------|---------------|
| **Cloud Functions** | Ensure all functions use structured logging (`console.log(JSON.stringify({...}))`) for Cloud Logging compatibility. |
| **Error alerting** | Set up Cloud Monitoring alerting on function error rates > baseline. |
| **Firestore** | Enable Firestore audit logs (Cloud Audit Logs → Data Access) for sensitive collections (`varaukset`, `mail`). |
| **Failed authentication** | Log and alert on repeated failed reCAPTCHA verifications (score < 0.3) which may indicate a bot attack. |
| **Dependency audit** | Run `npm audit` in CI and fail on high/critical vulnerabilities. |
| **GitHub Actions** | Enable GitHub Advanced Security / Dependabot security alerts. |

---

## 8. Prioritized Risk Summary

| Priority | ID | Risk | Effort |
|----------|----|------|--------|
| 🔴 High | NODE-EOL | Node 20 reaches EOL 2026-04-30; no security patches after that | Low (config change) |
| 🔴 High | CREDS-AUDIT | Audit `docs/CREDENTIALS_QUICK_REFERENCE.md` for hardcoded secrets | Low |
| 🟠 Medium | FS-1 | Over-broad Firestore compute service account pattern | Low |
| 🟠 Medium | CSP-UNSAFE | `unsafe-inline`/`unsafe-eval` in CSP weakens XSS protection | Medium |
| 🟠 Medium | CORS | Verify CORS `origin` is not `true` (allow-all) in functions | Low |
| 🟡 Low | FS-2 | No field validation on Firestore create | Low |
| 🟡 Low | SRI | CDN scripts not SRI-pinned | Medium |
| 🟡 Low | APPCCHECK | No Firebase App Check enforced | Medium |
| ℹ️ Info | LOGGING | Structured logging and monitoring not confirmed | Low |
| ℹ️ Info | ROTATION | No documented secret rotation schedule | Low |
