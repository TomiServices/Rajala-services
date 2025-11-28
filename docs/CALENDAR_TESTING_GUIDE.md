# Booking Calendar Testing Guide

## Overview
This document provides comprehensive testing procedures for the booking calendar functionality after the error handling and fallback mechanism improvements.

## Test Environment Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Mobile device or browser DevTools for mobile testing
- Ad blocker extension (for testing fallback scenarios)

### Test Data
- Test booking times: Weekdays between 9:00-17:00
- Valid phone format: +358 401234567
- Valid email: test@example.com

## Test Scenarios

### 1. Normal Calendar Operation (FullCalendar Loads Successfully)

#### Desktop Testing
1. **Navigate to booking section**
   - Go to `index.html#ajanvaraus`
   - Verify calendar renders within 2 seconds
   - Check for no console errors

2. **Calendar interaction**
   - Click on a future weekday date
   - Verify time slots appear for selected date
   - Confirm only available times are shown (9:00-17:00)
   - Check that past dates are disabled

3. **Time selection**
   - Select an available time slot
   - Verify selection is highlighted
   - Check that service dropdown appears

4. **Service selection**
   - Select a service type
   - Select a specific task
   - Verify price displays correctly
   - Test "Add another service" functionality

5. **Booking form**
   - Fill in all required fields
   - Complete reCAPTCHA
   - Submit booking
   - Verify success message appears

#### Mobile Testing
1. **Touch interaction**
   - Tap on calendar date
   - Verify mobile time modal appears
   - Select a time slot
   - Confirm time modal closes and selection persists

2. **Form usability**
   - Test form field focus and input
   - Verify virtual keyboard doesn't obscure fields
   - Test reCAPTCHA on mobile
   - Complete booking flow

### 2. Fallback Calendar (FullCalendar Blocked)

#### Setup
1. Enable ad blocker or privacy extension
2. Configure to block cdn.jsdelivr.net
3. Reload page

#### Testing
1. **Error detection**
   - Verify informative error message appears
   - Check that fallback calendar is shown
   - Confirm contact information is displayed

2. **Fallback calendar functionality**
   - Test clicking on mock calendar slots
   - Verify time selection works
   - Complete booking with fallback calendar

3. **User experience**
   - Verify messaging is friendly and non-technical
   - Check that alternative contact methods are prominent
   - Ensure no confusing technical errors are shown

### 3. reCAPTCHA Failure Scenarios

#### Setup
1. Block www.google.com/recaptcha
2. Reload booking page

#### Testing
1. **Error handling**
   - Verify appropriate error message appears
   - Check that booking form is still accessible
   - Confirm alternative contact methods are shown

2. **Form submission**
   - Attempt to submit without reCAPTCHA
   - Verify helpful error message appears
   - Test that retry mechanism works if unblocked

### 4. Cross-Browser Testing

Test on:
- ✓ Chrome/Edge (Chromium)
- ✓ Firefox
- ✓ Safari (macOS/iOS)
- ✓ Mobile browsers (iOS Safari, Chrome Android)

Verify:
- Calendar renders correctly
- Touch events work properly
- Error messages display correctly
- reCAPTCHA functions as expected

### 5. Performance Testing

1. **Load times**
   - Initial page load: < 3 seconds
   - Calendar render: < 2 seconds
   - FullCalendar lazy load: < 1 second after scroll

2. **Console monitoring**
   - Check for no unexpected errors
   - Verify retry logic logs appropriately
   - Confirm graceful error handling

### 6. Accessibility Testing

1. **Keyboard navigation**
   - Tab through calendar controls
   - Use arrow keys in calendar
   - Submit form with keyboard only

2. **Screen reader**
   - Verify calendar has appropriate ARIA labels
   - Check that error messages are announced
   - Test form labels and instructions

## Expected Behaviors

### Success Criteria
- ✓ Calendar loads within 2 seconds on good connection
- ✓ Retry mechanism attempts 2 times before fallback
- ✓ User-friendly error messages appear on failures
- ✓ Fallback calendar provides full booking functionality
- ✓ Mobile touch interactions work smoothly
- ✓ No silent failures or undefined errors
- ✓ Alternative contact methods always visible on errors

### Known Limitations
- Mock calendar shows limited dates (for testing purposes)
- Fallback calendar may have simplified styling
- reCAPTCHA must load for submission security

## Debugging

### Console Logging
Look for these indicators:
- `✓ FullCalendar loaded successfully` - Successful load
- `✗ Failed to load FullCalendar` - Load failure
- `Attempting to load FullCalendar (attempt X/2)` - Retry in progress
- `FullCalendar failed to load after maximum attempts` - Fallback triggered

### Common Issues

1. **Calendar doesn't appear**
   - Check console for CDN blocking
   - Verify `initializeBookingSystem` is called
   - Check that calendar element exists in DOM

2. **Time slots don't populate**
   - Verify date selection event fired
   - Check booking data fetch succeeded
   - Confirm date validation passed

3. **Booking submission fails**
   - Check reCAPTCHA loaded correctly
   - Verify all required fields filled
   - Check network tab for API errors

## Test Results Template

```markdown
## Test Results - [Date]

**Tester:** [Name]
**Browser:** [Browser + Version]
**Device:** [Desktop/Mobile Model]

### Desktop Tests
- [ ] Calendar loads successfully
- [ ] Date selection works
- [ ] Time slot selection works
- [ ] Service selection works
- [ ] Booking submission works
- [ ] Error handling tested

### Mobile Tests
- [ ] Touch interactions work
- [ ] Mobile modal appears
- [ ] Form is usable
- [ ] reCAPTCHA works

### Fallback Tests
- [ ] Error messages appear
- [ ] Fallback calendar shown
- [ ] Alternative contacts visible
- [ ] Retry logic functions

### Issues Found
1. [Description]
2. [Description]

### Overall Status
[ ] PASS / [ ] FAIL

**Notes:**
[Additional observations]
```

## Maintenance Notes

### Code Locations
- **Main calendar logic**: `booking-system.js`
- **FullCalendar loading**: `index.html` (script block near end)
- **Fallback calendar**: `index.html` (mock-calendar div)
- **Error handling**: `booking-system.js` lines 1136-1530

### Future Improvements
1. Consider self-hosting FullCalendar library
2. Add more sophisticated retry backoff
3. Implement server-side booking validation
4. Add booking confirmation emails
5. Create admin booking management interface

## Support

For issues or questions:
- Email: info@fixnero.fi
- Phone: 040 1935001
- GitHub Issues: [Repository URL]
