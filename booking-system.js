// NOTE: No Firebase config in HTML for security. Use server endpoints instead.

// ============================================================================
// RECAPTCHA v3 CONFIGURATION
// ============================================================================
// reCAPTCHA v3 runs invisibly and returns a score (0.0-1.0) indicating likelihood of being a bot
// Higher scores (closer to 1.0) = more likely human, Lower scores (closer to 0.0) = more likely bot
// The site key is embedded in the script tag in index.html
// 
// INTEGRATION: Google reCAPTCHA v3
// Site Key (Public): This key is safe to expose in client-side code
// Secret Key: Stored in Firebase Secret Manager (RECAPTCHA_SECRET)
// Admin Console: https://www.google.com/recaptcha/admin
// Documentation: See INTEGRATIONS_KEY_SUMMARY.md for complete details
const RECAPTCHA_SITE_KEY = '6LdmOggsAAAAABAf1WDZkXGIBazWB3v0WIKNoJGM';

/**
 * Executes reCAPTCHA v3 and returns a token
 * @param {string} action - The action name for this reCAPTCHA check
 * @returns {Promise<string>} - The reCAPTCHA token
 */
async function executeRecaptcha(action) {
    try {
        // Check if grecaptcha is loaded - check for the ready function specifically
        if (typeof grecaptcha === 'undefined') {
            console.error('reCAPTCHA not loaded: grecaptcha is undefined');
            throw new Error('reCAPTCHA ei ole ladattu. Päivitä sivu ja yritä uudelleen.');
        }
        
        if (typeof grecaptcha.ready !== 'function') {
            console.error('reCAPTCHA not ready: grecaptcha.ready is not a function');
            throw new Error('reCAPTCHA ei ole valmis. Päivitä sivu ja yritä uudelleen.');
        }
        
        // Wait for reCAPTCHA to be ready using callback-based approach
        // grecaptcha.ready() accepts a callback function, not a Promise
        return new Promise((resolve, reject) => {
            // Set a timeout in case grecaptcha.ready never calls back
            const timeoutId = setTimeout(() => {
                reject(new Error('Turvavarmennus aikakatkaisu. Päivitä sivu ja yritä uudelleen.'));
            }, 10000); // 10 second timeout
            
            try {
                grecaptcha.ready(() => {
                    clearTimeout(timeoutId);
                    try {
                        grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action })
                            .then(token => {
                                if (!token) {
                                    reject(new Error('Turvavarmennus epäonnistui - token puuttuu'));
                                } else {
                                    resolve(token);
                                }
                            })
                            .catch(executeError => {
                                console.error('reCAPTCHA execute error:', executeError);
                                reject(new Error('Turvavarmennus epäonnistui. Tarkista verkkoyhteytesi ja yritä uudelleen.'));
                            });
                    } catch (innerError) {
                        console.error('reCAPTCHA inner execution error:', innerError);
                        reject(new Error('Turvavarmennus epäonnistui. Päivitä sivu ja yritä uudelleen.'));
                    }
                });
            } catch (readyError) {
                clearTimeout(timeoutId);
                console.error('reCAPTCHA ready error:', readyError);
                reject(new Error('Turvavarmennus ei ole valmis. Päivitä sivu ja yritä uudelleen.'));
            }
        });
    } catch (error) {
        console.error('reCAPTCHA execution error:', error);
        throw error;
    }
}


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates and normalizes a date input to ensure it's a valid Date object
 * FIX: Critical validation function to prevent Invalid Date errors throughout the calendar
 * 
 * @param {Date|string} date - Date to validate (can be Date object or ISO string)
 * @returns {Date|null} - Valid Date object or null if invalid
 * 
 * @example
 * validateDate('2024-12-01') // Returns Date object
 * validateDate(new Date()) // Returns same Date object
 * validateDate('invalid') // Returns null
 */
function validateDate(date) {
    if (!date) return null;
    
    // Convert string to Date if necessary
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    // Validate Date object - check if it's actually a Date and not Invalid Date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return null;
    }
    
    return date;
}

/**
 * Gets a date key in YYYY-MM-DD format for consistent date comparison
 * FIX: Standardizes date format to prevent timezone and comparison issues
 * 
 * @param {Date|string} date - Date to convert
 * @returns {string|null} - Date key in YYYY-MM-DD format or null if invalid
 * 
 * @example
 * getDateKey(new Date('2024-12-01')) // Returns '2024-12-01'
 * getDateKey('2024-12-01T10:30:00') // Returns '2024-12-01'
 */
function getDateKey(date) {
    const validDate = validateDate(date);
    if (!validDate) return null;
    
    const year = validDate.getFullYear();
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const day = String(validDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Fetches data with retry logic using exponential backoff
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<any>} - Response data or null on failure
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (response.ok) {
                return await response.json();
            }
            
            // Handle specific error codes with better messages
            if (response.status === 401) {
                // Try to get Finnish error message from backend
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Turvavarmennus epäonnistui. Yritä uudelleen.');
                } catch (jsonError) {
                    // If parsing fails, use generic message
                    throw new Error('Turvavarmennus epäonnistui. Yritä uudelleen.');
                }
            } else if (response.status === 503) {
                throw new Error(`Palvelu ei ole tällä hetkellä saatavilla (503). Yritä hetken kuluttua uudelleen.`);
            } else if (response.status === 500) {
                // Try to get error message from backend for 500 errors too
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Palvelinvirhe (500). Yritä hetken kuluttua uudelleen.');
                } catch (jsonError) {
                    throw new Error('Palvelinvirhe (500). Yritä hetken kuluttua uudelleen.');
                }
            } else if (response.status === 0) {
                throw new Error(`Yhteysongelma palvelimeen. Tarkista verkkoyhteytesi.`);
            } else {
                // Try to get error details from response
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                } catch (jsonError) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
        } catch (error) {
            lastError = error;
            
            // Check for CORS errors
            if (error.message.includes('CORS') || error.message.includes('NetworkError') || 
                error.message.includes('Failed to fetch')) {
                lastError = new Error('Yhteysongelma palvelimeen. Tarkista, että evästeet ovat sallittuja ja yritä uudelleen.');
            }
            
            // Don't retry on authentication errors (401) or reCAPTCHA errors
            if (error.message.includes('401') || 
                error.message.includes('Turvavarmennus') ||
                error.message.includes('Varmennusvirhe')) {
                console.error('Authentication/reCAPTCHA error, not retrying:', error);
                break;
            }
            
            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break;
            }
            
            // Exponential backoff: wait 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.error(`Fetch failed after ${maxRetries + 1} attempts:`, lastError);
    return null;
}

// ============================================================================
// BOOKING SYSTEM INITIALIZATION
// ============================================================================

// Calendar booking logic (ready for backend API, e.g. Firebase Function)
// Defer heavy initialization until after page load + idle time to minimize main-thread blocking
function initializeBookingSystem() {
    const calendarEl = document.getElementById('calendar');
    
    // Early return if calendar element doesn't exist
    if (!calendarEl) {
        console.error('Calendar element not found. FullCalendar initialization aborted.');
        return;
    }
    
    let selectedSlot = null;

    // Fetch bookings from backend Firebase Function with retry logic
    async function fetchBookings() {
        const data = await fetchWithRetry(
            'https://us-central1-fxnr-web.cloudfunctions.net/bookings',
            {},
            2 // Max 2 retries
        );
        
        if (data) {
            console.log(`Successfully fetched ${data.length} bookings from server`);
            return data;
        }
        
        // Fallback to empty array instead of mock data for production
        // Mock data can cause confusion and inconsistent state
        console.error('Failed to fetch bookings from server - using empty array');
        console.warn('Calendar will show all slots as available until server connection is restored');
        
        // Return empty array - this means all slots will appear available
        // which is better than showing false bookings from mock data
        return [];
    }

    // FIX: Define populateAvailableSlots function to prevent ReferenceError
    // This function is called when the calendar view changes to update available slot indicators
    // The actual slot population for user selection is handled by populateTimeSelectionGrid
    function populateAvailableSlots(calendar, bookings) {
        // This function serves as a placeholder for future enhancements
        // Currently, the calendar's events function handles displaying available slots
        // and populateTimeSelectionGrid handles the actual time selection interface
        
        // Log for debugging purposes
        if (calendar && bookings) {
            console.log('Calendar view updated, available slots are displayed via calendar events');
        }
    }

    // Populate time selection grid with available times for current week
    // Updated to populate for a specific selected date only
    function populateTimeSelectionGrid(selectedDate, bookings) {
        const gridContainer = document.getElementById('time-slots-grid');
        const timeSelectionContainer = document.getElementById('time-selection-grid');
        if (!gridContainer) return false;
        
        gridContainer.innerHTML = '';
        
        // Validate selectedDate using centralized validation
        const validDate = validateDate(selectedDate);
        if (!validDate) {
            console.error('populateTimeSelectionGrid called with invalid date:', selectedDate);
            if (timeSelectionContainer) {
                timeSelectionContainer.style.display = 'none';
            }
            return false;
        }
        
        // Get current date
        const now = new Date();
        
        // Ensure bookings is an array
        bookings = Array.isArray(bookings) ? bookings : [];
        
        const dateKey = getDateKey(validDate);
        if (!dateKey) {
            console.error('Failed to generate dateKey for selectedDate:', validDate);
            if (timeSelectionContainer) {
                timeSelectionContainer.style.display = 'none';
            }
            return false;
        }
        
        const dayBookings = bookings.filter(b => {
            const bookingDateKey = getDateKey(b.aika);
            return bookingDateKey === dateKey;
        });
        
        const isToday = getDateKey(now) === dateKey;
        let hasAvailableSlots = false;
        
        // Generate time slots for business hours (9-17) - only for the selected day
        for (let hour = 9; hour < 17; hour++) {
            const slotTime = new Date(validDate);
            slotTime.setHours(hour, 0, 0, 0);
            
            // Check if slot is in the past
            const isPast = slotTime < now;
            
            // Check if specific slot is booked
            const isSlotBooked = bookings.some(b => {
                const bookingTime = new Date(b.aika);
                return bookingTime.getTime() === slotTime.getTime();
            });
            
            // Skip booked slots entirely (don't show them)
            if (isSlotBooked || isPast) {
                continue;
            }
            
            hasAvailableSlots = true;
            
            const slotBox = document.createElement('div');
            slotBox.className = 'time-slot-box';
            
            // Format display: "9:00", "10:00", etc.
            slotBox.textContent = `${hour}:00`;
            
            // Available slot - add click handler
            // Validate before calling toISOString to prevent RangeError
            slotBox.dataset.datetime = slotTime.toISOString();
            slotBox.dataset.date = dateKey;
            slotBox.dataset.hour = hour;
            
            slotBox.addEventListener('click', function() {
                // Remove previous selection
                document.querySelectorAll('.time-slot-box.selected').forEach(box => {
                    box.classList.remove('selected');
                });
                
                // Select this slot
                this.classList.add('selected');
                
                // Store selected slot globally
                selectedSlot = new Date(slotTime);
                
                // Update the time dropdown
                const selectElement = document.getElementById('availableTimesSelect');
                const labelElement = document.getElementById('availableTimesLabel');
                
                // Clear and populate dropdown with this single time
                selectElement.innerHTML = '';
                const option = document.createElement('option');
                const dayNames = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
                const dayName = dayNames[selectedDate.getDay()];
                option.value = `${hour}:00`;
                option.textContent = `${dayName} ${selectedDate.getDate()}.${selectedDate.getMonth() + 1}. klo ${hour}:00`;
                option.dataset.date = slotTime.toISOString();
                option.dataset.hour = hour;
                option.selected = true;
                selectElement.appendChild(option);
                
                labelElement.textContent = `Valittu aika: ${dayName} ${selectedDate.getDate()}.${selectedDate.getMonth() + 1}. klo ${hour}:00`;
                
                // Show the time dropdown and service selection
                document.getElementById('availableSlots').style.display = 'block';
                
                // Clear any errors
                document.getElementById('error').textContent = '';
                
                // Trigger step 3 reveal by calling showBookingForm
                showBookingForm(slotTime);
            });
            
            gridContainer.appendChild(slotBox);
        }
        
        // Show or hide the time selection container based on availability
        if (timeSelectionContainer) {
            timeSelectionContainer.style.display = hasAvailableSlots ? 'block' : 'none';
        }
        
        return hasAvailableSlots;
    }

    // Mobile device detection utility - enhanced for better mobile/touch detection
    function isMobileDevice() {
        // Primary detection: User agent check for known mobile devices
        const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Secondary detection: Touch capability
        const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Tertiary detection: Screen size (for responsive behavior) 
        const screenSizeCheck = window.innerWidth <= 768;
        
        // Enhanced: Return true if any mobile indicator is present
        // This ensures mobile-like behavior on small screens regardless of touch support
        return userAgentCheck || touchCheck || screenSizeCheck;
    }

    // Mobile time selection variables
    let selectedMobileDate = null;
    let selectedMobileTime = null;
    let isMobile = isMobileDevice();

    // Mobile time selection modal functions (moved outside fetchBookings for global access)
    function showMobileTimeModal(dateStr, dayName, bookings) {
        const modal = document.getElementById('mobileTimeModal');
        const dateHeader = document.getElementById('mobileSelectedDate');
        const slotsContainer = document.getElementById('mobileTimeSlots');
        
        selectedMobileDate = dateStr;
        const formattedDate = new Date(dateStr).toLocaleDateString('fi-FI', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'numeric' 
        });
        dateHeader.textContent = `Valitse aika - ${formattedDate}`;
        
        // Generate time slots for the selected date
        slotsContainer.innerHTML = '';
        const dayBookings = bookings.filter(b => {
            const bookingDate = new Date(b.aika);
            const selectedDate = new Date(dateStr);
            return bookingDate.toDateString() === selectedDate.toDateString();
        });
        
        // Get current date and time for comparison
        const now = new Date();
        const selectedDate = new Date(dateStr);
        const isToday = selectedDate.toDateString() === now.toDateString();
        const currentHour = now.getHours();
        
        // Generate available time slots (9-17)
        for (let hour = 9; hour < 17; hour++) {
            // Skip past time slots if it's today
            if (isToday && hour <= currentHour) {
                continue;
            }
            
            const isBooked = dayBookings.some(b => {
                const bookingHour = new Date(b.aika).getHours();
                return bookingHour === hour;
            });
            
            const slotEl = document.createElement('div');
            slotEl.className = `mobile-time-slot ${isBooked ? 'booked' : ''}`;
            slotEl.textContent = isBooked ? `${hour}:00 (Varattu)` : `${hour}:00`;
            slotEl.dataset.hour = hour;
            
            if (!isBooked) {
                slotEl.addEventListener('click', function() {
                    // Remove previous selection
                    slotsContainer.querySelectorAll('.mobile-time-slot.selected').forEach(el => {
                        el.classList.remove('selected');
                    });
                    // Select this slot
                    this.classList.add('selected');
                    selectedMobileTime = hour;
                    document.getElementById('mobileTimeConfirm').disabled = false;
                });
            } else {
                slotEl.title = 'Tämä aika on jo varattu';
            }
            
            slotsContainer.appendChild(slotEl);
        }
        
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
    
    function hideMobileTimeModal() {
        const modal = document.getElementById('mobileTimeModal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        selectedMobileDate = null;
        selectedMobileTime = null;
        document.getElementById('mobileTimeConfirm').disabled = true;
    }

    // Function to populate time slots for a specific selected date
    function populateTimeSlotsForDate(selectedDate, bookings) {
        const slotsSection = document.getElementById('availableSlots');
        const selectElement = document.getElementById('availableTimesSelect');
        const labelElement = document.getElementById('availableTimesLabel');
        
        if (!selectElement) return false;
        
        // Validate selectedDate using centralized validation
        const validDate = validateDate(selectedDate);
        if (!validDate) {
            console.error('populateTimeSlotsForDate called with invalid date:', selectedDate);
            return false;
        }
        
        // Format the selected date for display
        const formattedDate = validDate.toLocaleDateString('fi-FI', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'numeric' 
        });
        
        // Update label to show selected date
        labelElement.textContent = `Valitse aika - ${formattedDate}:`;
        
        // Clear existing options
        selectElement.innerHTML = '<option value="">Valitse aika...</option>';
        
        // Get bookings for the selected date
        const dateKey = getDateKey(validDate);
        if (!dateKey) {
            console.error('Failed to generate dateKey for selectedDate:', validDate);
            return false;
        }
        
        // Ensure bookings is an array
        bookings = Array.isArray(bookings) ? bookings : [];
        
        const dayBookings = bookings.filter(b => {
            const bookingDateKey = getDateKey(b.aika);
            return bookingDateKey === dateKey;
        });
        
        let hasAvailableSlots = false;
        
        // Get current date and time for comparison
        const now = new Date();
        const isToday = dateKey === getDateKey(now);
        const currentHour = now.getHours();
        
        // Generate time slots for the day (9-17)
        for (let hour = 9; hour < 17; hour++) {
            // Skip past time slots if it's today
            if (isToday && hour <= currentHour) {
                continue;
            }
            
            const isBooked = dayBookings.some(b => {
                const bookingHour = new Date(b.aika).getHours();
                return bookingHour === hour;
            });
            
            const timeSlot = new Date(validDate);
            timeSlot.setHours(hour, 0, 0, 0);
            
            let slotText = `${hour}:00`;
            if (isBooked) {
                slotText += ' (Varattu)';
            } else {
                hasAvailableSlots = true;
            }
            
            const option = document.createElement('option');
            option.value = slotText;
            option.textContent = slotText;
            option.dataset.date = timeSlot.toISOString();
            option.dataset.hour = hour;
            option.disabled = isBooked;
            
            selectElement.appendChild(option);
        }
        
        // Show the time slots section
        slotsSection.style.display = 'block';
        
        return hasAvailableSlots;
    }

    // Updated dropdown event handler for time selection
    function setupDropdownEventListener() {
        const selectElement = document.getElementById('availableTimesSelect');
        if (selectElement) {
            selectElement.addEventListener('change', function() {
                const selectedValue = this.value;
                if (selectedValue && !this.options[this.selectedIndex].disabled) {
                    const selectedOption = this.options[this.selectedIndex];
                    const selectedDate = new Date(selectedOption.dataset.date);
                    const selectedHour = parseInt(selectedOption.dataset.hour);
                    
                    const selectedDateTime = new Date(selectedDate);
                    selectedDateTime.setHours(selectedHour, 0, 0, 0);
                    
                    // Update the label to show selected time in required format
                    const day = selectedDateTime.getDate();
                    const month = selectedDateTime.getMonth() + 1;
                    const hour = selectedDateTime.getHours();
                    const minute = selectedDateTime.getMinutes();
                    
                    const labelElement = document.getElementById('availableTimesLabel');
                    labelElement.textContent = `Valittu aika: ${day}.${month.toString().padStart(2, '0')} ${hour}:${minute.toString().padStart(2, '0')}`;
                    
                    // Show service selection dropdown
                    const serviceSelection = document.getElementById('serviceSelection');
                    serviceSelection.style.display = 'block';
                    
                    // Update calendar selection (if calendar exists)
                    if (window.calendar && window.calendar.unselect && window.calendar.select) {
                        const endTime = new Date(selectedDateTime.getTime() + 60 * 60 * 1000);
                        window.calendar.unselect();
                        window.calendar.select(selectedDateTime, endTime);
                    }
                }
            });
        }
    }
    
    function confirmMobileTimeSelection(calendar) {
        if (selectedMobileDate && selectedMobileTime !== null) {
            const selectedDateTime = new Date(selectedMobileDate);
            selectedDateTime.setHours(selectedMobileTime, 0, 0, 0);
            
            // Store selected slot globally
            selectedSlot = selectedDateTime;
            
            // Update the time dropdown to show selected time
            const selectElement = document.getElementById('availableTimesSelect');
            const labelElement = document.getElementById('availableTimesLabel');
            
            // Format time for display
            const day = selectedDateTime.getDate();
            const month = selectedDateTime.getMonth() + 1;
            const hour = selectedDateTime.getHours();
            const minute = selectedDateTime.getMinutes();
            
            // Directly set the selected time in the dropdown without repopulating
            selectElement.innerHTML = '';
            const option = document.createElement('option');
            const dayNames = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
            const dayName = dayNames[selectedDateTime.getDay()];
            option.value = `${hour}:00`;
            option.textContent = `${dayName} ${day}.${month}. klo ${hour}:00`;
            option.dataset.date = selectedDateTime.toISOString();
            option.dataset.hour = hour;
            option.selected = true;
            selectElement.appendChild(option);
            
            labelElement.textContent = `Valittu aika: ${day}.${month.toString().padStart(2, '0')} ${hour}:${minute.toString().padStart(2, '0')}`;
            
            // Show the time dropdown and service selection - time is already selected
            document.getElementById('availableSlots').style.display = 'block';
            document.getElementById('serviceSelection').style.display = 'block';
            
            // Clear any errors
            document.getElementById('error').textContent = '';
            
            // Hide the modal immediately after confirmation
            setTimeout(() => {
                hideMobileTimeModal();
            }, 300);
            
            // Trigger calendar selection for the confirmed time
            const endTime = new Date(selectedDateTime.getTime() + 60 * 60 * 1000);
            if (calendar && calendar.select) {
                calendar.select(selectedDateTime, endTime);
            }
            
            // Check if service and task are already selected, if so, show booking form
            const serviceSelect = document.getElementById('serviceSelect');
            const taskSelect = document.getElementById('taskSelect');
            
            if (serviceSelect && taskSelect && serviceSelect.value && taskSelect.value) {
                // Service and task already selected, trigger booking form display
                showBookingForm(selectedDateTime);
            }
            
            return true; // Indicate successful confirmation
        }
        return false; // Indicate failed confirmation
    }

    // Initialize mock calendar connection and setup event listeners
    function initializeMockCalendarAndDropdowns() {
        // Get mock bookings for testing
        fetchBookings().then(bookings => {
            // Time selection grid will be populated when user selects a date
            // No need to populate during initialization
            
            // Connect mock calendar slots to our time selection function
            const mockSlots = document.querySelectorAll('.mock-slot[data-date]');
            mockSlots.forEach(slot => {
                slot.addEventListener('click', function() {
                    const dateStr = this.dataset.date;
                    const selectedDate = new Date(dateStr);
                    
                    // Check if it's a weekday
                    const dayOfWeek = selectedDate.getDay();
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        // Show time slots for the selected date
                        const hasAvailableSlots = populateTimeSlotsForDate(selectedDate, bookings);
                        
                        if (hasAvailableSlots) {
                            document.getElementById('error').textContent = '';
                        } else {
                            document.getElementById('error').textContent = 'Valitulle päivälle ei ole vapaita aikoja saatavilla.';
                        }
                        
                        // Scroll to the dropdowns
                        document.getElementById('availableSlots').scrollIntoView({ behavior: 'smooth' });
                    } else {
                        document.getElementById('error').textContent = 'Valitse arkipäivä (maanantai-perjantai)!';
                    }
                });
            });
            
            // Setup dropdown event listeners
            setupDropdownEventListener();
            
            console.log('Mock calendar and dropdowns initialized successfully');
        }).catch(error => {
            console.error('Error initializing calendar:', error);
        });
    }

    // Service and task data structure with vehicle-type specific pricing
    const serviceData = {
        autopesu: {
            name: 'Autopesu',
            tasks: [
                { 
                    id: 'quick-wash', 
                    name: 'Pikapesu', 
                    pricing: {
                        'Henkilöauto': '20 €',
                        'Maasturi': '25 €',
                        'Pakettiauto': '30 €',
                        'Mopo / Moottoripyörä': '20 €',
                        'Muu': '20 €'
                    }
                },
                { 
                    id: 'hand-wash', 
                    name: 'Käsinpesu', 
                    pricing: {
                        'Henkilöauto': '30 €',
                        'Maasturi': '35 €',
                        'Pakettiauto': '45 €',
                        'Mopo / Moottoripyörä': '30 €',
                        'Muu': '30 €'
                    }
                },
                { 
                    id: 'quick-polish-wash', 
                    name: 'Pikakiiltopesu', 
                    pricing: {
                        'Henkilöauto': '60 €',
                        'Maasturi': '65 €',
                        'Pakettiauto': '75 €',
                        'Mopo / Moottoripyörä': '60 €',
                        'Muu': '60 €'
                    }
                },
                { 
                    id: 'winter-wash', 
                    name: 'Talvipesu', 
                    pricing: {
                        'Henkilöauto': '50 €',
                        'Maasturi': '55 €',
                        'Pakettiauto': '65 €',
                        'Mopo / Moottoripyörä': '50 €',
                        'Muu': '50 €'
                    }
                },
                { 
                    id: 'engine-wash', 
                    name: 'Moottoritilan pesu', 
                    pricing: {
                        'Henkilöauto': '50 €',
                        'Maasturi': '50 €',
                        'Pakettiauto': '50 €',
                        'Mopo / Moottoripyörä': '50 €',
                        'Muu': '50 €'
                    }
                }
            ]
        },
        sisapuhdistus: {
            name: 'Sisäpuhdistus',
            tasks: [
                { 
                    id: 'interior-cleaning', 
                    name: 'Sisäpuhdistus', 
                    pricing: {
                        'Henkilöauto': '50 €',
                        'Maasturi': '60 €',
                        'Pakettiauto': '60 €'
                    }
                },
                { id: 'textile-deep-clean', name: 'Tekstiilipintojen syväpuhdistus', price: '30 € / istuin' },
                { id: 'leather-care', name: 'Nahkapenkkien hoito ja suojaus', price: '35 € / istuin' },
                { id: 'fabric-protection', name: 'Kangaspintojen suojaus', price: '70 €' },
                { id: 'full-cleaning', name: 'Täyssiivous', price: '150 €' },
                { id: 'ozone', name: 'Otsonointi', price: '85 €' },
                { id: 'allergy-cleaning', name: 'Allergiapuhdistus ja desinfiointi', price: '90 €' }
            ]
        },
        kiillotus: {
            name: 'Kiillotus ja pinnoitteet',
            tasks: [
                { 
                    id: 'wax-treatment', 
                    name: 'Vahakäsittely', 
                    pricing: {
                        'Henkilöauto': '80 €',
                        'Maasturi': '90 €',
                        'Pakettiauto': '120 €'
                    }
                },
                { 
                    id: 'hard-wax', 
                    name: 'Kovavaha', 
                    pricing: {
                        'Henkilöauto': '120 €',
                        'Maasturi': '140 €',
                        'Pakettiauto': '160 €'
                    }
                },
                { 
                    id: 'ceramic-coating', 
                    name: 'Keraaminen pinnoite', 
                    pricing: {
                        'Henkilöauto': 'alkaen 350 €',
                        'Maasturi': 'alkaen 350 €',
                        'Pakettiauto': 'alkaen 400 €'
                    }
                },
                { id: '1-step-polish', name: '1-vaiheinen kiillotus', price: 'alkaen 248 €' },
                { id: '2-step-polish', name: '2-vaiheinen kiillotus', price: 'alkaen 598 €' },
                { id: '3-step-polish', name: '3-vaiheinen kiillotus', price: 'alkaen 898 €' },
                { id: 'wet-sanding', name: 'Vesihionta', price: 'Sopimuksen mukaan' }
            ]
        },
        kolhukorjaus: {
            name: 'Kolhukorjaus',
            tasks: [
                { id: 'small-dent', name: 'Pieni lommo', price: 'alkaen 100 €' },
                { id: 'large-dent', name: 'Iso lommo', price: 'alkaen 150 €' },
                { id: 'paint-repair', name: 'Maalipinnan korjaukset', price: 'Pyydä tarjous' }
            ]
        },
        korjaustyot: {
            name: 'Korjaustyöt',
            tasks: [
                { id: 'diagnostics', name: 'Vikakoodien luku ja nollaus', price: '40 €' },
                { id: 'oil-change', name: 'Moottoriöljyjen vaihto', price: 'alkaen 50 €' },
                { id: 'shock-absorber', name: 'Iskunvaimentimien ja jousituksen uusiminen', price: 'Pyydä tarjous' },
                { id: 'suspension-parts', name: 'Tukivarsien, nivelien ja raidetankojen vaihto', price: 'Pyydä tarjous' },
                { id: 'stabilizer-bar', name: 'Vakaajatankojen ja koiranluiden vaihto', price: 'Pyydä tarjous' },
                { id: 'brake-repair', name: 'Jarrulevyjen, -palojen ja käsijarrujen vaihto', price: 'Pyydä tarjous' },
                { id: 'exhaust-repair', name: 'Pakoputkistojen korjaukset', price: 'Pyydä tarjous' },
                { id: 'wheel-bearing', name: 'Pyöränlaakerien vaihto', price: 'Pyydä tarjous' },
                { id: 'other-repair', name: 'Muu viankorjaus', price: 'Pyydä tarjous' }
            ]
        },
        rengastyot: {
            name: 'Rengastyöt',
            tasks: [
                { 
                    id: 'tire-change', 
                    name: 'Renkaiden vaihto', 
                    pricing: {
                        'Henkilöauto': '30 €',
                        'Maasturi': '40 €',
                        'Pakettiauto': '45 €'
                    }
                },
                { id: 'balancing', name: 'Renkaiden tasapainotus', price: '30 €' },
                { id: 'tire-repair', name: 'Vuotavan renkaan paikkaus', price: '25 €' },
                { id: 'rim-wash', name: 'Vanteiden pesu (4 kpl)', price: '15 €' },
                { id: 'tire-hotel', name: 'Rengashotelli / kausisäilytys', price: '65 €' }
            ]
        },
        renkaidenasennus: {
            name: 'Renkaiden asennus vanteelle',
            tasks: [
                { 
                    id: 'tire-mount-15', 
                    name: 'Renkaan asennus vanteelle 15" ja alle', 
                    pricing: {
                        'Henkilöauto': '80 €'
                    }
                },
                { 
                    id: 'tire-mount-16-17', 
                    name: 'Renkaan asennus vanteelle 16-17"', 
                    pricing: {
                        'Henkilöauto': '90 €'
                    }
                },
                { 
                    id: 'tire-mount-18-19', 
                    name: 'Renkaan asennus vanteelle 18-19"', 
                    pricing: {
                        'Henkilöauto': '95 €'
                    }
                },
                { 
                    id: 'tire-mount-20-plus', 
                    name: 'Renkaan asennus vanteelle 20" ja yli', 
                    pricing: {
                        'Henkilöauto': '105 €'
                    }
                },
                { 
                    id: 'tire-mount-suv-17-under', 
                    name: 'Renkaan asennus vanteelle 17" ja alle', 
                    pricing: {
                        'Maasturi': '105 €',
                        'Pakettiauto': '105 €'
                    }
                },
                { 
                    id: 'tire-mount-suv-18-plus', 
                    name: 'Renkaan asennus vanteelle 18" ja yli', 
                    pricing: {
                        'Maasturi': '120 €',
                        'Pakettiauto': '120 €'
                    }
                },
                { id: 'tire-removal', name: 'Renkaiden irrotus vanteelta (4kpl)', price: '50 €' },
                { id: 'balancing-only', name: 'Pelkkä tasapainoitus', price: '30 €' }
            ]
        },
        tuulilasipalvelut: {
            name: 'Tuulilasipalvelut',
            tasks: [
                { id: 'glass-repair-first', name: 'Kiveniskemän korjaus - ensimmäinen', price: '50 €' },
                { id: 'glass-repair-additional', name: 'Kiveniskemän korjaus - seuraava', price: '25 € / kpl' },
                { id: 'glass-repair-insured', name: 'Kiveniskemän korjaus lasivakuutuksella', price: 'Ilmainen' },
                { id: 'glass-replacement-insured', name: 'Lasinvaihto vakuutuksella', price: 'Omavastuu' },
                { id: 'glass-replacement', name: 'Lasinvaihto ilman vakuutusta', price: 'Pyydä tarjous' }
            ]
        },
        muut: {
            name: 'Muut palvelut',
            tasks: [
                { id: 'headlight-restoration', name: 'Ajovalojen kirkastus', price: 'alkaen 50 € / kpl' },
                { id: 'custom-service', name: 'Tarve auton kunnostukselle?', price: 'Pyydä tarjous' }
            ]
        }
    };

    // Multiple services management
    let selectedServices = [];
    
    function addSelectedService(service, task) {
        const serviceObj = serviceData[service];
        const taskObj = serviceObj.tasks.find(t => t.id === task);
        
        if (!serviceObj || !taskObj) return;
        
        // Get selected vehicle type
        const vehicleType = getSelectedVehicleType();
        
        // Determine the price to display
        let displayPrice = '';
        if (taskObj.pricing && vehicleType && taskObj.pricing[vehicleType]) {
            // Use vehicle-specific price
            displayPrice = formatPriceForVehicleType(taskObj.pricing[vehicleType]);
        } else if (taskObj.price) {
            // Use generic price
            displayPrice = formatPriceForVehicleType(taskObj.price);
        }
        
        // Add to selected services array
        selectedServices.push({
            service: service,
            serviceName: serviceObj.name,
            task: task,
            taskName: taskObj.name,
            taskPrice: displayPrice
        });
        
        updateSelectedServicesDisplay();
    }
    
    function removeSelectedService(index) {
        selectedServices.splice(index, 1);
        updateSelectedServicesDisplay();
        
        // If no services left, reset to initial state to allow new booking
        if (selectedServices.length === 0) {
            document.getElementById('bookingForm').style.display = 'none';
            document.getElementById('add-service-container').style.display = 'none';
            document.getElementById('selected-services-container').style.display = 'none';
            document.getElementById('repair-disclaimer').style.display = 'none';
            
            // Reset service selection dropdowns to allow new selections
            resetServiceSelection();
        } else {
            // Update disclaimer visibility based on remaining services
            updateRepairDisclaimer();
        }
    }
    
    // Helper function to calculate total price from selected services
    // Returns object with totalMin (numeric), totalPriceString (formatted), and hasVariablePricing flag
    function calculateTotalPrice(services) {
        let totalMin = 0;
        let hasVariablePricing = false;
        
        services.forEach(service => {
            const taskPrice = service.taskPrice || service.price || '';
            
            if (taskPrice && taskPrice.trim() !== '') {
                // Extract price for total calculation
                const priceMatch = taskPrice.match(/(\d+)\s*€/);
                if (priceMatch) {
                    totalMin += parseInt(priceMatch[1]);
                }
                // Check if it says "alkaen" (starting from)
                if (taskPrice.includes('alkaen')) {
                    hasVariablePricing = true;
                }
            } else {
                hasVariablePricing = true;
            }
        });
        
        // Format total price string
        let totalPriceString = '';
        if (totalMin > 0) {
            if (hasVariablePricing) {
                totalPriceString = `alkaen ${totalMin} €`;
            } else {
                totalPriceString = `${totalMin} €`;
            }
        } else {
            totalPriceString = 'Hinta sovittaessa';
        }
        
        return {
            totalMin: totalMin,
            totalPriceString: totalPriceString,
            hasVariablePricing: hasVariablePricing
        };
    }
    
    function updateSelectedServicesDisplay() {
        const container = document.getElementById('selected-services-container');
        const list = document.getElementById('selected-services-list');
        const totalContainer = document.getElementById('total-amount-container');
        const totalAmountSpan = document.getElementById('total-amount');
        
        if (selectedServices.length === 0) {
            container.style.display = 'none';
            totalContainer.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        list.innerHTML = '';
        
        selectedServices.forEach((service, index) => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
            
            const serviceText = document.createElement('span');
            if (service.taskPrice && service.taskPrice.trim() !== '') {
                serviceText.textContent = `${service.serviceName} - ${service.taskName}: ${service.taskPrice}`;
            } else {
                serviceText.textContent = `${service.serviceName} - ${service.taskName}`;
            }
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.type = 'button';
            removeBtn.style.cssText = 'background: #dc3545; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-weight: bold;';
            removeBtn.onclick = () => removeSelectedService(index);
            
            li.appendChild(serviceText);
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
        
        // Calculate and display total using shared helper function
        const totalInfo = calculateTotalPrice(selectedServices);
        
        if (totalInfo.totalMin > 0) {
            totalContainer.style.display = 'block';
            totalAmountSpan.textContent = totalInfo.totalPriceString;
        } else {
            totalContainer.style.display = 'none';
        }
    }
    
    // Helper function to prepare service data for backend submission
    // Returns structured service array and calculated total price
    function prepareServiceData() {
        const services = selectedServices.map(service => {
            // Extract numeric price from price string (e.g., "alkaen 35 €" -> 35)
            let numericPrice = null;
            if (service.taskPrice && service.taskPrice.trim() !== '') {
                const priceMatch = service.taskPrice.match(/(\d+)\s*€/);
                if (priceMatch) {
                    numericPrice = parseInt(priceMatch[1]);
                }
            }
            
            return {
                category: service.service, // Add category (tire, repair, washing, etc.)
                serviceName: service.serviceName,
                taskName: service.taskName,
                price: service.taskPrice || 'Hinta sovittaessa',
                numericPrice: numericPrice
            };
        });
        
        // Use shared helper to calculate total price
        const totalInfo = calculateTotalPrice(services);
        
        return {
            services: services,
            totalPrice: totalInfo.totalPriceString,
            totalNumericPrice: totalInfo.totalMin
        };
    }
    
    function updateRepairDisclaimer() {
        const repairDisclaimer = document.getElementById('repair-disclaimer');
        const hasRepairService = selectedServices.some(s => s.service === 'korjaustyot');
        
        if (hasRepairService) {
            repairDisclaimer.style.display = 'block';
        } else {
            repairDisclaimer.style.display = 'none';
        }
    }
    
    function resetServiceSelection() {
        // Reset dropdowns
        document.getElementById('serviceSelect').value = '';
        document.getElementById('taskSelect').value = '';
        document.getElementById('taskSelection').style.display = 'none';
        
        // Show service selection again
        document.getElementById('serviceSelection').style.display = 'block';
    }

    // Helper function to add "alkaen" prefix to price for specific vehicle types
    function formatPriceForVehicleType(price) {
        if (!price || price.trim() === '') return '';
        
        const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
        const selectedVehicleTypeValue = vehicleTypeSelect ? vehicleTypeSelect.value : '';
        
        // Add "alkaen" prefix for "Mopo / Moottoripyörä" and "Muu" vehicle types
        if (selectedVehicleTypeValue === 'Mopo / Moottoripyörä' || selectedVehicleTypeValue === 'Muu') {
            // Only add "alkaen" if it's not already present
            if (!price.toLowerCase().includes('alkaen')) {
                return `alkaen ${price}`;
            }
        }
        
        return price;
    }

    // Service selection event handler
    function setupServiceSelection() {
        const serviceSelect = document.getElementById('serviceSelect');
        const taskSelection = document.getElementById('taskSelection');
        const taskSelect = document.getElementById('taskSelect');
        const serviceSelection = document.getElementById('serviceSelection');

        if (serviceSelect) {
            serviceSelect.addEventListener('change', function() {
                const selectedService = this.value;
                
                if (selectedService && serviceData[selectedService]) {
                    // Show task selection
                    taskSelection.style.display = 'block';
                    
                    // Get selected vehicle type
                    const vehicleType = getSelectedVehicleType();
                    
                    // Populate task dropdown with vehicle-type specific pricing
                    // Only show tasks that have valid pricing for the selected vehicle type
                    taskSelect.innerHTML = '<option value="">Valitse tyyppi...</option>';
                    serviceData[selectedService].tasks.forEach(task => {
                        // Skip tasks that have vehicle-specific pricing but not for this vehicle type
                        if (task.pricing && vehicleType && !task.pricing[vehicleType]) {
                            return; // Skip this task
                        }
                        
                        const option = document.createElement('option');
                        option.value = task.id;
                        
                        // Check if task has vehicle-specific pricing
                        let displayPrice = '';
                        if (task.pricing && vehicleType && task.pricing[vehicleType]) {
                            // Use vehicle-specific price
                            displayPrice = formatPriceForVehicleType(task.pricing[vehicleType]);
                            option.textContent = `${task.name} ${displayPrice}`;
                        } else if (task.price && task.price.trim() !== '') {
                            // Use generic price
                            displayPrice = formatPriceForVehicleType(task.price);
                            option.textContent = `${task.name} ${displayPrice}`;
                        } else {
                            // No price available
                            option.textContent = task.name;
                        }
                        taskSelect.appendChild(option);
                    });
                    
                    // Reset task selection
                    taskSelect.value = '';
                } else {
                    // Hide task selection
                    taskSelection.style.display = 'none';
                }
            });
        }

        if (taskSelect) {
            taskSelect.addEventListener('change', function() {
                const selectedTask = this.value;
                const selectedService = serviceSelect.value;
                
                if (selectedTask && selectedService) {
                    // Immediately add service to the selected services list
                    addSelectedService(selectedService, selectedTask);
                    
                    // Hide the service selection dropdowns
                    serviceSelection.style.display = 'none';
                    taskSelection.style.display = 'none';
                    
                    // Show the "Add another service" button
                    document.getElementById('add-service-container').style.display = 'block';
                    
                    // Task selected - reveal step 2 (calendar)
                    const step2 = document.getElementById('step-calendar');
                    if (step2) {
                        step2.classList.add('visible');
                        step2.style.display = 'block';
                        
                        // Smooth scroll to step 2
                        setTimeout(() => {
                            step2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 100);
                    }
                } else {
                    // Hide booking form if task is deselected
                    document.getElementById('bookingForm').style.display = 'none';
                }
            });
        }
    }

    // Helper function to get currently selected date/time
    function getCurrentSelectedDateTime() {
        const selectElement = document.getElementById('availableTimesSelect');
        if (selectElement && selectElement.value) {
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            if (selectedOption.dataset.date && selectedOption.dataset.hour) {
                const selectedDate = new Date(selectedOption.dataset.date);
                const selectedHour = parseInt(selectedOption.dataset.hour);
                selectedDate.setHours(selectedHour, 0, 0, 0);
                return selectedDate;
            }
        }
        return null;
    }

    // Helper function to update slot summary display with two-line layout
    function updateSlotSummary(aikaTxt) {
        const slotSummary = document.getElementById('slot-summary');
        
        const label = document.createElement('span');
        label.style.fontSize = '1.0rem';
        label.style.fontWeight = '600';
        label.textContent = 'Valittu aika:';
        
        const value = document.createElement('span');
        value.style.fontSize = '1.15rem';
        value.style.fontWeight = '800';
        value.textContent = aikaTxt;
        
        // Replace all children efficiently using modern API
        slotSummary.replaceChildren(label, value);
    }
    
    // Helper function to populate service dropdown based on vehicle type
    function populateServiceDropdown() {
        const serviceSelect = document.getElementById('serviceSelect');
        const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
        
        if (!serviceSelect || !vehicleTypeSelect) return;
        
        const selectedVehicleType = vehicleTypeSelect.value;
        
        // Clear existing options except the first one
        serviceSelect.innerHTML = '<option value="">Valitse palvelu...</option>';
        
        // Define which services are available for "Mopo / Moottoripyörä"
        const mopoServices = ['autopesu', 'kiillotus', 'kolhukorjaus', 'korjaustyot'];
        
        // Define service options
        const allServices = [
            { value: 'autopesu', label: 'Autopesu' },
            { value: 'sisapuhdistus', label: 'Sisäpuhdistus' },
            { value: 'kiillotus', label: 'Kiillotus ja pinnoitteet' },
            { value: 'kolhukorjaus', label: 'Kolhukorjaus' },
            { value: 'korjaustyot', label: 'Korjaustyöt' },
            { value: 'rengastyot', label: 'Rengastyöt' },
            { value: 'renkaidenasennus', label: 'Renkaiden asennus vanteelle' },
            { value: 'tuulilasipalvelut', label: 'Tuulilasipalvelut' },
            { value: 'muut', label: 'Muut palvelut' }
        ];
        
        // Filter services based on vehicle type
        let servicesToShow = allServices;
        if (selectedVehicleType === 'Mopo / Moottoripyörä') {
            servicesToShow = allServices.filter(service => mopoServices.includes(service.value));
        }
        
        // Populate dropdown
        servicesToShow.forEach(service => {
            const option = document.createElement('option');
            option.value = service.value;
            option.textContent = service.label;
            serviceSelect.appendChild(option);
        });
        
        // Reset task selection when service dropdown changes
        const taskSelection = document.getElementById('taskSelection');
        if (taskSelection) {
            taskSelection.style.display = 'none';
        }
    }
    
    // Vehicle type selection event handler
    function setupVehicleTypeSelection() {
        const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
        const vehicleTypeOtherContainer = document.getElementById('vehicleTypeOtherContainer');
        const serviceSelection = document.getElementById('serviceSelection');
        const stepServices = document.getElementById('step-services');
        
        if (vehicleTypeSelect) {
            vehicleTypeSelect.addEventListener('change', function() {
                const selectedType = this.value;
                
                // Show/hide the "Muu" textbox based on selection
                if (selectedType === 'Muu') {
                    vehicleTypeOtherContainer.style.display = 'block';
                    vehicleTypeOtherContainer.setAttribute('aria-hidden', 'false');
                } else {
                    vehicleTypeOtherContainer.style.display = 'none';
                    vehicleTypeOtherContainer.setAttribute('aria-hidden', 'true');
                    // Clear the textbox when hiding
                    document.getElementById('vehicleTypeOther').value = '';
                }
                
                // Populate service dropdown based on selected vehicle type
                populateServiceDropdown();
                
                // If a vehicle type is selected, reveal the service selection step
                if (selectedType && selectedType !== '') {
                    stepServices.classList.add('visible');
                    stepServices.style.display = 'block';
                    
                    // Smooth scroll to service selection step
                    setTimeout(() => {
                        stepServices.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            });
        }
    }
    
    // Helper function to get selected vehicle type (includes "Muu" text)
    function getSelectedVehicleType() {
        const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
        const vehicleTypeOther = document.getElementById('vehicleTypeOther');
        
        if (!vehicleTypeSelect || !vehicleTypeSelect.value) {
            return '';
        }
        
        const selectedType = vehicleTypeSelect.value;
        
        // If "Muu" is selected, return the custom text if provided
        if (selectedType === 'Muu') {
            const otherText = vehicleTypeOther.value.trim();
            return otherText ? otherText : 'Muu';
        }
        
        return selectedType;
    }
    
    // Helper function to validate vehicle type selection
    function validateVehicleType() {
        const vehicleType = getSelectedVehicleType();
        if (!vehicleType || vehicleType.trim() === '') {
            document.getElementById('error').textContent = 'Valitse ajoneuvotyyppi!';
            return false;
        }
        return true;
    }

    // Show booking form with selected time and service info
    function showBookingForm(selectedDateTime) {
        const serviceSelect = document.getElementById('serviceSelect');
        const taskSelect = document.getElementById('taskSelect');
        
        const selectedService = serviceSelect.value;
        const selectedTask = taskSelect.value;
        
        if (selectedDateTime) {
            selectedSlot = selectedDateTime;
            const aikaTxt = selectedDateTime.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'numeric' }) +
                ', klo ' + selectedDateTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
            
            // Update slot summary display with two-line layout
            updateSlotSummary(aikaTxt);
            
            document.getElementById('aika').value = aikaTxt;
            
            // Store all services as comma-separated values
            const serviceValues = selectedServices.map(s => s.service).join(', ');
            const taskValues = selectedServices.map(s => s.task).join(', ');
            document.getElementById('service').value = serviceValues;
            document.getElementById('task').value = taskValues;
            
            // Store vehicle type
            const vehicleType = getSelectedVehicleType();
            document.getElementById('vehicleType').value = vehicleType;
            
            // Show repair disclaimer if any repair service is selected
            updateRepairDisclaimer();
            
            // Reveal step 3 (contact information)
            const step3 = document.getElementById('step-contact');
            if (step3) {
                step3.classList.add('visible');
                step3.style.display = 'block';
                
                // Smooth scroll to step 3
                setTimeout(() => {
                    step3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
            
            // Show booking form
            document.getElementById('bookingForm').style.display = '';
            document.getElementById('error').textContent = '';
        }
    }

    // Call setup functions immediately
    setupVehicleTypeSelection();
    setupServiceSelection();
    
    // Setup "Add another service" button
    const addServiceBtn = document.getElementById('add-service-btn');
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', function() {
            // Reset and show service selection dropdowns for adding another service
            document.getElementById('serviceSelect').value = '';
            document.getElementById('taskSelect').value = '';
            document.getElementById('taskSelection').style.display = 'none';
            document.getElementById('serviceSelection').style.display = 'block';
        });
    }

    // Initialize mock calendar and dropdown functionality
    initializeMockCalendarAndDropdowns();

    // Function to find next available booking slot and navigate to that week
    function findAndNavigateToNextAvailableWeek(calendar, bookings) {
        if (!calendar || typeof calendar.gotoDate !== 'function') {
            console.error('Calendar not available for navigation');
            return null;
        }
        
        // Ensure bookings is an array
        bookings = Array.isArray(bookings) ? bookings : [];
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find next available slot within next 60 days (increased from 30)
        for (let daysFromToday = 0; daysFromToday < 60; daysFromToday++) {
            const checkDate = new Date(startOfToday);
            checkDate.setDate(startOfToday.getDate() + daysFromToday);
            
            // Skip weekends
            const dayOfWeek = checkDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            // Check if this day has available slots
            const dateKey = getDateKey(checkDate);
            if (!dateKey) continue; // Skip invalid dates
            
            // Count booked slots for this day
            const dayBookingCount = bookings.filter(b => {
                const bookingDateKey = getDateKey(b.aika);
                return bookingDateKey === dateKey;
            }).length;
            
            // FIX: There are 8 business hours (9-17) per day
            // But if it's today, we need to account for past hours
            let availableSlots = 8;
            if (daysFromToday === 0) {
                // For today, count only future time slots
                // Business hours are 9-17 (slots: 9,10,11,12,13,14,15,16 = 8 slots)
                // If current hour is 11, next available slot is 12, so available: 12,13,14,15,16 = 5 slots
                const currentHour = now.getHours();
                availableSlots = Math.max(0, 17 - Math.max(9, currentHour + 1));
            }
            
            // A day has available slots if bookings < available time slots
            if (dayBookingCount < availableSlots) {
                calendar.gotoDate(checkDate);
                console.log('Navigated to date with next available slot:', checkDate.toLocaleDateString('fi-FI'));
                return checkDate;
            }
        }
        
        console.log('No available slots found in next 60 days');
        return null;
    }

    // Generate weekday time slots for FullCalendar events
    function getWeekdaySlots(startDate, numberOfDays) {
        const slots = [];
        const currentDate = new Date(startDate);
        
        for (let day = 0; day < numberOfDays; day++) {
            const dayOfWeek = currentDate.getDay();
            
            // Only generate slots for weekdays (Monday = 1, Friday = 5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                // Generate hourly slots from 9:00 to 17:00 (8 slots per day)
                for (let hour = 9; hour < 17; hour++) {
                    const slotStart = new Date(currentDate);
                    slotStart.setHours(hour, 0, 0, 0);
                    
                    const slotEnd = new Date(currentDate);
                    slotEnd.setHours(hour + 1, 0, 0, 0);
                    
                    slots.push({
                        start: slotStart,
                        end: slotEnd
                    });
                }
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return slots;
    }

    fetchBookings().then(bookings => {
        // Ensure bookings is an array
        bookings = Array.isArray(bookings) ? bookings : [];
        
        // Display warning to user if bookings failed to load
        if (bookings.length === 0) {
            const errorEl = document.getElementById('error');
            if (errorEl) {
                errorEl.innerHTML = '<strong>Huomio:</strong> Varaustietoja ei voitu hakea palvelimelta. Kaikki ajat näytetään vapaina. Jos ongelma jatkuu, päivitä sivu tai ota yhteyttä asiakaspalveluun.';
                errorEl.style.display = 'block';
                errorEl.style.backgroundColor = '#fff3cd';
                errorEl.style.color = '#856404';
                errorEl.style.padding = '15px';
                errorEl.style.marginBottom = '20px';
                errorEl.style.borderRadius = '8px';
                errorEl.style.border = '1px solid #ffc107';
            }
        }
        
        function isSlotBooked(slot) {
            return bookings.some(b => b.aika === slot.start.toISOString());
        }
        
        function getBookingsCountForDay(date) {
            const dateKey = getDateKey(date);
            if (!dateKey) return 0;
            
            return bookings.filter(b => {
                const bookingDateKey = getDateKey(b.aika);
                return bookingDateKey === dateKey;
            }).length;
        }
        
        let calendar = null;
        
        // FIX: Enhanced error detection and user feedback when FullCalendar fails to load
        // This helps users understand if their ad blocker or privacy settings are blocking the calendar
        if (typeof FullCalendar === 'undefined' || typeof FullCalendar.Calendar !== 'function') {
            console.error('FullCalendar library not loaded. This may be due to ad blockers or privacy extensions.');
            
            // Show user-friendly error message instead of silent failure
            const errorEl = document.getElementById('error');
            if (errorEl) {
                errorEl.innerHTML = '<strong>⚠️ Kalenterin lataus epäonnistui</strong><br>' +
                    'Kalenteri ei latautunut. Tämä voi johtua mainosten esto-ohjelmasta tai yksityisyysasetuksista.<br>' +
                    'Voit silti varata ajan:<br>' +
                    '📞 Soita: <a href="tel:+358401935001" style="color: #333; font-weight: bold;">040 1935001</a><br>' +
                    '📧 Sähköposti: <a href="mailto:info@fixnero.fi" style="color: #333; font-weight: bold;">info@fixnero.fi</a>';
                errorEl.style.display = 'block';
                errorEl.style.backgroundColor = '#fff3cd';
                errorEl.style.color = '#856404';
                errorEl.style.padding = '20px';
                errorEl.style.marginBottom = '20px';
                errorEl.style.borderRadius = '8px';
                errorEl.style.border = '1px solid #ffc107';
                errorEl.style.textAlign = 'center';
            }
            
            // Fallback will be triggered by the existing timeout handler below
            return;
        }
        
        // FIX: Validate calendar element exists before initializing
        // Prevents runtime errors if DOM structure changes
        if (!calendarEl || !document.body.contains(calendarEl)) {
            console.error('Calendar element not found in DOM. Cannot initialize calendar.');
            return;
        }
        
        try {
            // Initialize FullCalendar
            const isMobileView = window.innerWidth < 768;
            calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: isMobileView ? 'dayGridTwoWeeks' : 'dayGridMonth',
            initialDate: new Date(), // FIX: Explicitly set initial date to ensure calendar displays current month
            locale: 'fi',
            views: {
                dayGridTwoWeeks: {
                    type: 'dayGrid',
                    duration: { weeks: 2 }
                }
            },
            selectable: true,
            selectOverlap: false,
            expandRows: true,
            // Show all 7 days including weekends for visual indication
            hiddenDays: [], // Show all days including weekends
            displayEventTime: false,
            dayMaxEventRows: 3,
            // FIX Issue 2: Prevent month name from appearing in first day cell
            // FullCalendar Finnish locale shows "joulukuu" (December) in the first cell by default
            // This override ensures only the day number is shown, fixing the layout issue
            // Note: dayNumberText is generated by FullCalendar from a Date object (not user input)
            // The regex extracts only digits to display as day number
            dayCellContent: function(arg) {
                // Extract only numeric digits from the day text (safe: input is from FullCalendar Date object)
                const dayNumber = arg.dayNumberText.replace(/\D/g, '');
                return dayNumber;
            },
            viewDidMount: function(info) {
                // FIX Issue 1: Force calendar re-render on mobile to ensure cells are visible
                // Double requestAnimationFrame is used because:
                // 1. First rAF: Browser schedules the callback for the next frame
                // 2. Second rAF: Ensures DOM layout/paint cycle has completed
                // This timing pattern is necessary on mobile where the calendar container
                // may be initially hidden and needs a full layout cycle to render correctly
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (calendar && info && info.view) {
                            populateAvailableSlots(calendar, bookings);
                            // Force calendar to update its size for mobile devices
                            if (isMobileView && calendar.updateSize) {
                                calendar.updateSize();
                            }
                        }
                    });
                });
            },
            // Mobile-specific improvements
            height: 'auto',
            contentHeight: window.innerWidth < 768 ? 500 : 400,
            dayMaxEvents: true,
            moreLinkClick: 'popover',
            selectMirror: true,
            unselectAuto: true,
            selectMinDistance: 1,
            // Enhanced mobile touch handling - minimal delay for precise selection
            selectLongPressDelay: 1,
            longPressDelay: 1,
            eventLongPressDelay: 1,
            // Mobile selection constraints - prevent row-wide selection
            // Allow selection of days
            selectAllow: function(selectInfo) {
                // Only allow weekday selections
                const startDay = selectInfo.start.getDay(); // 0=Sunday, 1=Monday, etc.
                return startDay >= 1 && startDay <= 5;
            },
            // Better mobile responsiveness
            aspectRatio: window.innerWidth < 768 ? 1.2 : 1.35,
            eventDisplay: 'block',
            displayEventTime: true,
            headerToolbar: {
                left: '',
                center: 'title',
                right: ''
            },
            validRange: function() {
                const now = new Date();
                
                // Start from today
                const startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                
                // End date: end of next month (allows current month + next month)
                const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                endDate.setHours(23, 59, 59, 999);
                
                return {
                    start: startDate,
                    end: endDate
                };
            },
            select: function (info) {
                try {
                    if (!calendar || !info || !info.start) {
                        console.error('Calendar instance or selection info not available');
                        return;
                    }
                    
                    let start = info.start;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    
                    // Prevent selection of past dates
                    if (start < now) {
                        if (calendar.unselect) calendar.unselect();
                        document.getElementById('error').textContent = 'Et voi valita mennyttä päivämäärää!';
                        return;
                    }
                    
                    const dayOfWeek = start.getDay();
                    
                    // Only allow weekday selections
                    if (dayOfWeek < 1 || dayOfWeek > 5) {
                        if (calendar.unselect) calendar.unselect();
                        document.getElementById('error').textContent = 'Valitse arkipäivä (maanantai-perjantai)!';
                        return;
                    }

                    // If on mobile device, show mobile modal instead of direct selection
                    if (isMobile) {
                        const dateStr = getDateKey(start);
                        if (dateStr) {
                            showMobileTimeModal(dateStr, null, bookings);
                        } else {
                            document.getElementById('error').textContent = 'Virhe päivämäärän käsittelyssä. Yritä uudelleen.';
                        }
                        if (calendar.unselect) calendar.unselect();
                        return;
                    }

                    // Desktop behavior: Show time slots grid for selected date
                    const selectedDate = new Date(start);
                    selectedDate.setHours(9, 0, 0, 0);
                    
                    const hasAvailableSlots = populateTimeSelectionGrid(selectedDate, bookings);
                    
                    if (hasAvailableSlots) {
                        document.getElementById('error').textContent = '';
                        const timeGridContainer = document.getElementById('time-selection-grid');
                        if (timeGridContainer) {
                            timeGridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    } else {
                        document.getElementById('error').textContent = 'Valitulle päivälle ei ole vapaita aikoja saatavilla.';
                    }
                    
                    if (calendar.unselect) calendar.unselect();
                } catch (error) {
                    console.error('Error in select handler:', error);
                    document.getElementById('error').textContent = 'Virhe päivämäärän valinnassa. Yritä uudelleen.';
                }
            },
            dateClick: function(info) {
                try {
                    if (!info || !info.date) {
                        console.error('Invalid dateClick info');
                        return;
                    }
                    
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    
                    // Prevent selection of past dates
                    if (info.date < now) {
                        document.getElementById('error').textContent = 'Et voi valita mennyttä päivämäärää!';
                        return;
                    }
                    
                    const dayOfWeek = info.date.getDay();
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Only weekdays
                        if (isMobile) {
                            const dateStr = getDateKey(info.date);
                            if (dateStr) {
                                showMobileTimeModal(dateStr, null, bookings);
                            } else {
                                document.getElementById('error').textContent = 'Virhe päivämäärän käsittelyssä. Yritä uudelleen.';
                            }
                        } else {
                            const selectedDate = new Date(info.date);
                            selectedDate.setHours(9, 0, 0, 0);
                            
                            const hasAvailableSlots = populateTimeSelectionGrid(selectedDate, bookings);
                            
                            if (hasAvailableSlots) {
                                document.getElementById('error').textContent = '';
                                const timeGridContainer = document.getElementById('time-selection-grid');
                                if (timeGridContainer) {
                                    timeGridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }
                            } else {
                                document.getElementById('error').textContent = 'Valitulle päivälle ei ole vapaita aikoja saatavilla.';
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error in dateClick handler:', error);
                    document.getElementById('error').textContent = 'Virhe päivämäärän valinnassa. Yritä uudelleen.';
                }
            },
            events: function (fetchInfo, successCallback) {
                try {
                    if (!fetchInfo || !successCallback) {
                        console.error('Invalid fetchInfo or successCallback in events function');
                        if (successCallback) successCallback([]);
                        return;
                    }
                    
                    const evs = [];
                    const currentDate = new Date(fetchInfo.start);
                    const endDate = new Date(fetchInfo.end);
                    
                    while (currentDate < endDate) {
                        const dayOfWeek = currentDate.getDay();
                        // Only process weekdays
                        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                            const dateKey = getDateKey(currentDate);
                            if (dateKey) {
                                const dayBookingsCount = bookings.filter(b => {
                                    const bookingDateKey = getDateKey(b.aika);
                                    return bookingDateKey === dateKey;
                                }).length;
                                
                                // FIX: Always show available slots for weekdays, even when there are no bookings
                                const availableSlots = 8 - dayBookingsCount; // 8 slots per day (9-17)
                                evs.push({
                                    title: `${availableSlots} paikkaa`,
                                    start: dateKey,
                                    allDay: true,
                                    color: availableSlots > 4 ? '#4CAF50' : availableSlots > 0 ? '#FFC107' : '#F44336',
                                    textColor: '#fff'
                                });
                            }
                        }
                        
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    
                    successCallback(evs);
                } catch (error) {
                    console.error('Error in events function:', error);
                    if (successCallback) successCallback([]);
                }
            }
        });
        
        // FIX: Verify calendar was created successfully before calling render
        if (calendar) {
            // Wrap render in try-catch to handle any rendering errors gracefully
            try {
                // FIX: Render immediately without delay to prevent white screen
                try {
                    calendar.render();
                    
                    // FIX: Setup immediately after render (no nested setTimeout for better loading)
                    // Navigation button state management for month view
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    function updateNavigationButtons() {
                        if (!calendar || !calendar.getDate || !calendar.view) {
                            return;
                        }
                        
                        const prevBtn = document.getElementById('prevWeekBtn');
                        const nextBtn = document.getElementById('nextWeekBtn');
                        
                        if (!prevBtn || !nextBtn) {
                            return;
                        }
                        
                        const view = calendar.view;
                        const viewStart = view.currentStart;
                        const viewEnd = view.currentEnd;
                        
                        // Disable prev button if view start is at or before today
                        const todayStart = new Date(today);
                        todayStart.setHours(0, 0, 0, 0);
                        prevBtn.disabled = (viewStart <= todayStart);
                        
                        // Disable next button if we're at the valid range end
                        const validRangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                        nextBtn.disabled = (viewEnd >= validRangeEnd);
                    }
                    
                    // Previous/Next month buttons
                    const prevBtn = document.getElementById('prevWeekBtn');
                    const nextBtn = document.getElementById('nextWeekBtn');
                    
                    if (prevBtn) {
                        prevBtn.addEventListener('click', function() {
                            if (calendar && calendar.prev) {
                                calendar.prev();
                                updateNavigationButtons();
                                populateAvailableSlots(calendar, bookings);
                            }
                        });
                    }
                    
                    if (nextBtn) {
                        nextBtn.addEventListener('click', function() {
                            if (calendar && calendar.next) {
                                calendar.next();
                                updateNavigationButtons();
                                populateAvailableSlots(calendar, bookings);
                            }
                        });
                    }
                    
                    // FIX: Navigate to next available slot immediately after render
                    // Using requestAnimationFrame instead of setTimeout for better timing
                    requestAnimationFrame(() => {
                        if (calendar && calendar.gotoDate) {
                            findAndNavigateToNextAvailableWeek(calendar, bookings);
                            updateNavigationButtons();
                            populateAvailableSlots(calendar, bookings);
                        }
                        
                        // Don't show time selection grid initially - user must click a day first
                        const timeGridContainer = document.getElementById('time-selection-grid');
                        if (timeGridContainer) {
                            timeGridContainer.style.display = 'none';
                        }
                        
                        // FIX Issue 1: For mobile devices, don't apply compact class initially
                        // This ensures cells are visible immediately when calendar appears
                        // Also force updateSize to ensure proper rendering
                        if (isMobileView) {
                            // Skip compact class on mobile to prevent empty cells issue
                            calendarEl.classList.add('expanded');
                            // Force calendar to recalculate size after DOM is ready
                            if (calendar && calendar.updateSize) {
                                calendar.updateSize();
                            }
                        } else {
                            // Make calendar compact initially on desktop, expand on first interaction
                            calendarEl.classList.add('compact');
                        }
                        
                        // Expand calendar on first click (for desktop users)
                        let hasInteracted = false;
                        const expandCalendar = function() {
                            if (!hasInteracted) {
                                calendarEl.classList.remove('compact');
                                calendarEl.classList.add('expanded');
                                hasInteracted = true;
                                // Force calendar to update its size after expanding
                                if (calendar && calendar.updateSize) {
                                    calendar.updateSize();
                                }
                            }
                        };
                        
                        calendarEl.addEventListener('click', expandCalendar, { once: false });
                        calendarEl.addEventListener('touchstart', expandCalendar, { once: false });
                        
                        setupDropdownEventListener();
                    });
                    
                } catch (renderError) {
                    console.error('FullCalendar render failed:', renderError);
                    calendar = null; // Reset calendar to null so fallback can activate
                    return; // Exit early to trigger fallback
                }
            } catch (error) {
                console.error('Error preparing calendar render:', error);
                calendar = null;
                return;
            }
        }
        
        } catch (error) {
            // FIX: Enhanced error logging and handling for FullCalendar initialization
            console.error('FullCalendar failed to initialize:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            calendar = null;
        }
        
        // FIX: Enhanced fallback mechanism - show mock calendar if FullCalendar fails to load
        // This ensures users can still book appointments even if CDN is blocked by ad blockers
        setTimeout(() => {
            const calendarEl = document.getElementById('calendar');
            const mockCalendar = document.getElementById('mock-calendar');
            
            // FIX: Improved detection of FullCalendar rendering failure
            // Check multiple conditions to determine if fallback is needed
            if (!calendar || !calendarEl.innerHTML.trim() || calendarEl.children.length === 0) {
                console.log('FullCalendar failed to load or render. Activating fallback mock calendar.');
                
                // Show user-friendly message about using fallback
                const errorEl = document.getElementById('error');
                if (errorEl && !errorEl.innerHTML.includes('Kalenteri')) {
                    errorEl.innerHTML = '<strong>ℹ️ Vaihtoehtoinen kalenteri käytössä</strong><br>' +
                        'Pääkalenteri ei latautunut, mutta voit silti varata ajan alla olevasta kalenterista.<br>' +
                        'Vaihtoehtoisesti soita: <a href="tel:+358401935001" style="color: #333; font-weight: bold;">040 1935001</a>';
                    errorEl.style.display = 'block';
                    errorEl.style.backgroundColor = '#d1ecf1';
                    errorEl.style.color = '#0c5460';
                    errorEl.style.padding = '15px';
                    errorEl.style.marginBottom = '20px';
                    errorEl.style.borderRadius = '8px';
                    errorEl.style.border = '1px solid #bee5eb';
                    errorEl.style.textAlign = 'center';
                }
                
                mockCalendar.style.display = 'block';
                
                // Add click handlers to mock slots
                document.querySelectorAll('.mock-slot').forEach(slot => {
                    slot.addEventListener('click', function() {
                        const time = this.dataset.time;
                        const date = this.dataset.date;
                        
                        // Clear previous selections
                        document.querySelectorAll('.mock-slot').forEach(s => s.style.background = 'white');
                        this.style.background = '#666666';
                        this.style.color = 'white';
                        
                        if (isMobile) {
                            // Mobile: show time selection modal
                            const dateObj = new Date(date + 'T' + time);
                            const dayName = dateObj.toLocaleDateString('fi-FI', { weekday: 'long' });
                            showMobileTimeModal(date, dayName, []);
                        } else {
                            // Desktop: direct selection
                            const selectedDateTime = new Date(date + 'T' + time);
                            selectedSlot = selectedDateTime;
                            const aikaTxt = selectedDateTime.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'numeric' }) +
                                ', klo ' + selectedDateTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
                            
                            // Update slot summary display with two-line layout
                            updateSlotSummary(aikaTxt);
                            
                            document.getElementById('aika').value = aikaTxt;
                            document.getElementById('bookingForm').style.display = '';
                            document.getElementById('error').textContent = '';
                        }
                    });
                    
                    // Enhanced mobile touch handling for mock slots
                    let mockTouchStarted = false;
                    let mockTouchStartTime = 0;
                    
                    slot.addEventListener('touchstart', function(e) {
                        mockTouchStarted = true;
                        mockTouchStartTime = Date.now();
                        e.preventDefault();
                    }, { passive: false });
                    
                    slot.addEventListener('touchend', function(e) {
                        const touchDuration = Date.now() - mockTouchStartTime;
                        
                        if (mockTouchStarted && touchDuration < 300) {
                            // Trigger click for mobile
                            this.click();
                        }
                        
                        mockTouchStarted = false;
                        e.preventDefault();
                    }, { passive: false });
                });
                
                // Setup dropdown event listener for fallback case
                setupDropdownEventListener();
            }
        }, 1000); // Wait 1 second for FullCalendar to load
        
        // Mobile modal event listeners
        document.getElementById('mobileTimeCancel').addEventListener('click', hideMobileTimeModal);
        document.getElementById('mobileTimeConfirm').addEventListener('click', function() {
            confirmMobileTimeSelection(calendar);
        });
        
        // Close modal when clicking outside
        document.getElementById('mobileTimeModal').addEventListener('click', function(e) {
            if (e.target === this) {
                hideMobileTimeModal();
            }
        });
        
        // Handle window resize to update mobile detection
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const newIsMobile = isMobileDevice();
                if (newIsMobile !== isMobile) {
                    isMobile = newIsMobile;
                }
                if (calendar && calendar.updateSize) {
                    calendar.updateSize();
                }
            }, 250);
        });
        
        // Simplified touch event handling for mobile devices - improved tap-to-select (fix for issue #4)
        let touchStarted = false;
        let touchStartTime = 0;
        let touchStartTarget = null;
        
        // Simplified touch handling for better mobile interaction
        calendarEl.addEventListener('touchstart', function(e) {
            touchStarted = true;
            touchStartTime = Date.now();
            touchStartTarget = e.target || e.touches[0].target;
        }, { passive: true });
        
        calendarEl.addEventListener('touchend', function(e) {
            const touchDuration = Date.now() - touchStartTime;
            const touchEndTarget = e.target || e.changedTouches[0].target;
            
            // Simple tap detection: short duration and same target
            if (touchStarted && touchDuration < 500 && touchStartTarget === touchEndTarget) {
                // Check if we're on a mobile device and clicked on a calendar element
                if (isMobile) {
                    // Look for calendar slot elements (works for both FullCalendar and mock calendar)
                    const slot = touchEndTarget.closest('.fc-timegrid-slot, .fc-timegrid-slot-lane, .mock-slot');
                    if (slot) {
                        // Trigger a synthetic click event for consistent behavior
                        const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        slot.dispatchEvent(clickEvent);
                        e.preventDefault(); // Prevent double-triggering
                    }
                }
            }
            
            // Reset touch state
            touchStarted = false;
            touchStartTarget = null;
        }, { passive: false });
        
        calendarEl.addEventListener('touchcancel', function(e) {
            // Reset touch state on cancel
            touchStarted = false;
            touchStartTarget = null;
        }, { passive: true });
        
        // Handle window resize to refresh calendar touch handling
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (calendar && calendar.updateSize) {
                    calendar.updateSize();
                }
            }, 250);
        });
        
        document.getElementById('bookingForm').onsubmit = async function (e) {
            e.preventDefault();
            document.getElementById('msg').textContent = '';
            document.getElementById('error').textContent = '';
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const aikaValue = document.getElementById('aika').value;
            
            if (!/^\+358\s?\d{1,3}\s?\d{4,}$/.test(phone)) {
                document.getElementById('error').textContent = 'Syötä puhelinnumero muodossa +358 401234567!';
                return;
            }
            
            // Validate vehicle type is selected using helper function
            if (!validateVehicleType()) {
                return;
            }
            
            if (!selectedSlot || !name || !email || !phone) {
                document.getElementById('error').textContent = 'Täytä kaikki kentät ja valitse aika!';
                return;
            }
            
            // Show loading animation bar when booking starts
            const progressBar = document.getElementById('bookingProgress');
            const progressValue = document.getElementById('bookingProgressValue');
            const successBar = document.getElementById('successBar');
            
            // Hide success bar and show loading bar
            successBar.classList.remove('active');
            progressBar.classList.add('active');
            progressValue.style.width = '0';
            
            // Trigger animation
            setTimeout(() => {
                progressValue.style.animation = 'load 3s normal forwards';
            }, 10);
            
            try {
                // Execute reCAPTCHA v3 to get token
                let recaptchaToken;
                try {
                    recaptchaToken = await executeRecaptcha('booking');
                } catch (recaptchaError) {
                    throw new Error('Turvavarmennus epäonnistui. Päivitä sivu ja yritä uudelleen.');
                }
                
                // Prepare structured service data with prices
                const serviceData = prepareServiceData();
                
                // Get vehicle type
                const vehicleType = getSelectedVehicleType();
                
                // Send booking to backend Firebase Function with retry logic
                const bookingData = {
                    name, email, phone,
                    aika: selectedSlot.toISOString(),
                    services: serviceData.services,
                    totalPrice: serviceData.totalPrice,
                    totalNumericPrice: serviceData.totalNumericPrice,
                    vehicleType: vehicleType,
                    recaptcha: recaptchaToken
                };
                
                const result = await fetchWithRetry(
                    'https://us-central1-fxnr-web.cloudfunctions.net/book',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bookingData)
                    },
                    2 // Max 2 retries
                );
                
                if (result) {
                    // Hide loading bar and show success bar
                    progressBar.classList.remove('active');
                    successBar.classList.add('active');
                    
                    document.getElementById('msg').innerHTML = "Varaus onnistui! <br>Saat varausvahvistuksen sähköpostiisi pian.";
                    document.getElementById('bookingForm').reset();
                    document.getElementById('bookingForm').style.display = 'none';
                    document.getElementById('slot-summary').textContent = '';
                    document.getElementById('add-service-container').style.display = 'none';
                    document.getElementById('selected-services-container').style.display = 'none';
                    document.getElementById('repair-disclaimer').style.display = 'none';
                    selectedSlot = null;
                    selectedServices = [];
                    bookings = await fetchBookings();
                    
                    if (calendar && typeof calendar.refetchEvents === 'function') {
                        calendar.refetchEvents();
                    }
                } else {
                    throw new Error('Varaus epäonnistui. Yritä uudelleen!');
                }
            } catch (error) {
                console.error('Booking submission error:', error);
                document.getElementById('error').textContent = error.message || 'Varaus epäonnistui. Yritä uudelleen!';
                // Hide both bars on error
                progressBar.classList.remove('active');
                successBar.classList.remove('active');
            }
        };
    });
}

// Expose initialization function globally for dynamic loading
window.initializeBookingSystem = initializeBookingSystem;

// Auto-initialize if FullCalendar is already loaded
if (typeof FullCalendar !== 'undefined') {
    if ('requestIdleCallback' in window) {
        window.addEventListener('load', function() {
            requestIdleCallback(() => {
                if (typeof FullCalendar !== 'undefined' && FullCalendar.Calendar) {
                    initializeBookingSystem();
                } else {
                    console.error('FullCalendar not available during initialization');
                }
            }, { timeout: 2000 });
        });
    } else {
        window.addEventListener('load', function() {
            setTimeout(() => {
                if (typeof FullCalendar !== 'undefined' && FullCalendar.Calendar) {
                    initializeBookingSystem();
                } else {
                    console.error('FullCalendar not available during initialization');
                }
            }, 1);
        });
    }
}
