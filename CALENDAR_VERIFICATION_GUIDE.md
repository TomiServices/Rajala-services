# Calendar Visual Verification Guide

## What to Look For After Deployment

### Desktop View (Browser width > 769px)

#### Before Issues:
- ❌ Calendar rows and cells misaligned
- ❌ Inconsistent "+1 more", "+2 more" texts scattered around
- ❌ Unorganized layout
- ❌ Unprofessional appearance

#### After Fixes - What You Should See:
- ✅ All calendar cells perfectly aligned in grid
- ✅ NO "+X more" links anywhere in the calendar
- ✅ All day numbers visible in upper-right of each cell
- ✅ Events/availability indicators displayed cleanly
- ✅ Consistent cell heights (min 80px)
- ✅ Clean, professional calendar appearance
- ✅ Weekday headers (Ma, Ti, Ke, To, Pe, La, Su) at top
- ✅ Weekend days (La, Su) slightly dimmed

### Mobile View (Browser width < 768px)

#### Before Issues:
- ❌ First day of month missing day number
- ❌ Available times text positioned higher on first day
- ❌ Weekday labels missing or invisible at top

#### After Fixes - What You Should See:
- ✅ First day cell shows its day number (1, 2, 3, etc.)
- ✅ Available times text aligned consistently across all days
- ✅ Weekday headers VISIBLE at top: Ma, Ti, Ke, To, Pe, La, Su
- ✅ Headers in dark text on light background
- ✅ All day cells have proper spacing and alignment
- ✅ NO "+X more" links

## How to Test

### Desktop Testing Steps:

1. **Open the website** on desktop browser
2. **Navigate to booking section** (Varaa aika)
3. **Select any service** from dropdown
4. **Calendar should appear** - verify:
   - Grid cells are aligned
   - No "+X more" texts visible
   - Day numbers in all cells
   - Clean, organized appearance

5. **Click a weekday** (Monday-Friday)
   - Time slots should appear
   - Booking flow continues normally

6. **Check different browsers:**
   - Chrome
   - Firefox
   - Safari (if on Mac)
   - Edge

### Mobile Testing Steps:

1. **Open on mobile device** OR use browser dev tools mobile mode
2. **Navigate to booking section**
3. **Select a service**
4. **Verify weekday headers:**
   - Look for: Ma | Ti | Ke | To | Pe | La | Su
   - Should be dark text on light gray background
   - Should be at the very top of calendar

5. **Check first day of month:**
   - Should show day number (1)
   - Text should be aligned same as other days
   - No layout differences from other cells

6. **Tap any weekday:**
   - Modal should open with time selection
   - Booking flow continues

7. **Test both orientations:**
   - Portrait mode
   - Landscape mode

### What to Screenshot

Please take and share these screenshots:

**Desktop:**
1. Full calendar view showing 2 months
2. Close-up of calendar cells (to verify alignment)
3. Calendar with a date selected

**Mobile:**
1. Calendar view showing weekday headers at top
2. First week of month (to verify first-day cell)
3. Calendar with modal time selection open

## Common Issues to Watch For

### If weekday headers still not visible on mobile:
- Check browser console for JavaScript errors
- Verify FullCalendar library loaded successfully
- Try clearing browser cache

### If "+X more" still appears:
- This would indicate FullCalendar CSS override not working
- Check browser dev tools to see if CSS is being applied
- Verify no conflicting CSS from other sources

### If cells still misaligned on desktop:
- Check if FullCalendar version is compatible
- Verify CSS is loading (check Network tab in dev tools)
- Look for console errors

## Expected Behavior Checklist

After deployment, verify these work:

- [ ] Desktop: Calendar displays cleanly with no "+X more"
- [ ] Desktop: All cells aligned in proper grid
- [ ] Desktop: Can select date and see time slots
- [ ] Mobile: Weekday headers visible (Ma, Ti, Ke, etc.)
- [ ] Mobile: First day shows day number
- [ ] Mobile: Can tap date to open time modal
- [ ] Both: Booking flow completes successfully
- [ ] Both: No console errors
- [ ] Both: Page loads quickly
- [ ] Both: Firebase/Google Calendar integration works

## Rollback Plan

If issues occur after deployment:

1. Check browser console for errors
2. Verify FullCalendar CDN is loading
3. If critical issues, revert these commits:
   - 1ab923a - "Fix calendar layout issues on desktop and mobile"
   - 9850f6f - "Add implementation summary document"

## Support

For any issues or questions about these changes:
- Review `CALENDAR_IMPROVEMENTS_SUMMARY.md` for technical details
- Check browser console for error messages
- Test on different browsers/devices to isolate issue
