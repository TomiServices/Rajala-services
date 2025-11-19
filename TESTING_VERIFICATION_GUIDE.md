# Calendar UI Refinement - Testing & Verification Guide

## Overview

This document provides step-by-step instructions for testing and verifying the calendar UI refinements implemented in this PR.

## Pre-Testing Requirements

### Environment Setup
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Access to the deployed application or local development server
- Device for mobile testing (or browser dev tools responsive mode)

### Test Data Requirements
- No specific test data needed
- Calendar will display current month/weeks
- No bookings required to verify visual changes

## Test Cases

### Test Case 1: Desktop View - Single Month Display

**Objective:** Verify that desktop view shows only 1 month instead of 2 months side-by-side

**Steps:**
1. Open the application in a desktop browser (screen width > 768px)
2. Navigate to the booking section (Ajanvaraus)
3. Observe the calendar display

**Expected Results:**
- ✅ Calendar displays only 1 month
- ✅ Month shows current month
- ✅ No side-by-side month layout
- ✅ Calendar is centered and easy to read
- ✅ No navigation arrows visible (desktop view)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 2: Desktop View - Weekend Visibility

**Objective:** Verify that weekends are visible but grayed-out on desktop

**Steps:**
1. Open the application in a desktop browser (screen width > 768px)
2. Navigate to the booking section
3. Observe the weekend columns (Saturday and Sunday)

**Expected Results:**
- ✅ Saturday column is visible
- ✅ Sunday column is visible
- ✅ Weekend cells have gray background (#f9f9f9)
- ✅ Weekend cells appear dimmed (opacity: 0.7)
- ✅ Weekday cells are white/normal
- ✅ Clear visual distinction between weekdays and weekends

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 3: Desktop View - Weekend Selection Disabled

**Objective:** Verify that weekends cannot be selected

**Steps:**
1. Open the application in a desktop browser
2. Navigate to the booking section
3. Move mouse over a weekend cell
4. Attempt to click on a weekend cell

**Expected Results:**
- ✅ Mouse cursor shows "not-allowed" icon over weekends
- ✅ Clicking a weekend does NOT select the date
- ✅ No time selection form appears
- ✅ Weekend cells remain unselectable

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 4: Desktop View - Weekday Selection Enabled

**Objective:** Verify that weekdays can still be selected normally

**Steps:**
1. Open the application in a desktop browser
2. Navigate to the booking section
3. Move mouse over a weekday cell (Monday-Friday)
4. Click on a weekday cell

**Expected Results:**
- ✅ Mouse cursor shows pointer over weekdays
- ✅ Clicking a weekday selects the date
- ✅ Time selection or next step appears
- ✅ Booking flow continues normally

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 5: Mobile View - Two Week Display

**Objective:** Verify that mobile view shows 2 weeks (unchanged from before)

**Steps:**
1. Open the application in a mobile browser or use responsive mode (width < 768px)
2. Navigate to the booking section
3. Observe the calendar display

**Expected Results:**
- ✅ Calendar displays 2 weeks
- ✅ Navigation arrows visible (prev/next)
- ✅ Current week and next week shown
- ✅ Layout is optimized for mobile screen

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 6: Mobile View - Weekend Visibility

**Objective:** Verify that weekends are visible but grayed-out on mobile

**Steps:**
1. Open the application in mobile browser (width < 768px)
2. Navigate to the booking section
3. Observe the weekend columns (Saturday and Sunday)

**Expected Results:**
- ✅ Saturday column is visible in each week
- ✅ Sunday column is visible in each week
- ✅ Weekend cells have gray background
- ✅ Weekend cells appear dimmed
- ✅ Weekday cells are normal
- ✅ Clear visual distinction between weekdays and weekends

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 7: Mobile View - Weekend Selection Disabled

**Objective:** Verify that weekends cannot be selected on mobile

**Steps:**
1. Open the application in mobile browser
2. Navigate to the booking section
3. Tap on a weekend cell

**Expected Results:**
- ✅ Tapping a weekend does NOT select the date
- ✅ No time selection form appears
- ✅ Weekend cells remain unselectable
- ✅ No visual feedback on tap

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 8: Mobile View - Weekday Selection Enabled

**Objective:** Verify that weekdays can be selected on mobile

**Steps:**
1. Open the application in mobile browser
2. Navigate to the booking section
3. Tap on a weekday cell (Monday-Friday)

**Expected Results:**
- ✅ Tapping a weekday selects the date
- ✅ Time selection or next step appears
- ✅ Booking flow continues normally
- ✅ Touch interaction is responsive

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 9: Mobile View - Week Navigation

**Objective:** Verify that week navigation works on mobile

**Steps:**
1. Open the application in mobile browser
2. Navigate to the booking section
3. Click "Next" arrow to move to future weeks
4. Click "Prev" arrow to move to previous weeks

**Expected Results:**
- ✅ Next arrow shows next 2 weeks
- ✅ Prev arrow shows previous 2 weeks
- ✅ Weekends remain grayed-out in all views
- ✅ Navigation is smooth and responsive

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 10: Responsive Breakpoint

**Objective:** Verify smooth transition between desktop and mobile views

**Steps:**
1. Open the application in a desktop browser
2. Open browser developer tools
3. Use responsive design mode
4. Slowly resize window from 1200px to 400px width
5. Observe calendar changes at 768px breakpoint

**Expected Results:**
- ✅ Calendar switches from 1 month to 2 weeks at 768px
- ✅ Layout adjusts smoothly without errors
- ✅ Weekends remain grayed-out in both views
- ✅ No JavaScript errors in console
- ✅ Calendar remains functional

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 11: Complete Booking Flow (Desktop)

**Objective:** Verify that the complete booking process works end-to-end

**Steps:**
1. Open the application in a desktop browser
2. Navigate to booking section
3. Select a service from dropdown
4. Click on a weekday in the calendar
5. Select a time slot
6. Fill in contact information
7. Submit booking

**Expected Results:**
- ✅ Service selection works
- ✅ Date selection works (weekdays only)
- ✅ Time selection appears
- ✅ Contact form appears
- ✅ Booking submits successfully
- ✅ Confirmation message displays
- ✅ Data saves to Firebase
- ✅ Event creates in Google Calendar

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test Case 12: Complete Booking Flow (Mobile)

**Objective:** Verify that the complete booking process works on mobile

**Steps:**
1. Open the application in a mobile browser
2. Navigate to booking section
3. Select a service from dropdown
4. Tap on a weekday in the calendar
5. Select a time slot
6. Fill in contact information
7. Submit booking

**Expected Results:**
- ✅ Service selection works
- ✅ Date selection works (weekdays only)
- ✅ Time selection appears
- ✅ Contact form appears
- ✅ Booking submits successfully
- ✅ Confirmation message displays
- ✅ Mobile interactions are smooth

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Visual Verification Checklist

Use this checklist to verify the visual appearance:

### Desktop (> 768px)
- [ ] Calendar shows 1 month only
- [ ] No side-by-side month layout
- [ ] Weekends (Sat, Sun) are visible
- [ ] Weekend cells have gray background
- [ ] Weekend cells appear dimmed (less opaque)
- [ ] Weekday cells are white/bright
- [ ] Calendar is centered and well-proportioned
- [ ] No navigation buttons (display-only)

### Mobile (< 768px)
- [ ] Calendar shows 2 weeks
- [ ] Navigation arrows present (prev/next)
- [ ] Weekends (Sat, Sun) are visible
- [ ] Weekend cells have gray background
- [ ] Weekend cells appear dimmed
- [ ] Weekday cells are normal
- [ ] Layout fits screen width
- [ ] Touch targets are appropriately sized

## Browser Compatibility Testing

Test on the following browsers:

| Browser | Version | Desktop | Mobile | Status |
|---------|---------|---------|--------|--------|
| Chrome | Latest | [ ] Pass | [ ] Pass | |
| Firefox | Latest | [ ] Pass | [ ] Pass | |
| Safari | Latest | [ ] Pass | [ ] Pass | |
| Edge | Latest | [ ] Pass | [ ] Pass | |

## Performance Verification

- [ ] Calendar renders within 2 seconds
- [ ] No console errors during calendar initialization
- [ ] No console errors during date selection
- [ ] Smooth transitions between views
- [ ] No memory leaks (check browser dev tools)

## Integration Verification

- [ ] Firebase connection works
- [ ] Google Calendar sync works
- [ ] Booking data saves correctly
- [ ] Email notifications send (if applicable)
- [ ] No errors in Firebase console
- [ ] No errors in Google Cloud console

## Accessibility Verification

- [ ] Calendar is keyboard navigable
- [ ] Screen reader announces calendar state
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG standards
- [ ] Weekend disabled state is announced

## Known Issues

Document any issues found during testing:

1. Issue:
   - Description:
   - Severity: [ ] Critical [ ] High [ ] Medium [ ] Low
   - Workaround:

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA Tester | | | |
| Product Owner | | | |

## Notes

Add any additional observations or comments:

---

## Quick Visual Test (5 minutes)

For a quick verification, perform these essential checks:

1. **Desktop**: Open site → Navigate to booking → Observe calendar
   - ✅ 1 month visible?
   - ✅ Weekends grayed-out?
   - ✅ Can select weekdays?
   - ✅ Cannot select weekends?

2. **Mobile**: Resize to mobile → Observe calendar
   - ✅ 2 weeks visible?
   - ✅ Weekends grayed-out?
   - ✅ Navigation works?
   - ✅ Can select weekdays?

If all quick tests pass, proceed with full test suite.
