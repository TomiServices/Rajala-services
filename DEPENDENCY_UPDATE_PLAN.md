# Dependency & Node.js Lifecycle Update Plan

> **Created:** 2026-04-07  
> **Scope:** TomiServices/Rajala-services  
> **Urgency:** Node 20 security support ends **2026-04-30** (~3 weeks away)

---

## 1. Node.js Version Status

| Version | Status | EOL date |
|---------|--------|----------|
| Node 18 | End of Life | 2025-04-30 |
| **Node 20** | **Active LTS → EOL** | **2026-04-30** ⚠️ |
| **Node 22** | **Active LTS** | 2027-04-30 ✅ |
| Node 24 | Current (LTS Oct 2025+) | 2028-04-30 |

**Recommendation: Upgrade to Node 22 LTS** (supported until 2027-04-30).  
Node 24 is also an option but is newer with less ecosystem validation for Firebase at time of writing.

---

## 2. Firebase & Node 22 Compatibility

| Package | Current version | Node 22 support | Notes |
|---------|----------------|-----------------|-------|
| `firebase-functions` | ^7.2.2 | ✅ | Gen 2 functions support Node 22 |
| `firebase-admin` | ^13.7.0 | ✅ | Fully compatible |
| `@sendgrid/mail` | ^8.1.6 | ✅ | No known issues |
| `axios` | ^1.13.2 | ✅ | No known issues |
| `cors` | ^2.8.5 | ✅ | Stable, no known issues |
| `googleapis` | ^171.4.0 | ✅ | No known issues |
| `google-auth-library` | ^10.6.2 | ✅ | No known issues |
| `nodemailer` | ^8.0.2 | ✅ | No known issues |

**Firebase Cloud Functions Gen 2** officially supports Node 22 as a runtime (`nodejs22`).  
See: [Firebase Functions runtime support](https://firebase.google.com/docs/functions/manage-functions#set_nodejs_version)

---

## 3. Node Upgrade Steps

### 3.1 Configuration files to update

| File | Change |
|------|--------|
| `.nvmrc` | `20` → `22` |
| `package.json` (`engines`) | `">=20 <23"` → `">=22 <25"` |
| `functions/package.json` (`engines`) | `">=20 <23"` → `">=22 <25"` |
| `firebase.json` (`functions.runtime`) | `"nodejs20"` → `"nodejs22"` |
| `.github/workflows/nodejs-ci.yml` | `node-version: [20]` → `[22]` |
| `.github/workflows/deploy.yml` | `node-version: 20` → `22` |

### 3.2 Step-by-step procedure

1. **Update config files** (done in this PR — see above).
2. **Local testing:**
   ```bash
   nvm use 22
   cd functions && npm ci && npm test
   ```
3. **Firebase emulator smoke test:**
   ```bash
   firebase emulators:start --only functions,firestore
   # Test booking, email, calendar endpoints locally
   ```
4. **Deploy to staging** (if a staging Firebase project exists):
   ```bash
   firebase deploy --only functions --project staging
   ```
5. **Deploy to production:**
   ```bash
   firebase deploy --only functions
   ```
6. **Verify** Cloud Functions runtime shows `nodejs22` in the Firebase Console.

### 3.3 Breaking changes to check

- **Node 22 removes some deprecated APIs** from Node core (e.g. `url.parse` deprecation notices). Run `npm test` and check for deprecation warnings.
- **`crypto.randomBytes` vs `crypto.webcrypto`**: Both still available in Node 22. No change needed.
- **`fs.promises` / async iteration**: Fully supported. No change needed.
- Check for any `--openssl-legacy-provider` usage in scripts; this flag is no longer needed in Node 22.

---

## 4. Dependency Update Strategy

### 4.1 General principles

Given the concern that *newest versions do not always support Firebase well*, the strategy is:

1. **Patch updates** – apply automatically (low risk).
2. **Minor updates** – apply automatically with grouping (usually safe, but monitor Firebase packages).
3. **Major updates** – apply manually after review; Firebase packages in particular should be tested before merging.

### 4.2 Firebase-critical packages

These packages have historically had breaking changes between major versions:

- `firebase-admin`
- `firebase-functions`
- `googleapis`
- `google-auth-library`

**Strategy:** Keep Firebase-critical packages in a separate Dependabot group with `update-type: "minor"` only (no auto-major). Review major updates manually.

### 4.3 Dependabot configuration (implemented in this PR)

See `.github/dependabot.yml` for the updated configuration. Key features:

- **Weekly schedule** (Mondays).
- **Root `/` dependencies** (root `package.json`): grouped as `npm-root-deps`.
- **`/functions` dependencies**: split into two groups:
  - `firebase-packages`: `firebase-*`, `google-auth-library`, `googleapis` — **minor and patch only** (no auto-major).
  - `functions-other-deps`: remaining packages — patch and minor.
- **GitHub Actions**: grouped and updated weekly.
- **Open PR limit**: 10 total to avoid PR flood.

### 4.4 Manual review triggers

Manually review (do not auto-merge) PRs that:
- Bump `firebase-admin`, `firebase-functions`, `googleapis`, or `google-auth-library` by a **major** version.
- Bump `nodemailer` by any version (email is critical path).
- Update any package that touches authentication or crypto.

### 4.5 Recommended CI additions

Add to `nodejs-ci.yml`:

```yaml
- name: Audit for vulnerabilities
  working-directory: functions
  run: npm audit --audit-level=high
```

This will fail the CI pipeline if any **high** or **critical** vulnerability is found in the dependency tree.

---

## 5. Monitoring & Staying Current

- **Subscribe to Node.js security announcements**: [nodejs.org/en/security](https://nodejs.org/en/security)
- **Monitor Firebase release notes**: [firebase.google.com/support/release-notes](https://firebase.google.com/support/release-notes)
- **GitHub Dependabot alerts**: Enable in repository Settings → Security → Dependabot alerts.
- **`npm audit`** in CI: catches newly disclosed CVEs automatically.
- **Next Node LTS transition**: Node 22 is supported until **2027-04-30**. Plan the Node 24 upgrade by early 2027.

---

## 6. Timeline

| Date | Action |
|------|--------|
| **2026-04-07** | This PR: update config to Node 22, update Dependabot |
| **2026-04-15** | Smoke test on Node 22 locally and in staging |
| **2026-04-20** | Deploy Node 22 runtime to production Cloud Functions |
| **2026-04-30** | Node 20 EOL — must be off Node 20 before this date |
| **2027-04-30** | Node 22 EOL — plan Node 24 upgrade by Q1 2027 |
