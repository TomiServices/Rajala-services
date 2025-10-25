# Lighthouse Testing Guide - Fixnero Website

**Purpose:** Instructions for testing SEO, performance, accessibility, and best practices after deployment.

---

## Quick Testing Steps

### 1. Open Chrome DevTools

1. Open the website in Google Chrome
2. Press `F12` or right-click → "Inspect"
3. Click on the "Lighthouse" tab (may be under >> menu)

### 2. Configure Lighthouse

**Settings:**
- ✅ Performance
- ✅ Accessibility  
- ✅ Best Practices
- ✅ SEO
- Device: Both Mobile and Desktop
- Throttling: Simulated throttling (default)

### 3. Run the Test

Click "Analyze page load" and wait for results (30-60 seconds)

### 4. Target Scores

| Category | Target | Current Baseline |
|----------|--------|------------------|
| Performance | 90+ | To be tested |
| Accessibility | 90+ | Expected: 95+ |
| Best Practices | 90+ | Expected: 95+ |
| SEO | 90+ | Previous: 69%, Target: 90+ |

---

## Expected SEO Improvements

### What Lighthouse SEO Checks

1. **Document has a valid `<title>` element** ✅
2. **Document has a meta description** ✅
3. **Page has successful HTTP status code** ✅
4. **Links have descriptive text** ✅
5. **Page isn't blocked from indexing** ✅
6. **Document has a valid `rel=canonical`** ✅
7. **`<html>` has a `lang` attribute** ✅
8. **Document uses legible font sizes** ✅
9. **Tap targets are appropriately sized** ✅
10. **`[user-scalable="no"]` is not used** ✅
11. **Structured data is valid** ✅

### Our Optimizations That Impact SEO Score

✅ **Meta Tags**
- Title optimized for all pages
- Descriptions within pixel limits
- Canonical URLs present

✅ **Heading Structure**
- Single H1 per page (keyword-rich on homepage)
- Logical H2-H4 hierarchy
- No skipped heading levels

✅ **Mobile-Friendly**
- Responsive design
- Touch-friendly buttons (48x48px)
- No horizontal scrolling
- Legible fonts (16px+)

✅ **Structured Data**
- LocalBusiness schema
- Review schema (3 reviews)
- FAQPage schema
- Service schemas

✅ **Images**
- All have descriptive alt text
- WebP format for performance
- Lazy loading implemented

---

## How to Read Results

### SEO Score Breakdown

**90-100**: Excellent (Green)
- All best practices followed
- No issues found
- Ready for production

**50-89**: Needs Improvement (Orange)
- Some optimizations missing
- Review recommendations
- Implement suggested fixes

**0-49**: Poor (Red)
- Major issues present
- Critical fixes needed
- Do not deploy

### Common Issues & Fixes

#### Issue: "Links do not have descriptive text"
**Fix:** Avoid "click here", "read more" - use descriptive anchor text
**Status:** ✅ We use "Lue lisää pesupalveluista →", "Varaa aika", etc.

#### Issue: "Document doesn't have a meta description"
**Fix:** Add unique meta description to each page
**Status:** ✅ All pages have unique Finnish meta descriptions

#### Issue: "Image elements do not have [alt] attributes"
**Fix:** Add descriptive alt text to all images
**Status:** ✅ All images have Finnish alt text

#### Issue: "`<html>` element does not have a [lang] attribute"
**Fix:** Add `lang="fi"` to html tag
**Status:** ✅ All pages have `lang="fi"`

---

## Testing Checklist

### Desktop Testing

- [ ] Run Lighthouse in Desktop mode
- [ ] Check SEO score (target: 90+)
- [ ] Check Performance score (target: 90+)
- [ ] Check Accessibility score (target: 90+)
- [ ] Check Best Practices score (target: 90+)
- [ ] Review any warnings or suggestions
- [ ] Take screenshots of results

### Mobile Testing

- [ ] Run Lighthouse in Mobile mode
- [ ] Check SEO score (target: 90+)
- [ ] Check Performance score (target: 80+)
- [ ] Check Accessibility score (target: 90+)
- [ ] Check Best Practices score (target: 90+)
- [ ] Review mobile-specific issues
- [ ] Take screenshots of results

### Additional Validations

- [ ] **W3C HTML Validator**: https://validator.w3.org/
  - Upload index.html
  - Check for errors (should be 0 errors)

- [ ] **Google Rich Results Test**: https://search.google.com/test/rich-results
  - Test index.html for LocalBusiness schema
  - Test index.html for Review schema
  - Test index.html for FAQPage schema
  - Should show green checkmarks

- [ ] **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
  - Test all main pages
  - Should pass "Page is mobile-friendly"

- [ ] **PageSpeed Insights**: https://pagespeed.web.dev/
  - Test for Core Web Vitals
  - Desktop and Mobile scores
  - Real user data (when available)

---

## Recording Results

### Save Evidence

Create a folder: `/results/lighthouse-YYYY-MM-DD/`

**Save these files:**
1. `desktop-homepage.html` - Full Lighthouse report
2. `mobile-homepage.html` - Full Lighthouse report
3. `desktop-homepage.png` - Screenshot of scores
4. `mobile-homepage.png` - Screenshot of scores
5. `w3c-validation.png` - HTML validation results
6. `rich-results.png` - Schema validation results

### Document Findings

Create: `/results/lighthouse-YYYY-MM-DD/RESULTS.md`

```markdown
# Lighthouse Test Results - [Date]

## Scores

### Desktop
- Performance: XX/100
- Accessibility: XX/100
- Best Practices: XX/100
- SEO: XX/100

### Mobile
- Performance: XX/100
- Accessibility: XX/100
- Best Practices: XX/100
- SEO: XX/100

## Issues Found

[List any warnings or errors]

## Recommendations

[List recommended improvements]

## Status

- [ ] All scores meet 90+ target
- [ ] No critical issues
- [ ] Ready for deployment
```

---

## Troubleshooting

### SEO Score Still Below 90%

**Check:**
1. Are all pages accessible (200 status)?
2. Is robots.txt allowing indexing?
3. Are there any broken links?
4. Is the sitemap.xml valid and submitted?
5. Are meta descriptions unique per page?

### Performance Score Below Target

**Optimize:**
1. Image sizes (already using WebP)
2. Remove unused CSS/JS
3. Enable compression (gzip/brotli)
4. Use CDN (Firebase Hosting already does this)
5. Lazy load non-critical resources

### Accessibility Issues

**Common fixes:**
1. Ensure color contrast ratio ≥ 4.5:1
2. Add ARIA labels where needed
3. Ensure form inputs have labels
4. Test keyboard navigation
5. Check screen reader compatibility

---

## After Testing

### If All Scores Are 90+

✅ **Excellent!** Ready to deploy.

**Next steps:**
1. Document the scores
2. Save reports
3. Merge PR and deploy
4. Submit sitemap to Google Search Console
5. Request indexing of updated pages
6. Monitor rankings over next 2-4 weeks

### If Some Scores Are Below 90%

**Action Plan:**
1. Review Lighthouse recommendations
2. Prioritize high-impact fixes
3. Implement improvements
4. Re-test
5. Repeat until all scores ≥ 90%

---

## Automated Testing (Optional)

### Using Lighthouse CI

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run Lighthouse CI
lhci autorun --collect.url=https://fixnero.fi

# Generate report
lhci upload --target=temporary-public-storage
```

### GitHub Actions (Future Enhancement)

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: treosh/lighthouse-ci-action@v8
        with:
          urls: |
            https://fixnero.fi
            https://fixnero.fi/pesupalvelut.html
          uploadArtifacts: true
```

---

## Resources

### Official Tools
- **Lighthouse**: Built into Chrome DevTools
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **Search Console**: https://search.google.com/search-console
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly
- **Rich Results Test**: https://search.google.com/test/rich-results

### Documentation
- **Lighthouse Scoring**: https://web.dev/performance-scoring/
- **SEO Guide**: https://web.dev/lighthouse-seo/
- **Accessibility Guide**: https://web.dev/accessibility/
- **Core Web Vitals**: https://web.dev/vitals/

### Validators
- **W3C HTML**: https://validator.w3.org/
- **W3C CSS**: https://jigsaw.w3.org/css-validator/
- **Schema.org**: https://validator.schema.org/

---

## Contact

For questions about testing:
1. Review this guide
2. Check official documentation
3. Run tests multiple times (scores can vary ±5 points)
4. Document all findings

---

**Remember:**
- Test from different networks (WiFi, mobile data)
- Test in incognito mode (no extensions)
- Test multiple times for consistency
- Performance scores naturally vary ±5 points
- Focus on consistent 90+ SEO scores

---

*Last Updated: October 25, 2025*
