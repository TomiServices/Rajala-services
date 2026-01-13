# Mobile Calendar Testing Guide

## Critical Mobile Fix Verification

This guide helps you verify that the mobile calendar fix is working correctly.

## What Was Fixed

**The Problem**: Mobile users could not select time slots because the time selection modal was hidden by CSS.

**The Fix**: Changed CSS to allow the modal to display when the user taps on a calendar date.

## How to Test

### Prerequisites
- Access to mobile devices (iOS and/or Android)
- Access to the website: https://fixnero.fi
- Navigate to the booking calendar section (Ajanvaraus)

### Test Procedure

#### Step 1: Navigate to Booking Calendar
1. Open the website on your mobile device
2. Scroll down to "Varaa aika silmäterällesi" section
3. **VERIFY**: Calendar is visible

#### Step 2: Test Date Selection
1. Tap on any weekday (Monday-Friday) on the calendar
2. **EXPECTED**: A modal (popup) should appear with available time slots
3. **VERIFY**: Modal displays with title "Valitse aika - [date]"
4. **VERIFY**: Time slots are shown in a grid (e.g., 9:00, 10:00, 11:00, etc.)

**If modal does NOT appear**: The fix didn't work - report this immediately

#### Step 3: Test Time Selection
1. Tap on an available time slot (one that's not marked "Varattu")
2. **VERIFY**: Time slot highlights when selected
3. **VERIFY**: "Vahvista" (Confirm) button becomes enabled

#### Step 4: Test Confirmation
1. Tap the "Vahvista" button
2. **VERIFY**: Modal closes
3. **VERIFY**: Selected time appears below the calendar
4. **VERIFY**: Service selection dropdown appears

#### Step 5: Complete Booking Flow (Optional Full Test)
1. Select a service (e.g., "Rengastyöt")
2. Select a task (e.g., "Renkaiden vaihto")
3. Fill in your details (name, email, phone)
4. Check the reCAPTCHA box
5. Click "Vahvista varaus"
6. **VERIFY**: Booking is submitted successfully

### Test Matrix

Complete this checklist for comprehensive testing:

#### iOS Devices
- [ ] iPhone (Safari) - Latest iOS version
- [ ] iPhone (Chrome) - Latest iOS version  
- [ ] iPad (Safari) - Latest iOS version
- [ ] iPad (Chrome) - Latest iOS version

#### Android Devices
- [ ] Android Phone (Chrome) - Latest Android version
- [ ] Android Phone (Samsung Internet) - Latest Android version
- [ ] Android Tablet (Chrome) - Latest Android version

#### Orientations
- [ ] Portrait mode
- [ ] Landscape mode

## Expected vs. Actual Behavior

### Before Fix (BROKEN)
❌ **User Action**: Tap on calendar date  
❌ **Result**: Nothing happens, modal doesn't appear  
❌ **Problem**: User cannot proceed with booking on mobile

### After Fix (WORKING)
✅ **User Action**: Tap on calendar date  
✅ **Result**: Modal appears with time slots  
✅ **Success**: User can select time and complete booking

## Visual Indicators

### What the Modal Should Look Like

```
┌─────────────────────────────────────┐
│  Valitse aika - maanantai 11.11.   │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  9:00    │  │  10:00   │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  11:00   │  │  12:00   │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  [etc...]                           │
│                                     │
├─────────────────────────────────────┤
│  [ Peruuta ]      [ Vahvista ]      │
└─────────────────────────────────────┘
```

**Key Elements**:
1. **Header**: Shows selected date
2. **Time slots**: Grid of available times
3. **Buttons**: Cancel and Confirm at bottom

### Booked Slots
Booked time slots should appear:
- **Color**: Gray/faded
- **Text**: "9:00 (Varattu)"
- **Interaction**: Cannot be selected

## Troubleshooting

### Modal Still Not Appearing?

**Check 1**: Browser Cache
- Clear browser cache and reload
- Try in private/incognito mode

**Check 2**: CSS Verification
Open browser developer tools (if available on mobile) and check:
```css
.mobile-time-modal.active {
    display: flex !important;  /* Should be flex, not none */
}
```

**Check 3**: JavaScript Errors
- Check browser console for errors
- Look for errors related to `showMobileTimeModal`

### Modal Appears But Time Slots Don't Work?

**Check**: 
- Ensure you're tapping on available (non-gray) time slots
- Verify "Vahvista" button enables after selection
- Check for JavaScript errors in console

## Success Criteria

✅ **Test is PASSED if**:
1. Modal appears when tapping calendar dates
2. Time slots can be selected
3. Confirm button works
4. Selected time appears in booking form
5. Complete booking flow works end-to-end

❌ **Test is FAILED if**:
1. Modal does not appear when tapping dates
2. Modal appears but is blank/empty
3. Time slots cannot be selected
4. Confirm button doesn't work
5. Booking flow breaks at any point

## Reporting Results

### If Test PASSES
Report success with:
- Device tested (e.g., "iPhone 13, iOS 17, Safari")
- All steps completed successfully
- Any notes about user experience

### If Test FAILS
Report failure with:
- Device tested
- Exact step where it failed
- What happened vs. what should have happened
- Screenshot if possible
- Browser console errors if available

## Additional Notes

### Weekend Dates
- Weekends (Saturday, Sunday) should be disabled
- Tapping weekend dates should do nothing or show an error

### Past Dates
- Past dates should be disabled
- Tapping past dates should show an error message

### Error Messages
Expected error messages:
- "Valitse arkipäivä (maanantai-perjantai)!" - for weekend selection
- "Et voi valita mennyttä päivämäärää!" - for past date selection

## Contact

If you encounter issues during testing:
1. Document the issue with screenshots
2. Note the device and browser used
3. Record any error messages
4. Report to the development team

---

**Testing Date**: _________
**Tester Name**: _________
**Result**: ☐ PASS  ☐ FAIL
**Notes**: _________________________________________
