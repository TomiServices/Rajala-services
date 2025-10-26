# Deployment Checklist for Performance Optimizations

## Pre-Deployment Verification ✅

### Code Quality
- [x] All HTML files use external CSS (css/main.css)
- [x] All HTML files use external JS where appropriate
- [x] All images have width/height attributes
- [x] Lazy loading implemented on below-fold images
- [x] Resource hints added for third-party domains
- [x] Service Worker registered
- [x] PWA manifest linked
- [x] Accessibility features implemented

### File Validation
- [x] css/main.css exists and is properly formatted
- [x] js/common.js exists
- [x] js/booking.js exists
- [x] js/web-vitals-tracking.js exists
- [x] sw.js exists
- [x] manifest.json exists
- [x] firebase.json configured with headers

### Image Optimization
- [x] Large images optimized (8 files)
- [x] Responsive variants created (6 files)
- [x] All images are in WebP format
- [x] No images over 300KB

## Deployment Steps

### 1. Backup
```bash
# Create backup of current deployment
firebase hosting:clone SOURCE_SITE:SOURCE_CHANNEL DESTINATION_SITE:backup-$(date +%Y%m%d)
```

### 2. Deploy to Preview Channel (Recommended)
```bash
# Deploy to preview channel first
firebase hosting:channel:deploy preview

# Test the preview URL before deploying to production
```

### 3. Deploy to Production
```bash
# Deploy to production
firebase deploy --only hosting
```

### 4. Deploy Functions (if updated)
```bash
# Only if functions were modified
firebase deploy --only functions
```

## Post-Deployment Testing

### Immediate Tests (Within 1 hour)

#### 1. Visual Verification
- [ ] Visit homepage and verify layout is correct
- [ ] Check all service pages load correctly
- [ ] Verify hero images display properly on mobile/tablet/desktop
- [ ] Test navigation menu on mobile and desktop
- [ ] Verify booking calendar loads and works

#### 2. Performance Testing
- [ ] Open Chrome DevTools > Network tab
- [ ] Verify CSS/JS files are loaded from cache on second visit
- [ ] Check that FullCalendar only loads when scrolling to booking section
- [ ] Verify lazy loading works for images

#### 3. Header Verification
```bash
# Check cache headers
curl -I https://www.rajala-services.com/css/main.css

# Check security headers
curl -I https://www.rajala-services.com/

# Expected headers:
# - Cache-Control: public, max-age=31536000, immutable (for CSS/JS/images)
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: SAMEORIGIN
# - Referrer-Policy: strict-origin-when-cross-origin
# - Content-Security-Policy: [full policy]
```

#### 4. PWA Testing
- [ ] Open site in Chrome mobile
- [ ] Check for "Install App" prompt
- [ ] Test offline functionality (go offline, reload page)
- [ ] Verify manifest.json loads correctly

#### 5. Accessibility Testing
- [ ] Tab through navigation with keyboard
- [ ] Test skip-to-content link (press Tab on page load)
- [ ] Verify ARIA attributes with screen reader (if available)
- [ ] Check color contrast

### Lighthouse Audit (Within 2 hours)

```bash
# Run Lighthouse audit
npx lighthouse https://www.rajala-services.com/ --view

# Target scores:
# Performance: 85-95+ (mobile), 95-100 (desktop)
# Accessibility: 95-100
# Best Practices: 95-100
# SEO: 95-100
```

Expected improvements:
- Performance: +25-35 points on mobile, +15-20 on desktop
- Accessibility: +5-10 points
- Best Practices: +5-10 points

### PageSpeed Insights (Within 2 hours)

Visit: https://pagespeed.web.dev/
Test URL: https://www.rajala-services.com/

Expected Core Web Vitals:
- [ ] LCP: <2.5s (Good)
- [ ] FID: <100ms (Good)
- [ ] CLS: <0.1 (Good)
- [ ] FCP: <1.8s (Good)
- [ ] TTFB: <800ms (Good)

### Analytics Setup (Within 24 hours)

#### Google Analytics
- [ ] Verify Web Vitals events appear in GA4
- [ ] Check event names: LCP, FID, CLS, FCP, TTFB
- [ ] Set up custom reports for Core Web Vitals

#### Google Search Console
- [ ] Check Core Web Vitals report (data appears after ~24 hours)
- [ ] Monitor for any new errors
- [ ] Check mobile usability

### Extended Testing (Within 1 week)

#### Cross-Browser Testing
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

#### Device Testing
- [ ] iPhone (Safari)
- [ ] Android phone (Chrome)
- [ ] iPad (Safari)
- [ ] Android tablet (Chrome)

#### Performance Monitoring
- [ ] Monitor page load times in Analytics
- [ ] Check for JavaScript errors in console
- [ ] Monitor Service Worker errors
- [ ] Track Core Web Vitals trends

## Rollback Plan

If issues are detected:

### Quick Rollback
```bash
# Rollback to previous version
firebase hosting:rollback
```

### Manual Fix
1. Identify the issue
2. Fix in local environment
3. Test locally
4. Deploy fix
5. Re-test

## Success Criteria

### Performance
- [x] Page weight reduced by >50%
- [ ] PageSpeed score improved by >20 points
- [ ] LCP < 2.5s
- [ ] FCP < 1.8s
- [ ] CLS < 0.1

### Functionality
- [ ] All pages load correctly
- [ ] Booking calendar works
- [ ] Forms submit successfully
- [ ] Navigation works on mobile and desktop
- [ ] Images display correctly

### PWA
- [ ] Service Worker active
- [ ] Offline page works
- [ ] App can be installed
- [ ] Manifest loads correctly

### Analytics
- [ ] Core Web Vitals tracking active
- [ ] GA4 receiving events
- [ ] No JavaScript errors

## Support Contacts

- **Technical Issues**: [Your contact]
- **Analytics Issues**: [Your contact]
- **Firebase Support**: https://firebase.google.com/support

## Notes

- All optimizations are non-breaking and backwards compatible
- Service Worker will update automatically on next visit
- Old cached resources will be cleaned up by Service Worker
- First visit after deployment may be slightly slower as new assets are cached

## Monitoring Schedule

### Daily (First Week)
- Check Google Analytics for errors
- Monitor Core Web Vitals in Search Console
- Check PageSpeed Insights

### Weekly (First Month)
- Run Lighthouse audit
- Review Core Web Vitals trends
- Monitor conversion rates

### Monthly (Ongoing)
- Full performance audit
- Update optimization targets
- Review and update Service Worker cache

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Verification Completed**: _____________
**Issues Found**: _____________
**Rollback Required**: Yes / No
