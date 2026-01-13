# Functions Deployment Notes

## ⚠️ Important: Secret Management

Do **NOT** store production secrets (like `RECAPTCHA_SECRET`) in local `.env` files that are used by `firebase deploy`. Use Secret Manager for production secrets.

### Why This Matters

Cloud Run and Firebase Functions Gen2 reject deployments if the same environment variable (e.g., `RECAPTCHA_SECRET`) is defined as both:
- A plain environment variable in a `.env` file
- A Secret Manager binding

This causes the error: `"Secret environment variable overlaps non secret environment variable: RECAPTCHA_SECRET"`

## 🔐 Setting Secrets

### RECAPTCHA_SECRET (Required)

```bash
# Set the secret (creates new secret version)
firebase functions:secrets:set RECAPTCHA_SECRET
# You will be prompted to enter the value
```

### Optional: Other Secrets

```bash
# Email password (recommended for security)
firebase functions:secrets:set EMAIL_PASSWORD

# Google service account (if not using .env)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT
```

## 🚀 Deployment Steps

1. **Ensure no conflicting .env files exist**
   ```bash
   # Remove project-specific .env files that may conflict
   rm -f functions/.env.Webbi1
   ```

2. **Verify secrets are set**
   ```bash
   firebase functions:secrets:get
   ```

3. **Deploy**
   ```bash
   firebase deploy --only functions --project Webbi1
   ```

## 🛠️ Troubleshooting

### Error: "Secret environment variable overlaps..."

**Cause:** `RECAPTCHA_SECRET` exists both as a plain env var and a secret.

**Fix:**
1. Remove `RECAPTCHA_SECRET` from any local `.env` or `.env.Webbi1` file
2. Ensure it's set only via Secret Manager
3. Redeploy

### Quick Fix Commands

```bash
# 1. Remove the problematic env file
rm functions/.env.Webbi1

# 2. Verify/set the secret
firebase functions:secrets:set RECAPTCHA_SECRET

# 3. Deploy again
firebase deploy --only functions --project Webbi1
```

## 📚 Related Documentation

- [Secret Manager Guide](../docs/SECRET_MANAGER.md) - Detailed instructions (in Finnish)
- [Firebase Secret Manager Docs](https://firebase.google.com/docs/functions/config-env#secret-manager)

---

**Last Updated:** November 28, 2024
