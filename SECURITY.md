# Security Policy

## Supported Versions

| Version / Branch | Supported |
|-----------------|-----------|
| `main` | ✅ Yes |
| Older branches | ❌ No |

Only the `main` branch receives security fixes. Please ensure you are using the latest code from `main` before reporting a vulnerability.

## Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub issues.**

To report a security vulnerability, please use one of the following private channels:

1. **GitHub Private Vulnerability Reporting** (preferred):  
   Open a [private security advisory](https://github.com/TomiServices/Rajala-services/security/advisories/new) in this repository.

2. **Email:**  
   Send details to the repository maintainer. You can find contact information in the repository profile or in the README.

### What to include in your report

- A description of the vulnerability and its potential impact.
- Steps to reproduce (proof of concept, if possible).
- The affected component (e.g. Cloud Function endpoint, Firestore rules, frontend JS).
- Any suggested mitigations or fixes you have identified.

### What to expect

- You will receive an acknowledgement within **5 business days**.
- We aim to provide a status update (confirmed / not confirmed / fix timeline) within **14 days**.
- We will notify you when the vulnerability is fixed and will credit you in the release notes if you wish.

## Scope

The following are in scope for security reports:

- Firebase Cloud Functions endpoints (authentication, authorization, injection, SSRF)
- Firestore security rules (privilege escalation, data exposure)
- Frontend JavaScript (XSS, CSRF, exposed secrets)
- CI/CD pipeline (secret exposure, supply-chain risks)
- Dependency vulnerabilities in `functions/package.json` and root `package.json`

## Out of Scope

- Vulnerabilities in third-party services (Firebase platform itself, Google Cloud, SendGrid) — report those to the respective vendor.
- Issues that require physical access to infrastructure.
- Social engineering attacks.
- Denial-of-service attacks that rely solely on resource exhaustion without a code vulnerability.

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials to the repository.
- Use [Firebase Secret Manager](https://firebase.google.com/docs/functions/config-env?gen=2nd#secret-manager) for all sensitive configuration.
- Follow the principle of least privilege when writing Firestore security rules.
- Run `npm audit` before opening a pull request that adds or updates dependencies.
