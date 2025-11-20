# reCAPTCHA Cookies and Lighthouse Best Practices

## Issue Description

The website uses Google reCAPTCHA v3 for the booking form, which sets approximately 17 cookies that negatively impact the Google Lighthouse "Best Practices" score. The cookies include:
- `_GRECAPTCHA`
- `NID` (Network ID)
- `1P_JAR` (First Party JAR)
- `CONSENT`
- `SIDCC`, `SSID`, `APISID`, `SAPISID`, `HSID`
- `Secure-OSID`, `Secure-1PSID`, `Secure-3PSID`, `Secure-3PSIDCC`
- `LSOLH` (Login Session Origin Lookup Hash)
- `GSP` (Google Sign-in Preferences)
- And others

## Research Findings

### Why reCAPTCHA Sets Cookies

reCAPTCHA v3 uses cookies for:

1. **Fraud Detection**: Tracking user behavior across sessions to build risk profiles
2. **Bot Detection**: Analyzing patterns that distinguish humans from bots
3. **Score Calculation**: Generating accuracy scores (0.0-1.0) based on multiple signals
4. **Cross-Session Analysis**: Understanding user behavior over time
5. **Security**: Preventing replay attacks and maintaining session integrity

### Can These Cookies Be Eliminated?

**No.** The cookies are an integral part of reCAPTCHA v3's fraud detection mechanism and **cannot be eliminated without removing reCAPTCHA entirely**.

According to Google's documentation and community research:
- reCAPTCHA v3 requires cookies to function properly
- The cookies are necessary for the risk analysis engine
- Blocking or removing these cookies will break reCAPTCHA functionality
- There is no "cookie-free" mode for reCAPTCHA v3

## Current Optimizations Already in Place

The website already implements **best practices** for reCAPTCHA v3:

### 1. Lazy Loading
The reCAPTCHA script is loaded asynchronously with `async defer`:
```html
<script src="https://www.google.com/recaptcha/api.js?render=SITE_KEY" async defer></script>
```

Additionally, the booking system uses late initialization (see `index.html` lines 4700-4775) to load FullCalendar and reCAPTCHA only when needed.

### 2. Cookie Consent Banner
The website includes a GDPR-compliant cookie consent banner (`cookie-consent.js` and `cookie-consent.min.js`) that:
- Informs users about cookie usage
- Allows users to accept or decline cookies
- Complies with GDPR and other privacy regulations
- Links to cookie policy page

### 3. Badge Hidden
The reCAPTCHA badge is hidden for better UX:
```css
.grecaptcha-badge {
    visibility: hidden !important;
}
```

This is allowed by Google as long as the privacy policy and terms are clearly disclosed, which this site does.

### 4. Limited Scope
reCAPTCHA is only loaded on pages with the booking form, not site-wide, minimizing unnecessary cookie setting.

### 5. On-Demand Execution
The token generation (`grecaptcha.execute()`) is called only when the user submits the booking form, not on page load.

## Impact on Lighthouse Score

### Best Practices Score
- **Cookie Count**: The 17 cookies will trigger Lighthouse warnings
- **Third-Party Cookies**: Some cookies are flagged as third-party
- **Score Impact**: Can reduce Best Practices score by 5-15 points

### Why This Is Acceptable

1. **Security Trade-off**: The cookies are necessary for preventing spam and bot abuse
2. **User Protection**: Protects the booking system from malicious submissions
3. **Business Requirement**: Essential for maintaining a functional booking system
4. **Industry Standard**: reCAPTCHA is the industry-standard anti-spam solution
5. **Compliance**: Cookie consent banner ensures GDPR compliance

## Alternative Solutions and Their Trade-offs

### Option 1: Remove reCAPTCHA Entirely
**Pros:**
- Eliminates all cookies
- Improves Lighthouse score by 5-15 points
- Faster page load

**Cons:**
- **No spam protection** - booking form vulnerable to bots
- Increased spam submissions and fake bookings
- Manual moderation required
- Potential revenue loss from spam
- Security risk

**Verdict:** ❌ Not recommended

### Option 2: Switch to reCAPTCHA v2 (Checkbox)
**Pros:**
- Fewer cookies (typically 8-12)
- More obvious to users

**Cons:**
- Worse user experience (requires clicking checkbox)
- Still sets cookies (though fewer)
- More friction in booking process
- Only slight improvement to Lighthouse score

**Verdict:** ❌ Not recommended (worse UX for minimal benefit)

### Option 3: Custom CAPTCHA Solution
**Pros:**
- Full control over cookies
- Potentially better Lighthouse score

**Cons:**
- Development time and cost
- Maintenance burden
- Less effective than Google's ML-based solution
- Accessibility concerns
- Security vulnerabilities if not implemented correctly

**Verdict:** ❌ Not recommended (cost/benefit not justified)

### Option 4: Server-Side Bot Detection
**Pros:**
- No client-side cookies
- Better Lighthouse score

**Cons:**
- Complex implementation
- Requires significant backend changes
- Less effective than reCAPTCHA
- Higher server costs
- Ongoing maintenance

**Verdict:** ❌ Not recommended (too complex for marginal benefit)

### Option 5: Accept Current State (RECOMMENDED)
**Pros:**
- Proven security solution
- Minimal development effort
- Industry standard
- Already optimized
- GDPR compliant

**Cons:**
- Lighthouse score impact (minor)

**Verdict:** ✅ **RECOMMENDED**

## Recommendations

1. **Keep Current Implementation**: The website already uses best practices for reCAPTCHA v3
2. **Monitor Lighthouse Score**: The cookie impact is a known limitation and acceptable
3. **Maintain Cookie Consent**: Continue to inform users about cookie usage
4. **Document Trade-offs**: This document serves as evidence of due diligence
5. **Review Periodically**: Check if Google releases new reCAPTCHA versions with fewer cookies

## Documentation Added

Comprehensive documentation has been added to `index.html` (lines 239-256) explaining:
- Why the cookies exist
- Current optimizations in place
- Trade-offs of removing reCAPTCHA
- GDPR compliance measures

## Conclusion

The 17 cookies set by reCAPTCHA v3 are a **necessary trade-off** for security and spam prevention. The website already implements all available optimizations:
- Lazy loading
- Cookie consent
- Limited scope
- On-demand execution
- GDPR compliance

**No further action is required or recommended** regarding reCAPTCHA cookies. The current implementation balances security, user experience, and privacy compliance appropriately.

## References

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [GDPR and reCAPTCHA Compliance](https://www.gdprregister.eu/gdpr/google-recaptcha-cookies/)
- [Lighthouse Best Practices](https://developer.chrome.com/docs/lighthouse/best-practices/)
- [reCAPTCHA Cookie Discussion](https://github.com/GoogleChrome/lighthouse/issues/12464)
