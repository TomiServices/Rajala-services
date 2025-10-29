# Temporary Category Box Image Changes

## Overview
The category box background images on the main page (index.html) have been temporarily replaced with high-contrast gradient backgrounds to improve accessibility and meet WCAG contrast requirements.

## What Was Changed
- **Location**: `index.html` lines 622-693 (approximately)
- **Original images**: Dark background photos (Pesupalvelut.webp, Rengastyot.webp, etc.)
- **Temporary replacement**: Vibrant CSS gradient backgrounds
- **Overlay adjustment**: Reduced from 85% to 40% opacity for better text visibility

## Why This Change Was Made
The original background images were too dark and unclear, which:
1. Weakened contrast between text and background
2. Made text harder to read for users with visual impairments
3. Did not meet WCAG AA contrast requirements for accessibility
4. Reduced overall usability of the navigation elements

## How to Restore Original Images

### Option 1: Remove the Temporary CSS Section (Recommended)
1. Open `index.html`
2. Find the section marked with:
   ```css
   /* TEMPORARY: High-contrast category box backgrounds for accessibility */
   ```
3. Delete everything between the comment markers:
   - Start: `/* TEMPORARY: High-contrast category box backgrounds... */`
   - End: `/* END TEMPORARY SECTION */`
4. Also restore the original overlay by finding and replacing:
   ```css
   /* TEMPORARY: Lighter hover overlay for new high-contrast backgrounds */
   .category-box:hover::after {
       background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 100%);
   }
   ```
   With the commented-out original:
   ```css
   .category-box:hover::after {
       background: linear-gradient(to top, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.25) 100%);
   }
   ```

### Option 2: Comment Out the Temporary Section
If you want to keep the code for future reference:
1. Open `index.html`
2. Add `/*` before the `/* TEMPORARY:` comment
3. Add `*/` after the `/* END TEMPORARY SECTION */` comment

## Original Image Files
The original background images are still in the repository:
- Pesupalvelut.webp
- Rengastyot.webp
- Korjaustyot.webp
- sisapuhdistus.webp
- kiilloitus.webp
- lasikorjaus.webp
- Tyonaytteet.webp
- Ajanvaraus.webp
- hinnasto.webp
- yhteystiedot.webp

These files have NOT been modified or deleted, so they can be used immediately after removing the CSS overrides.

## Testing After Restoration
After restoring the original images:
1. Clear your browser cache
2. Reload the page
3. Verify that the original images are displayed in the category boxes
4. Test hover interactions to ensure they work correctly

## Contrast Requirements for Future Images
If you create new permanent images to replace the originals, ensure they meet these requirements:
- **WCAG AA Large Text**: Minimum 3:1 contrast ratio
- **Recommended**: 4.5:1 or higher for better accessibility
- Use lighter/brighter images or add a stronger dark overlay
- Test with tools like WebAIM Contrast Checker

## Questions?
If you need assistance with restoring the original images or have questions about accessibility requirements, please refer to the WCAG 2.1 guidelines or consult with a web accessibility specialist.

---
**Last Updated**: 2025-10-29
**Change Author**: GitHub Copilot Agent
**Related Issue**: Category box images too dark and unclear
