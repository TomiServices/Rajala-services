# Rajala Services (Fixnero) - Company Website

Professional automotive services website for Fixnero, providing car maintenance, detailing, and repair services in Espoo, Finland.

## 🚀 Project Overview

This is a static website with Firebase backend functionality, featuring:
- **Appointment booking system** with Google Calendar integration
- **Firebase Cloud Functions** for backend processing
- **Multi-page service information** (car wash, detailing, repairs, etc.)
- **Blog section** with automotive care tips
- **Mobile-responsive design** with modern UI/UX
- **Google Analytics** for tracking
- **reCAPTCHA** for form protection

## 📁 Project Structure

```
/
├── static/              # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files (booking system, UI interactions)
│   ├── images/         # All image assets (webp, png, jpg)
│   └── icons/          # Favicon and app icons
├── docs/               # Documentation (70+ markdown files)
│   ├── EXTERNAL_SERVICES_AUDIT.md
│   ├── MIGRATION_GUIDE.md
│   ├── ADMINISTRATOR_SETUP_GUIDE.md
│   └── ... (deployment, configuration, troubleshooting guides)
├── functions/          # Firebase Cloud Functions
│   ├── index.js       # Main function handler
│   ├── calendarwebhook.js
│   └── src/           # Function modules
├── scripts/           # Deployment and validation scripts
│   ├── validate-deployment-readiness.sh
│   ├── verify-booking-config.sh
│   └── ... (validation utilities)
├── tests/             # Testing files
│   ├── test-booking-flow.js
│   └── ... (various HTML/JS test files)
├── blogi/             # Blog posts (Finnish)
├── *.html             # Main website pages (root level for Firebase hosting)
├── firebase.json      # Firebase configuration
├── firestore.rules    # Firestore security rules
├── .firebaserc        # Firebase project settings
├── robots.txt         # SEO configuration
├── sitemap.xml        # Sitemap for search engines
└── site.webmanifest   # PWA configuration
```

## 🛠️ Key Technologies

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Cloud Functions (Node.js)
- **Database**: Firestore
- **Hosting**: Firebase Hosting
- **Integrations**: 
  - Google Calendar API (appointment scheduling)
  - Google Analytics (tracking)
  - reCAPTCHA v3 (security)

## 📦 Main Components

### Static Assets (`/static/`)
- **CSS**: `visual-emphasis.css` - Shared styling for all pages
- **JavaScript**: 
  - `booking-system.js/.min.js` - Appointment booking logic
  - `cookie-consent.js/.min.js` - GDPR cookie consent
  - `ui-interactions.js/.min.js` - Interactive UI elements
  - `ga-config.js` - Google Analytics configuration
- **Images**: All service photos, hero images, logos (37 files)
- **Icons**: All favicon formats for cross-browser/device compatibility

### Documentation (`/docs/`)
Contains comprehensive guides for:
- External service integrations
- Migration procedures
- Deployment checklists
- Configuration management
- Troubleshooting guides

See [`docs/README.md`](./docs/README.md) for the complete documentation index.

### Cloud Functions (`/functions/`)
- **Booking confirmations** via email
- **Calendar synchronization** with Google Calendar
- **Webhook handling** for calendar events
- **reCAPTCHA validation**

### Scripts (`/scripts/`)
Validation and deployment utilities:
- Deployment readiness checks
- Booking configuration verification
- Email configuration validation
- Google Calendar setup verification

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ suositeltu / recommended)
- Firebase CLI
- Google Cloud account (for Firebase, Calendar API)

### Local Development
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Install function dependencies
cd functions
npm install

# Start Firebase emulators
firebase emulators:start
```

### Deployment
```bash
# Deploy everything (hosting + functions)
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

## 📝 HTML Pages

### Main Pages
- `index.html` - Homepage with services overview
- `autohuolto.html` - Car maintenance services
- `pesupalvelut.html` - Washing services
- `sisapuhdistus.html` - Interior cleaning
- `kiilloitus.html` - Polishing and coating
- `rengastyot.html` - Tire services
- `kolhukorjaus.html` - Dent repair
- `lasikorjaus.html` - Glass repair
- `korjaustyot.html` - General repairs

### Info Pages
- `tietoa-meista.html` - About us
- `tyonnaytteet.html` - Portfolio/work examples
- `tietosuojaseloste.html` - Privacy policy
- `cookie-policy.html` - Cookie policy

### Blog (`/blogi/`)
- Finnish-language blog posts about car care
- 4 articles covering various automotive topics

## 🔧 Configuration Files

- **firebase.json**: Firebase hosting and functions configuration
- **firestore.rules**: Database security rules
- **.firebaserc**: Firebase project configuration
- **site.webmanifest**: PWA manifest for mobile/desktop apps
- **robots.txt**: Search engine crawler instructions
- **sitemap.xml**: Site structure for SEO

## 🧪 Testing

Test files are located in `/tests/` directory:
- Booking flow tests
- Calendar functionality tests
- Responsive design tests
- Service structure validation

## 🔐 Security

- Content Security Policy (CSP) headers configured
- reCAPTCHA v3 integration for form protection
- HTTPS-only with HSTS
- Firestore security rules for data protection
- Environment variables for sensitive configuration

## 📋 FAQ Structured Data (Schema.org)

Each service page contains **one** FAQPage structured data block implemented as a `<script type="application/ld+json">` in the `<head>` section. This is the single authoritative source for FAQ rich results.

**Important**: Do **not** add `itemscope itemtype="https://schema.org/FAQPage"` microdata attributes to the HTML body elements. Having both JSON-LD and microdata on the same page creates duplicate FAQPage structured data, which Google Search Console reports as a "Duplicate field FAQPage" error and rejects for rich results.

**To add or update FAQ questions** on a service page:
1. Edit the `mainEntity` array inside the `<script type="application/ld+json">` block in the `<head>`.
2. Mirror the question/answer text in the visible `.ukk-item` HTML section (for user display).
3. Keep the `.ukk-section` HTML clean — **no** `itemscope`/`itemprop`/`itemtype` attributes.
4. Verify with [Google Rich Results Test](https://search.google.com/test/rich-results) that only one FAQPage is detected.

## 📚 Additional Documentation

For detailed documentation on:
- **Deployment**: See `docs/DEPLOYMENT_GUIDE.md`
- **Configuration**: See `docs/CONFIGURATION.md`
- **Migration**: See `docs/MIGRATION_GUIDE.md`
- **External Services**: See `docs/EXTERNAL_SERVICES_AUDIT.md`
- **Administrator Setup**: See `docs/ADMINISTRATOR_SETUP_GUIDE.md`

## 🤝 Contributing

When making changes:
1. Test locally using Firebase emulators
2. Validate with scripts in `/scripts/`
3. Update documentation if needed
4. Deploy to staging first (if available)
5. Monitor for errors after deployment

## 📞 Support

For issues or questions, refer to:
- `docs/TROUBLESHOOTING.md` (if available)
- Firebase Console error logs
- Google Calendar API logs

## 🌐 Live Site

**Production URL**: https://fixnero.fi

---

**Note**: This project was reorganized in February 2024 to improve maintainability and follow modern web development best practices. All static assets are now organized under the `/static/` directory while maintaining Firebase hosting compatibility.
