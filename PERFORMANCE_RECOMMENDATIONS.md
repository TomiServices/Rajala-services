# Performance Optimization Recommendations
**Fixnero - Rajala Services**  
**Quick Action Guide**

This document provides actionable, step-by-step recommendations for implementing the performance improvements identified in the comprehensive audit.

---

## 🔴 CRITICAL PRIORITY - Implement This Week

### 1. Extract CSS to External Files
**Impact:** Reduce page size by 60-70KB, enable caching, improve load time by 1-2s

**Steps:**
1. Create `/css/` directory
2. Extract all `<style>` content from HTML files
3. Create these files:
   - `css/critical.css` - Above-the-fold styles (inline this)
   - `css/main.css` - Common styles for all pages
   - `css/services.css` - Service page specific styles
   - `css/booking.css` - Booking functionality styles

4. Update all HTML files:
```html
<!-- Inline critical CSS for immediate render -->
<style>
/* Minimal critical CSS here - nav, hero, above-fold only */
</style>

<!-- Preload main stylesheet -->
<link rel="preload" href="/css/main.css" as="style">
<link rel="stylesheet" href="/css/main.css">

<!-- Load page-specific CSS -->
<link rel="stylesheet" href="/css/services.css">
```

5. Minify CSS files using online tools or build process
6. Test all pages to ensure styling is intact

**Success Metrics:**
- index.html size: 198KB → <60KB
- Service pages: 20KB → <12KB
- Cached CSS loads in <50ms on repeat visits

---

### 2. Extract JavaScript to External Files
**Impact:** Reduce page size by 40-50KB, improve Time to Interactive by 1-2s

**Steps:**
1. Create `/js/` directory
2. Extract JavaScript from HTML files
3. Create these files:
   - `js/common.js` - Navigation, mobile menu, utilities
   - `js/booking.js` - FullCalendar and booking form logic
   - `js/analytics.js` - GA4 and tracking (if not using cookie-consent.js)

4. Update HTML files:
```html
<!-- Defer common JavaScript -->
<script src="/js/common.js" defer></script>

<!-- Load booking.js only on homepage -->
<script src="/js/booking.js" defer></script>

<!-- Keep cookie-consent.js as is -->
<script src="/cookie-consent.js"></script>
```

5. Ensure proper execution order with `defer` attribute
6. Test all functionality thoroughly

**Success Metrics:**
- Reduced blocking time by 300-500ms
- Time to Interactive: 5.5s → <3.8s
- JavaScript loads after HTML parsing

---

### 3. Optimize Large Images
**Impact:** Reduce total image payload by 1-1.5MB, improve LCP by 1-2s

**Images to Optimize:** (>200KB)
1. `Asiakas1.webp` - 296KB → Target: 80-100KB
2. `brushed_metal.webp` - 280KB → Target: 50-80KB
3. `Rengas.webp` - 280KB → Target: 80-120KB
4. `Hero3.webp` - 268KB → Target: 80-100KB
5. `Korjaustyot.webp` - 264KB → Target: 80-120KB
6. `sisapuhdistus.webp` - 260KB → Target: 80-120KB
7. `Asiakas2.webp` - 256KB → Target: 80-100KB
8. `Elementti2.webp` - 252KB → Target: 80-120KB

**Steps:**
1. Use online tools like Squoosh.app or command-line cwebp
2. Re-encode at quality 80-82 (vs current ~90-95)
3. Command example:
   ```bash
   cwebp -q 82 -m 6 original.png -o optimized.webp
   ```
4. Create backup of originals first
5. Replace files with optimized versions
6. Test visual quality on actual devices

**Success Metrics:**
- Total image size: ~3.5MB → ~1.5-2MB
- LCP improvement: 4.5s → ~2.5s
- Maintain visual quality (compare side-by-side)

---

### 4. Add Image Lazy Loading
**Impact:** Reduce initial page load by 500KB-1MB, faster First Contentful Paint

**Steps:**
1. Add `loading="lazy"` to all below-the-fold images:
```html
<!-- Hero images - DON'T lazy load (above fold) -->
<img src="Hero2.webp" alt="..." width="1920" height="1080">

<!-- Below-fold images - DO lazy load -->
<img src="service-image.webp" alt="..." width="800" height="600" loading="lazy">
```

2. Add explicit width and height to prevent layout shift:
```html
<img src="image.webp" width="1200" height="800" alt="..." loading="lazy">
```

3. Test on slow connection (Chrome DevTools → Network → Slow 3G)
4. Verify images load as you scroll

**Success Metrics:**
- Initial page load: Reduced by 50-70%
- Images load just before entering viewport
- No Cumulative Layout Shift (CLS)

---

### 5. Add Resource Hints
**Impact:** Reduce DNS lookup and connection time by 200-400ms

**Steps:**
Add to `<head>` of all pages:
```html
<!-- DNS prefetch for third-party domains -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://www.google.com">
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">

<!-- Preconnect to critical resources -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Preload critical resources -->
<link rel="preload" href="/css/main.css" as="style">
<link rel="preload" href="FXNR.webp" as="image">
```

**Success Metrics:**
- Reduced connection time to third-party domains
- Faster font loading
- Improved First Contentful Paint

---

## 🟡 HIGH PRIORITY - Implement Next Week

### 6. Implement Responsive Images
**Impact:** Reduce mobile image payload by 60-70%

**Steps:**
1. Create multiple image sizes:
```bash
# For Hero images
cwebp -q 82 -resize 480 0 Hero3.png -o Hero3-small.webp    # Mobile
cwebp -q 82 -resize 768 0 Hero3.png -o Hero3-medium.webp   # Tablet
cwebp -q 82 -resize 1200 0 Hero3.png -o Hero3-large.webp   # Desktop
cwebp -q 82 Hero3.png -o Hero3-xlarge.webp                 # Large screens
```

2. Use `<picture>` element or `srcset`:
```html
<picture>
    <source media="(max-width: 767px)" srcset="Hero3-small.webp">
    <source media="(max-width: 1439px)" srcset="Hero3-medium.webp">
    <source media="(min-width: 1440px)" srcset="Hero3-large.webp">
    <img src="Hero3-medium.webp" alt="Fixnero autohuolto" width="1200" height="800">
</picture>
```

Or using srcset (simpler):
```html
<img src="Hero3-large.webp" 
     srcset="Hero3-small.webp 480w,
             Hero3-medium.webp 768w,
             Hero3-large.webp 1200w,
             Hero3-xlarge.webp 1920w"
     sizes="100vw"
     alt="Fixnero autohuolto"
     width="1200" height="800">
```

**Priority Images:**
- All Hero images (Hero1, Hero2, Hero3)
- Large service images (>150KB)

**Success Metrics:**
- Mobile payload: 268KB → 60-80KB per hero image
- Appropriate image served for device size
- Maintained visual quality across devices

---

### 7. Conditional FullCalendar Loading
**Impact:** Save 230KB on service pages (12 pages)

**Steps:**
1. Remove FullCalendar script from service pages
2. On homepage, load conditionally:

```javascript
// In common.js or inline script
if (document.getElementById('calendar')) {
    // Only load FullCalendar if calendar element exists
    const calendarCSS = document.createElement('link');
    calendarCSS.rel = 'stylesheet';
    calendarCSS.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/main.min.css';
    document.head.appendChild(calendarCSS);
    
    const calendarScript = document.createElement('script');
    calendarScript.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js';
    calendarScript.defer = true;
    calendarScript.onload = initializeCalendar;
    document.head.appendChild(calendarScript);
}

function initializeCalendar() {
    // Your existing calendar initialization code
}
```

**Advanced: Lazy load on scroll**
```javascript
// Load when user scrolls to booking section
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        loadFullCalendar();
        observer.disconnect();
    }
}, { rootMargin: '200px' });

const bookingSection = document.getElementById('booking-section');
if (bookingSection) {
    observer.observe(bookingSection);
}
```

**Success Metrics:**
- Service pages: Reduced by 230KB each
- Homepage: Calendar loads only when needed
- No impact on booking functionality

---

### 8. Optimize Font Loading
**Impact:** Eliminate render-blocking fonts, improve FCP by 200-400ms

**Steps:**
1. Add `font-display: swap` to Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Yanone+Kaffeesatz:wght@700&family=Bebas+Neue&display=swap" rel="stylesheet">
```

2. Add preconnect (already covered in #5):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

3. Consider self-hosting fonts:
   - Download font files from Google Fonts
   - Host on same domain
   - Use `@font-face` in CSS
   - Better caching control

**Optional: System font fallback**
```css
body {
    font-family: 'Arial', -apple-system, BlinkMacSystemFont, 
                 'Segoe UI', Roboto, sans-serif;
}

.service-title {
    font-family: 'Yanone Kaffeesatz', 'Impact', 'Arial Black', sans-serif;
}
```

**Success Metrics:**
- No render blocking from fonts
- Text visible immediately (FOUT acceptable)
- Fonts load progressively

---

### 9. Configure Caching Headers
**Impact:** 90%+ cache hit rate on repeat visits, instant loading for returning users

**Steps:**
1. Edit `firebase.json`:
```json
{
    "hosting": {
        "public": ".",
        "ignore": [
            "firebase.json",
            "**/.*",
            "**/node_modules/**"
        ],
        "headers": [
            {
                "source": "**/*.@(jpg|jpeg|gif|png|webp|svg|ico|woff|woff2|ttf|eot)",
                "headers": [{
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }]
            },
            {
                "source": "**/*.@(css|js)",
                "headers": [{
                    "key": "Cache-Control",
                    "value": "public, max-age=31536000, immutable"
                }]
            },
            {
                "source": "**/*.@(html)",
                "headers": [{
                    "key": "Cache-Control",
                    "value": "public, max-age=3600, must-revalidate"
                }]
            },
            {
                "source": "**",
                "headers": [
                    {
                        "key": "X-Content-Type-Options",
                        "value": "nosniff"
                    },
                    {
                        "key": "X-Frame-Options",
                        "value": "SAMEORIGIN"
                    },
                    {
                        "key": "Referrer-Policy",
                        "value": "strict-origin-when-cross-origin"
                    }
                ]
            }
        ]
    }
}
```

2. Use versioned filenames for cache busting:
```html
<link rel="stylesheet" href="/css/main.css?v=1.0.1">
<script src="/js/common.js?v=1.0.1"></script>
```

3. Deploy and test cache headers:
```bash
curl -I https://www.rajala-services.com/css/main.css
# Look for: Cache-Control: public, max-age=31536000, immutable
```

**Success Metrics:**
- Static resources cached for 1 year
- HTML cached for 1 hour with revalidation
- Repeat visits load in <500ms

---

### 10. Verify Compression
**Impact:** 60-80% reduction in text file sizes

**Steps:**
1. Verify gzip/brotli is enabled on Firebase Hosting:
```bash
curl -H "Accept-Encoding: gzip, deflate, br" -I https://www.rajala-services.com/
# Look for: Content-Encoding: br (or gzip)
```

2. Firebase Hosting should handle this automatically, but verify:
   - HTML files show `Content-Encoding: br` or `gzip`
   - CSS files show `Content-Encoding: br` or `gzip`
   - JS files show `Content-Encoding: br` or `gzip`

3. If not enabled, check firebase.json configuration
4. Redeploy if needed: `firebase deploy`

**Success Metrics:**
- All text resources compressed
- Transfer size 60-80% smaller than content size
- Brotli preferred over gzip (better compression)

---

## 🟢 MEDIUM PRIORITY - Implement This Month

### 11. Improve Accessibility
**Impact:** Broader reach, better SEO, legal compliance

**Quick Wins:**
1. Add ARIA labels:
```html
<nav aria-label="Main navigation">
    <button class="hamburger-menu" 
            aria-label="Toggle menu" 
            aria-expanded="false"
            aria-controls="nav">
</nav>

<form aria-label="Booking form">
```

2. Ensure keyboard navigation:
   - Tab through all interactive elements
   - Add visible focus states
   - Ensure logical tab order

3. Check color contrast:
   - Use WebAIM Contrast Checker
   - Ensure 4.5:1 ratio for text
   - Fix any failing combinations

4. Add skip link:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<style>
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    z-index: 100;
}
.skip-link:focus {
    top: 0;
}
</style>
```

---

### 12. Implement Service Worker (PWA)
**Impact:** Offline support, better engagement, app-like experience

**Steps:**
1. Create `sw.js`:
```javascript
const CACHE_NAME = 'fixnero-v1';
const urlsToCache = [
    '/',
    '/css/main.css',
    '/css/critical.css',
    '/js/common.js',
    '/FXNR.webp',
    '/Favicon.webp'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});
```

2. Register service worker in HTML:
```html
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed', err));
    });
}
</script>
```

3. Create `manifest.json`:
```json
{
    "name": "Fixnero Autohuolto Espoo",
    "short_name": "Fixnero",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#000000",
    "theme_color": "#000000",
    "description": "Autohuolto, autopesu ja rengastyöt Espoossa",
    "icons": [
        {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

4. Link manifest in HTML:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
```

---

### 13. Add Security Headers
**Impact:** Better security, protection against attacks

Already covered in #9 (firebase.json), ensure these are included:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

**Additional: Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.google.com https://www.gstatic.com https://us-central1-fxnr-web.cloudfunctions.net;
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
               font-src 'self' https://fonts.gstatic.com;
               img-src 'self' data: https:;
               connect-src 'self' https://us-central1-fxnr-web.cloudfunctions.net;">
```

---

### 14. Implement Core Web Vitals Tracking
**Impact:** Data-driven optimization, monitor performance

**Steps:**
1. Install web-vitals library:
```html
<script type="module">
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'https://unpkg.com/web-vitals@3?module';

function sendToAnalytics({name, delta, id}) {
    // Send to Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', name, {
            event_category: 'Web Vitals',
            value: Math.round(delta),
            event_label: id,
            non_interaction: true,
        });
    }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
</script>
```

2. Monitor in Google Analytics:
   - Events → Web Vitals category
   - Create custom reports for Core Web Vitals
   - Set up alerts for degradation

---

## 📊 TESTING & VALIDATION

### After Each Implementation Phase:

1. **Run Lighthouse Audit:**
   - Chrome DevTools → Lighthouse
   - Test both Mobile and Desktop
   - Target: 90+ on all metrics

2. **Test on Real Devices:**
   - iPhone (Safari)
   - Android (Chrome)
   - Tablet
   - Slow 3G connection

3. **Validate Functionality:**
   - All navigation works
   - Booking form works
   - Images display correctly
   - Styles are intact
   - JavaScript functions properly

4. **Check Performance:**
   - PageSpeed Insights: https://pagespeed.web.dev/
   - WebPageTest: https://www.webpagetest.org/
   - GTmetrix: https://gtmetrix.com/

5. **Validate SEO:**
   - Google Rich Results Test
   - Schema markup validator
   - Mobile-Friendly Test

---

## 🎯 SUCCESS METRICS

### Target Improvements:
- **PageSpeed Mobile:** 55-65 → 85-90 (+25-30 points)
- **PageSpeed Desktop:** 75-85 → 95-100 (+15-20 points)
- **Page Load Time:** 4.5s → <2.5s (-2s)
- **Time to Interactive:** 5.5s → <3.8s (-1.7s)
- **Page Weight:** 250KB → 100KB (-60%)
- **Bounce Rate:** -10-15%
- **Conversion Rate:** +8-12%

### Timeline:
- **Week 1:** Critical priority items (#1-5)
- **Week 2-3:** High priority items (#6-10)
- **Week 4:** Medium priority items (#11-14)
- **Ongoing:** Monitoring and optimization

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Critical (Week 1)
- [ ] Extract CSS to external files
- [ ] Extract JavaScript to external files
- [ ] Optimize large images (>200KB)
- [ ] Add lazy loading to images
- [ ] Add resource hints (preconnect, dns-prefetch)
- [ ] Run Lighthouse audit
- [ ] Test on mobile devices
- [ ] Verify all functionality works

### Phase 2: High Priority (Week 2-3)
- [ ] Implement responsive images (srcset)
- [ ] Conditional FullCalendar loading
- [ ] Optimize font loading
- [ ] Configure caching headers
- [ ] Verify compression enabled
- [ ] Run second Lighthouse audit
- [ ] Compare metrics to baseline

### Phase 3: Medium Priority (Week 4)
- [ ] Improve accessibility (ARIA, keyboard nav)
- [ ] Implement Service Worker
- [ ] Add Web App Manifest
- [ ] Add security headers
- [ ] Implement Core Web Vitals tracking
- [ ] Final Lighthouse audit
- [ ] Document results

### Phase 4: Ongoing
- [ ] Weekly performance monitoring
- [ ] Monthly comprehensive audits
- [ ] Track Core Web Vitals in GA4
- [ ] Monitor search rankings
- [ ] Optimize based on data

---

## 🚀 QUICK WINS (Can Do Today)

1. **Add lazy loading** - 30 minutes
   - Add `loading="lazy"` to all images
   - Immediate impact on page load

2. **Add resource hints** - 15 minutes
   - Add preconnect, dns-prefetch to `<head>`
   - Faster third-party connections

3. **Optimize one large image** - 10 minutes
   - Re-encode at lower quality
   - See immediate size reduction

4. **Add image dimensions** - 20 minutes
   - Add width/height to all `<img>` tags
   - Prevent layout shift

5. **Defer JavaScript** - 10 minutes
   - Add `defer` to script tags
   - Faster initial page render

---

## 📞 SUPPORT & RESOURCES

### Documentation:
- Main audit report: `PERFORMANCE_AUDIT_REPORT.md`
- This action guide: `PERFORMANCE_RECOMMENDATIONS.md`

### Tools:
- Image optimization: https://squoosh.app/
- CSS minification: https://cssminifier.com/
- JS minification: https://javascript-minifier.com/
- PageSpeed Insights: https://pagespeed.web.dev/
- Lighthouse: Chrome DevTools

### Testing:
- WebPageTest: https://www.webpagetest.org/
- GTmetrix: https://gtmetrix.com/
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly

---

**Document Version:** 1.0  
**Last Updated:** October 26, 2025  
**Next Review:** After Phase 1 completion
