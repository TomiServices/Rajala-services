# Google Analytics 4 and Search Console Setup Guide

## Overview
This guide provides step-by-step instructions for setting up Google Analytics 4 (GA4) and Google Search Console for the Fixnero website.

## Google Analytics 4 Setup

### Step 1: Create GA4 Property

1. **Go to Google Analytics**
   - Visit: https://analytics.google.com/
   - Sign in with your Google account

2. **Create a new property**
   - Click "Admin" (gear icon) in the bottom left
   - Under "Property" column, click "Create Property"
   - Enter property name: "Fixnero Website"
   - Select reporting time zone: "Finland (GMT+2)"
   - Select currency: "Euro (EUR)"
   - Click "Next"

3. **Business Details**
   - Industry category: "Automotive"
   - Business size: "Small (1-10 employees)"
   - Click "Next"

4. **Business Objectives**
   - Select: "Get baseline reports" and "Examine user behavior"
   - Click "Create"

5. **Accept Terms of Service**
   - Review and accept the terms
   - Click "I Accept"

### Step 2: Set up Data Stream

1. **Choose platform**
   - Select "Web"

2. **Set up web stream**
   - Website URL: `https://fixnero.fi`
   - Stream name: "Fixnero Main Website"
   - Click "Create stream"

3. **Get Measurement ID**
   - Copy the Measurement ID (format: G-XXXXXXXXXX)
   - **IMPORTANT**: Save this ID - you'll need it for the website

### Step 3: Configure GA4 Settings

1. **Enhanced Measurement**
   - Should be enabled by default
   - Automatically tracks:
     - Page views
     - Scrolls
     - Outbound clicks
     - Site search
     - Video engagement
     - File downloads

2. **Data Collection**
   - Enable "Google signals data collection" for demographics
   - Enable "Consent mode" for GDPR compliance

3. **User Data Collection**
   - Set data retention to "14 months"
   - Enable "Reset user data on new activity"

### Step 4: Update Website Code

1. **Locate the Measurement ID**
   - In GA4, go to Admin > Data Streams > Your stream
   - Copy the Measurement ID (G-XXXXXXXXXX)

2. **Update cookie-consent.js**
   - Open `/cookie-consent.js`
   - Find the line: `const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';`
   - Replace `G-XXXXXXXXXX` with your actual Measurement ID

3. **Verify Installation**
   - The cookie consent script will automatically load GA4 when users accept cookies
   - No need to manually add GA4 code to each page

### Step 5: Test GA4 Installation

1. **Real-time Reports**
   - In GA4, go to "Reports" > "Realtime"
   - Open your website in a new tab
   - Accept cookies
   - You should see your visit in real-time reports within 30 seconds

2. **DebugView**
   - In GA4, go to "Admin" > "DebugView"
   - Add `?debug_mode=true` to your URL
   - Check events are firing correctly

## Google Search Console Setup

### Step 1: Add Property

1. **Go to Search Console**
   - Visit: https://search.google.com/search-console/
   - Sign in with your Google account

2. **Add Property**
   - Click "Add Property"
   - Choose "URL prefix" property type
   - Enter: `https://fixnero.fi`
   - Click "Continue"

### Step 2: Verify Ownership

**Option 1: HTML Tag (Recommended)**

1. In Search Console, select "HTML tag" method
2. Copy the meta tag provided (looks like):
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
3. Add this tag to the `<head>` section of `index.html` and all other HTML pages
4. Click "Verify" in Search Console

**Option 2: HTML File Upload**

1. Download the HTML file provided by Search Console
2. Upload it to your website root directory
3. Verify you can access: `https://fixnero.fi/google[verification-code].html`
4. Click "Verify" in Search Console

**Option 3: Google Analytics (If GA4 is set up)**

1. Select "Google Analytics" method
2. Search Console will automatically verify if you're using the same Google account
3. Click "Verify"

### Step 3: Submit Sitemap

1. **In Search Console**
   - Go to "Sitemaps" in the left sidebar
   - Enter sitemap URL: `sitemap.xml`
   - Click "Submit"

2. **Verify Sitemap**
   - Wait 24-48 hours
   - Check status shows "Success"
   - View discovered URLs

### Step 4: Configure Settings

1. **Set Preferred Domain**
   - Go to Settings > Domain settings
   - Verify both www and non-www versions if applicable

2. **Set Target Country**
   - Go to Settings > Geographic target
   - Select "Finland" if serving primarily Finnish customers

## Integration and Cross-linking

### Link GA4 and Search Console

1. **In GA4**
   - Go to Admin > Product Links
   - Click "Link" under "Search Console"
   - Select your Search Console property
   - Click "Confirm" and "Submit"

2. **Benefits**
   - See search queries in GA4
   - Get landing page data
   - Combine analytics with search performance

## Setting Up Goals and Conversions

### GA4 Conversion Events

1. **Booking Conversion**
   - In GA4, go to "Configure" > "Events"
   - Create custom event: `booking_submitted`
   - Mark as conversion

2. **Phone Click Conversion**
   - Create event: `phone_click`
   - Mark as conversion

3. **WhatsApp Click Conversion**
   - Create event: `whatsapp_click`
   - Mark as conversion

### Implementation in Website

Add event tracking to booking form submission:
```javascript
// In booking form submit handler
if (typeof gtag !== 'undefined') {
    gtag('event', 'booking_submitted', {
        'event_category': 'engagement',
        'event_label': 'Booking Form',
        'value': 1
    });
}
```

## Important Notes

### GDPR Compliance

✅ **Already Implemented:**
- Cookie consent banner (only loads GA4 after user accepts)
- IP anonymization enabled
- Cookie settings page
- User can reject analytics cookies

### Privacy Settings

In GA4:
1. Go to Admin > Data Settings > Data Collection
2. Enable "IP anonymization"
3. Set "Cookie timeout" to 63072000 seconds (2 years)
4. Enable "Consent Mode"

## Monitoring Checklist

### Daily (First Week)
- [ ] Check real-time reports
- [ ] Verify events are tracking
- [ ] Check for errors in DebugView

### Weekly
- [ ] Review top pages
- [ ] Check traffic sources
- [ ] Review user engagement metrics
- [ ] Check mobile vs desktop traffic

### Monthly
- [ ] Review Search Console performance
- [ ] Check keyword rankings
- [ ] Analyze user behavior flow
- [ ] Review conversion rates
- [ ] Update content based on data

## Troubleshooting

### GA4 Not Tracking

1. **Check browser console for errors**
   - Open Developer Tools (F12)
   - Look for GA4-related errors

2. **Verify Measurement ID**
   - Ensure ID in `cookie-consent.js` matches GA4 property

3. **Check cookie consent**
   - Clear cookies and accept consent banner
   - Verify `fixnero_cookie_consent` cookie is set

4. **Ad blockers**
   - Disable ad blockers for testing
   - Some users may have ad blockers (normal behavior)

### Search Console Not Indexing

1. **Request indexing manually**
   - In Search Console, use "URL Inspection"
   - Enter page URL
   - Click "Request Indexing"

2. **Check robots.txt**
   - Verify not blocking important pages
   - Current robots.txt should allow all bots

3. **Check sitemap**
   - Ensure all pages are listed
   - Verify no errors in sitemap

## Advanced Features (Optional)

### Custom Dashboards

1. Create custom reports in GA4:
   - Service page performance
   - Booking funnel analysis
   - Geographic distribution
   - Device usage

### Alerts

1. Set up custom alerts:
   - Traffic drop alerts
   - Conversion rate changes
   - New referring domains

### User Segments

1. Create segments:
   - Mobile users
   - Returning visitors
   - Users who booked
   - Users from specific locations (Espoo, Helsinki)

## Resources

- [GA4 Help Center](https://support.google.com/analytics/)
- [Search Console Help](https://support.google.com/webmasters/)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Schema.org Validator](https://validator.schema.org/)

## Contact for Support

If you need help with setup:
- GA4 Support: https://support.google.com/analytics/
- Search Console Community: https://support.google.com/webmasters/community

---

**Last Updated**: October 2025  
**Version**: 1.0
