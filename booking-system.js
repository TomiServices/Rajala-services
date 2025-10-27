// NOTE: No Firebase config in HTML for security. Use server endpoints instead.

// Lazy load reCAPTCHA when user scrolls to booking section
let recaptchaLoaded = false;
function loadRecaptcha() {
    if (recaptchaLoaded) return;
    recaptchaLoaded = true;
    
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// Observe booking section visibility to lazy load reCAPTCHA
const bookingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadRecaptcha();
            bookingObserver.disconnect(); // Only load once
        }
    });
}, { rootMargin: '50px' });

// Start observing when DOM is ready
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
        const calendarSection = document.getElementById('calendar');
        if (calendarSection) bookingObserver.observe(calendarSection);
    });
} else {
    setTimeout(() => {
        const calendarSection = document.getElementById('calendar');
        if (calendarSection) bookingObserver.observe(calendarSection);
    }, 100);
}

// Calendar booking logic (ready for backend API, e.g. Firebase Function)
// Defer heavy initialization until after page load + idle time to minimize main-thread blocking
function initializeBookingSystem() {
    const calendarEl = document.getElementById('calendar');
    let selectedSlot = null;

    // FIXED: Fetch bookings from your backend Firebase Function
    async function fetchBookings() {
        try {
            const response = await fetch('https://us-central1-fxnr-web.cloudfunctions.net/bookings');
            return response.ok ? await response.json() : [];
        } catch (error) {
            // Fallback mock data for testing when external APIs are blocked
            console.log('Using fallback mock data for testing');
            return [
                { aika: '2024-12-06T10:00:00.000Z' },
                { aika: '2024-12-06T14:00:00.000Z' },
                { aika: '2024-12-07T11:00:00.000Z' },
                { aika: '2024-12-09T15:00:00.000Z' }
            ];
        }
    }

    // Helper functions for date handling
    function getDateKey(date) {
        // FIX: validated date in getDateKey
        // If date is a string, attempt to convert it to a Date object
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // Validate the input to ensure it is a valid Date object
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            console.error('getDateKey called with invalid date:', date);
            return null;
        }
        
        // Use local date to avoid timezone issues causing off-by-one day selection
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        if (!gridContainer) return;
        
        gridContainer.innerHTML = '';
        
        // Validate selectedDate before proceeding
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            console.error('populateTimeSelectionGrid called with invalid date:', selectedDate);
            if (timeSelectionContainer) {
                timeSelectionContainer.style.display = 'none';
            }
            return false;
        }
        
        // Get current date
        const now = new Date();
        
        // FIX: null check before filter()
        // Ensure bookings is not null or undefined before calling filter()
        if (!bookings) {
            bookings = [];
        }
        
        const dateKey = getDateKey(selectedDate);
        // Add null check for dateKey
        if (!dateKey) {
            console.error('Failed to generate dateKey for selectedDate:', selectedDate);
            if (timeSelectionContainer) {
                timeSelectionContainer.style.display = 'none';
            }
            return false;
        }
        const dayBookings = bookings.filter(b => {
            const bookingDateKey = getDateKey(new Date(b.aika));
            return bookingDateKey && bookingDateKey === dateKey;
        });
        
        // Get current hour for checking if slot is in the past
        const isToday = getDateKey(now) === dateKey;
        const currentHour = now.getHours();
        
        let hasAvailableSlots = false;
        
        // Generate time slots for business hours (9-17) - only for the selected day
        for (let hour = 9; hour < 17; hour++) {
            const slotTime = new Date(selectedDate);
            slotTime.setHours(hour, 0, 0, 0);
            
            // Validate slotTime before using it
            if (isNaN(slotTime.getTime())) {
                console.error('Invalid slotTime generated for hour:', hour, 'from selectedDate:', selectedDate);
                continue;
            }
            
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
                document.getElementById('serviceSelection').style.display = 'block';
                
                // Clear any errors
                document.getElementById('error').textContent = '';
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
    }
    
    function hideMobileTimeModal() {
        const modal = document.getElementById('mobileTimeModal');
        modal.classList.remove('active');
        selectedMobileDate = null;
        selectedMobileTime = null;
        document.getElementById('mobileTimeConfirm').disabled = true;
    }

    // Function to populate time slots for a specific selected date
    function populateTimeSlotsForDate(selectedDate, bookings) {
        const slotsSection = document.getElementById('availableSlots');
        const selectElement = document.getElementById('availableTimesSelect');
        const labelElement = document.getElementById('availableTimesLabel');
        
        if (!selectElement) return;
        
        // Validate selectedDate before proceeding
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            console.error('populateTimeSlotsForDate called with invalid date:', selectedDate);
            return false;
        }
        
        // Format the selected date for display
        const formattedDate = selectedDate.toLocaleDateString('fi-FI', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'numeric' 
        });
        
        // Update label to show selected date
        labelElement.textContent = `Valitse aika - ${formattedDate}:`;
        
        // Clear existing options
        selectElement.innerHTML = '<option value="">Valitse aika...</option>';
        
        // Get bookings for the selected date
        const dateKey = getDateKey(selectedDate);
        // Add null check for dateKey
        if (!dateKey) {
            console.error('Failed to generate dateKey for selectedDate:', selectedDate);
            return false;
        }
        const dayBookings = bookings.filter(b => {
            const bookingDateKey = getDateKey(new Date(b.aika));
            return bookingDateKey && bookingDateKey === dateKey;
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
            
            const timeSlot = new Date(selectedDate);
            timeSlot.setHours(hour, 0, 0, 0);
            
            // Validate timeSlot before using toISOString
            if (isNaN(timeSlot.getTime())) {
                console.error('Invalid timeSlot generated for hour:', hour, 'from selectedDate:', selectedDate);
                continue;
            }
            
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
                    if (window.calendar) {
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
            const endTime = new Date(selectedDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
            if (calendar) {
                calendar.select(selectedDateTime, endTime);
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

    // Service and task data structure
    const serviceData = {
        tire: {
            name: 'Rengastyöt',
            tasks: [
                { id: 'tire-change', name: 'Renkaiden vaihto', price: 'alkaen 35 €' },
                { id: 'tire-change-14-16', name: 'Renkaiden vaihto (14-16 tuumaa)', price: 'alkaen 40 €' },
                { id: 'tire-change-17-18', name: 'Renkaiden vaihto (17-18 tuumaa)', price: 'alkaen 45 €' },
                { id: 'tire-change-19-22', name: 'Renkaiden vaihto (19-22 tuumaa)', price: 'alkaen 50 €' },
                { id: 'balancing', name: 'Tasapainotus', price: '20 € / sarja' },
                { id: 'tire-repair', name: 'Renkaan paikkaus', price: 'alkaen 25 €' },
                { id: 'tire-hotel', name: 'Rengashotelli', price: 'alkaen 55 € / kausi' }
            ]
        },
        repair: {
            name: 'Korjaustyöt',
            tasks: [
                { id: 'diagnostics', name: 'Vikakoodien luku ja nollaus', price: 'alkaen 40 €' },
                { id: 'shock-absorber', name: 'Iskunvaimentimien ja jousituksen uusiminen', price: '' },
                { id: 'suspension-parts', name: 'Tukivarsien, nivelien ja raidetankojen vaihto', price: '' },
                { id: 'stabilizer-bar', name: 'Vakaajatangon ja koiranluiden vaihto', price: '' },
                { id: 'brake-repair', name: 'Jarrulevyjen, palojen ja käsijarrujen korjaukset', price: '' },
                { id: 'exhaust-repair', name: 'Pakoputkistojen korjaukset', price: '' }
            ]
        },
        washing: {
            name: 'Pesupalvelut',
            tasks: [
                { id: 'quick-wash', name: 'Pikapesu', price: 'alkaen 20 €' },
                { id: 'hand-wash', name: 'Käsinpesu', price: 'alkaen 25 €' },
                { id: 'tire-wash', name: 'Renkaiden pesu', price: 'alkaen 15 €' },
                { id: 'waxing', name: 'Vahaukset', price: 'alkaen 35 €' },
                { id: 'hard-wax', name: 'Kova vaha', price: 'alkaen 45 €' },
                { id: 'ceramic-spray', name: 'Ceramic spray -pinnoite', price: 'alkaen 60 €' },
                { id: 'water-repellent', name: 'Vettä ja likaa hylkivä pinnoite', price: 'alkaen 40 €' }
            ]
        },
        polishing: {
            name: 'Kiilloitus ja pinnoitteet',
            tasks: [
                { id: 'wax', name: 'Vahaus', price: 'alkaen 80 €' },
                { id: '1-step-polish', name: '1-step kiillotus', price: 'alkaen 120 €' },
                { id: '2-step-polish', name: '2-step kiillotus', price: 'alkaen 180 €' },
                { id: '3-step-ceramic', name: '3-step + keraaminen pinnoitus', price: 'alkaen 300 €' },
                { id: 'scratch-removal', name: 'Naarmujen poisto', price: 'alkaen 50 € / paneeli' }
            ]
        },
        interior: {
            name: 'Sisäpuhdistus',
            tasks: [
                { id: 'interior-cleaning', name: 'Sisätilojen puhdistus', price: 'alkaen 49 €' },
                { id: 'interior-and-wash', name: 'Sisätila + käsinpesu', price: 'alkaen 65 €' },
                { id: 'ozone', name: 'Otsonointi', price: 'alkaen 80 €' },
                { id: 'deep-cleaning', name: 'Syväpuhdistus (detailing)', price: 'alkaen 150 €' },
                { id: 'leather-care', name: 'Nahkapenkkien hoito ja suojaus', price: 'alkaen 75 €' },
                { id: 'fabric-cleaning', name: 'Kankaan puhdistus kangaspesurilla', price: 'alkaen 60 €' },
                { id: 'odor-removal', name: 'Hajunpoisto erikoisaineilla', price: 'alkaen 70 €' },
                { id: 'allergy-cleaning', name: 'Allergiapuhdistus', price: 'alkaen 90 €' },
                { id: 'fabric-protection', name: 'Kangaspintojen suojaus', price: 'alkaen 85 €' }
            ]
        }
    };

    // Multiple services management
    let selectedServices = [];
    
    function addSelectedService(service, task) {
        const serviceObj = serviceData[service];
        const taskObj = serviceObj.tasks.find(t => t.id === task);
        
        if (!serviceObj || !taskObj) return;
        
        // Add to selected services array
        selectedServices.push({
            service: service,
            serviceName: serviceObj.name,
            task: task,
            taskName: taskObj.name,
            taskPrice: taskObj.price || ''
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
        
        let totalMin = 0;
        let hasVariablePricing = false;
        
        selectedServices.forEach((service, index) => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
            
            const serviceText = document.createElement('span');
            if (service.taskPrice && service.taskPrice.trim() !== '') {
                serviceText.textContent = `${service.serviceName} - ${service.taskName}: ${service.taskPrice}`;
                
                // Extract price for total calculation
                const priceMatch = service.taskPrice.match(/(\d+)\s*€/);
                if (priceMatch) {
                    totalMin += parseInt(priceMatch[1]);
                }
                // Check if it says "alkaen" (starting from)
                if (service.taskPrice.includes('alkaen') || service.taskPrice === '') {
                    hasVariablePricing = true;
                }
            } else {
                serviceText.textContent = `${service.serviceName} - ${service.taskName}`;
                hasVariablePricing = true;
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
        
        // Display total if we have at least one priced service
        if (totalMin > 0) {
            totalContainer.style.display = 'block';
            if (hasVariablePricing) {
                totalAmountSpan.textContent = `alkaen ${totalMin} €`;
            } else {
                totalAmountSpan.textContent = `${totalMin} €`;
            }
        } else {
            totalContainer.style.display = 'none';
        }
    }
    
    function updateRepairDisclaimer() {
        const repairDisclaimer = document.getElementById('repair-disclaimer');
        const hasRepairService = selectedServices.some(s => s.service === 'repair');
        
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
                    
                    // Populate task dropdown
                    taskSelect.innerHTML = '<option value="">Valitse tyyppi...</option>';
                    serviceData[selectedService].tasks.forEach(task => {
                        const option = document.createElement('option');
                        option.value = task.id;
                        // Display price only if it exists and is not empty
                        if (task.price && task.price.trim() !== '') {
                            option.textContent = `${task.name}: ${task.price}`;
                        } else {
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
                
                if (selectedTask) {
                    // Task selected - booking is complete, show booking form
                    const selectedDateTime = getCurrentSelectedDateTime();
                    if (selectedDateTime) {
                        showBookingForm(selectedDateTime);
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

    // Show booking form with selected time and service info
    function showBookingForm(selectedDateTime) {
        const serviceSelect = document.getElementById('serviceSelect');
        const taskSelect = document.getElementById('taskSelect');
        
        const selectedService = serviceSelect.value;
        const selectedTask = taskSelect.value;
        
        if (selectedDateTime && selectedService && selectedTask) {
            // Add service to the list if it's a new service
            addSelectedService(selectedService, selectedTask);
            
            selectedSlot = selectedDateTime;
            const aikaTxt = selectedDateTime.toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'numeric' }) +
                ', klo ' + selectedDateTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
            
            document.getElementById('slot-summary').textContent = 'Valittu aika: ' + aikaTxt;
            document.getElementById('aika').value = aikaTxt;
            
            // Store all services as comma-separated values
            const serviceValues = selectedServices.map(s => s.service).join(', ');
            const taskValues = selectedServices.map(s => s.task).join(', ');
            document.getElementById('service').value = serviceValues;
            document.getElementById('task').value = taskValues;
            
            // Show repair disclaimer if any repair service is selected
            updateRepairDisclaimer();
            
            // Show add service button and booking form
            document.getElementById('add-service-container').style.display = 'block';
            document.getElementById('bookingForm').style.display = '';
            document.getElementById('error').textContent = '';
            
            // Hide service selection dropdowns after adding service (user can click button to add more)
            document.getElementById('serviceSelection').style.display = 'none';
            document.getElementById('taskSelection').style.display = 'none';
        }
    }

    // Call setupServiceSelection immediately
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
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Find next available slot within next 30 days
        for (let daysFromToday = 0; daysFromToday < 30; daysFromToday++) {
            const checkDate = new Date(startOfToday);
            checkDate.setDate(startOfToday.getDate() + daysFromToday);
            
            // Skip weekends
            const dayOfWeek = checkDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            // Check if this day has available slots
            const dateKey = getDateKey(checkDate);
            // Skip if dateKey is null (invalid date)
            if (!dateKey) {
                console.error('Failed to generate dateKey for checkDate:', checkDate);
                continue;
            }
            const dayBookingCount = bookings.filter(b => {
                const bookingDateKey = getDateKey(new Date(b.aika));
                return bookingDateKey && bookingDateKey === dateKey;
            }).length;
            
            // If day has less than 2 bookings, it has available slots
            if (dayBookingCount < 2) {
                // Navigate calendar to the week containing this date
                calendar.gotoDate(checkDate);
                console.log('Navigated to week containing next available slot:', checkDate.toLocaleDateString('fi-FI'));
                return checkDate;
            }
        }
        
        // If no available slots found, stay on current week
        console.log('No available slots found in next 30 days');
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
        function isSlotBooked(slot) {
            return bookings.some(b => b.aika === slot.start.toISOString());
        }
        function getBookingsCountForDay(date) {
            const dateKey = getDateKey(date);
            // Return 0 if dateKey is null (invalid date)
            if (!dateKey) {
                console.error('Failed to generate dateKey in getBookingsCountForDay for date:', date);
                return 0;
            }
            return bookings.filter(b => {
                const bookingDateKey = getDateKey(new Date(b.aika));
                return bookingDateKey && bookingDateKey === dateKey;
            }).length;
        }
        
        let calendar = null;
        
        try {
            // Try to initialize FullCalendar
            // Mobile: 2 weeks view, Desktop: current month view
            const isMobileView = window.innerWidth < 768;
            calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: isMobileView ? 'dayGridTwoWeeks' : 'dayGridMonth',
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
            // Update available slots when view changes
            viewDidMount: function(info) {
                // Small delay to ensure view is fully rendered
                setTimeout(() => {
                    populateAvailableSlots(calendar, bookings);
                }, 50);
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
                let start = info.start;
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                // Prevent selection of past dates
                if (start < now) {
                    if (calendar) calendar.unselect();
                    document.getElementById('error').textContent = 'Et voi valita mennyttä päivämäärää!';
                    return;
                }
                
                const dayOfWeek = start.getDay();
                
                // Only allow weekday selections
                if (dayOfWeek < 1 || dayOfWeek > 5) {
                    if (calendar) calendar.unselect();
                    document.getElementById('error').textContent = 'Valitse arkipäivä (maanantai-perjantai)!';
                    return;
                }

                // If on mobile device, show mobile modal instead of direct selection
                if (isMobile) {
                    const dateStr = getDateKey(start);
                    // Check if dateStr is valid before showing modal
                    if (dateStr) {
                        showMobileTimeModal(dateStr, null, bookings);
                    } else {
                        console.error('Failed to generate dateKey for start date:', start);
                        document.getElementById('error').textContent = 'Virhe päivämäärän käsittelyssä. Yritä uudelleen.';
                    }
                    if (calendar) calendar.unselect();
                    return;
                }

                // Desktop behavior: Show time slots grid for selected date
                const selectedDate = new Date(start);
                selectedDate.setHours(9, 0, 0, 0);
                
                // Populate time selection grid with available slots for the selected date
                const hasAvailableSlots = populateTimeSelectionGrid(selectedDate, bookings);
                
                if (hasAvailableSlots) {
                    document.getElementById('error').textContent = '';
                    // Scroll to time selection
                    const timeGridContainer = document.getElementById('time-selection-grid');
                    if (timeGridContainer) {
                        timeGridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                } else {
                    document.getElementById('error').textContent = 'Valitulle päivälle ei ole vapaita aikoja saatavilla.';
                }
                
                // Unselect the calendar selection since user hasn't picked a time yet
                if (calendar) calendar.unselect();
            },
            dateClick: function(info) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                // Prevent selection of past dates
                if (info.date < now) {
                    document.getElementById('error').textContent = 'Et voi valita mennyttä päivämäärää!';
                    return;
                }
                
                // Handle day/slot clicks - use same logic as select for consistency
                const dayOfWeek = info.date.getDay();
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Only weekdays
                    if (isMobile) {
                        const dateStr = getDateKey(info.date);
                        // Check if dateStr is valid before showing modal
                        if (dateStr) {
                            showMobileTimeModal(dateStr, null, bookings);
                        } else {
                            console.error('Failed to generate dateKey for info.date:', info.date);
                            document.getElementById('error').textContent = 'Virhe päivämäärän käsittelyssä. Yritä uudelleen.';
                        }
                    } else {
                        // For desktop, show time selection grid
                        const selectedDate = new Date(info.date);
                        selectedDate.setHours(9, 0, 0, 0);
                        
                        const hasAvailableSlots = populateTimeSelectionGrid(selectedDate, bookings);
                        
                        if (hasAvailableSlots) {
                            document.getElementById('error').textContent = '';
                            // Scroll to time selection
                            const timeGridContainer = document.getElementById('time-selection-grid');
                            if (timeGridContainer) {
                                timeGridContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        } else {
                            document.getElementById('error').textContent = 'Valitulle päivälle ei ole vapaita aikoja saatavilla.';
                        }
                    }
                }
            },
            events: function (fetchInfo, successCallback) {
                const evs = [];
                
                // For dayGrid view, show booking count per day
                const currentDate = new Date(fetchInfo.start);
                const endDate = new Date(fetchInfo.end);
                
                while (currentDate < endDate) {
                    const dayOfWeek = currentDate.getDay();
                    // Only process weekdays
                    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                        const dateKey = getDateKey(currentDate);
                        // Skip if dateKey is null (invalid date)
                        if (!dateKey) {
                            currentDate.setDate(currentDate.getDate() + 1);
                            continue;
                        }
                        const dayBookingsCount = bookings.filter(b => {
                            const bookingDateKey = getDateKey(new Date(b.aika));
                            return bookingDateKey && bookingDateKey === dateKey;
                        }).length;
                        
                        if (dayBookingsCount > 0) {
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
            }
        });
        
        if (calendar) {
            calendar.render();
            
            // Navigation button state management for month view
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            function updateNavigationButtons() {
                const prevBtn = document.getElementById('prevWeekBtn');
                const nextBtn = document.getElementById('nextWeekBtn');
                const currentDate = calendar.getDate();
                
                // Get the view start date (first visible date in calendar)
                const view = calendar.view;
                const viewStart = view.currentStart;
                
                // Disable prev button if view start is at or before today
                const todayStart = new Date(today);
                todayStart.setHours(0, 0, 0, 0);
                
                if (viewStart <= todayStart) {
                    prevBtn.disabled = true;
                } else {
                    prevBtn.disabled = false;
                }
                
                // Disable next button if we're at the valid range end
                const validRangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
                const viewEnd = view.currentEnd;
                
                if (viewEnd >= validRangeEnd) {
                    nextBtn.disabled = true;
                } else {
                    nextBtn.disabled = false;
                }
            }
            
            // Previous month button
            document.getElementById('prevWeekBtn').addEventListener('click', function() {
                calendar.prev();
                updateNavigationButtons();
                populateAvailableSlots(calendar, bookings);
            });
            
            // Next month button
            document.getElementById('nextWeekBtn').addEventListener('click', function() {
                calendar.next();
                updateNavigationButtons();
                populateAvailableSlots(calendar, bookings);
            });
            
            // Navigate to week with next available booking slot
            setTimeout(() => {
                findAndNavigateToNextAvailableWeek(calendar, bookings);
                updateNavigationButtons();
                // Populate available slots for the current week
                populateAvailableSlots(calendar, bookings);
                // Don't show time selection grid initially - user must click a day first
                const timeGridContainer = document.getElementById('time-selection-grid');
                if (timeGridContainer) {
                    timeGridContainer.style.display = 'none';
                }
                // Setup dropdown event listener
                setupDropdownEventListener();
            }, 100); // Small delay to ensure calendar is fully rendered
        }
        
        } catch (error) {
            console.log('FullCalendar failed to initialize:', error);
            calendar = null;
        }
        
        // Fallback: If FullCalendar doesn't load (CDN blocked), show mock calendar
        setTimeout(() => {
            const calendarEl = document.getElementById('calendar');
            const mockCalendar = document.getElementById('mock-calendar');
            
            // Check if FullCalendar actually rendered content or if it failed to initialize
            if (!calendar || !calendarEl.innerHTML.trim() || calendarEl.children.length === 0) {
                console.log('FullCalendar failed to load, showing mock calendar for testing');
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
                            document.getElementById('slot-summary').textContent = 'Valittu aika: ' + aikaTxt;
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
                if (calendar) calendar.updateSize();
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
                if (calendar) calendar.updateSize();
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
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                document.getElementById('error').textContent = 'Vahvista että et ole robotti!';
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
                // Build service description from selected services
                const palveluText = selectedServices.map(s => s.serviceName).join(', ');
                const palvelunTyyppiText = selectedServices.map(s => {
                    if (s.taskPrice && s.taskPrice.trim() !== '') {
                        return `${s.taskName}: ${s.taskPrice}`;
                    }
                    return s.taskName;
                }).join(', ');
                
                // FIXED: Send booking to backend Firebase Function
                const res = await fetch('https://us-central1-fxnr-web.cloudfunctions.net/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name, email, phone,
                        aika: selectedSlot.toISOString(),
                        palvelu: palveluText,
                        palvelunTyyppi: palvelunTyyppiText,
                        recaptcha: recaptchaResponse
                    })
                });
                if (res.ok) {
                    // Hide loading bar and show success bar
                    progressBar.classList.remove('active');
                    successBar.classList.add('active');
                    
                    document.getElementById('msg').innerHTML = "Varaus onnistui! <br>Saat varausvahvistuksen sähköpostiisi pian.";
                    document.getElementById('bookingForm').reset();
                    grecaptcha.reset();
                    document.getElementById('bookingForm').style.display = 'none';
                    document.getElementById('slot-summary').textContent = '';
                    document.getElementById('add-service-container').style.display = 'none';
                    document.getElementById('selected-services-container').style.display = 'none';
                    document.getElementById('repair-disclaimer').style.display = 'none';
                    selectedSlot = null;
                    selectedServices = [];
                    bookings = await fetchBookings();
                    if (calendar) calendar.refetchEvents();
                    
                    // Keep success bar visible (don't auto-hide)
                } else {
                    const err = await res.json();
                    throw new Error(err.message || 'Varaus epäonnistui. Yritä uudelleen!');
                }
            } catch (error) {
                console.error(error);
                document.getElementById('error').textContent = error.message || 'Varaus epäonnistui. Yritä uudelleen!';
                // Hide both bars on error
                progressBar.classList.remove('active');
                successBar.classList.remove('active');
            }
        };
    });
}

// Use requestIdleCallback to defer initialization until browser is idle
// This reduces main-thread blocking and improves initial page load performance
if ('requestIdleCallback' in window) {
    window.addEventListener('load', function() {
        requestIdleCallback(initializeBookingSystem, { timeout: 2000 });
    });
} else {
    // Fallback for browsers without requestIdleCallback
    window.addEventListener('load', function() {
        setTimeout(initializeBookingSystem, 1);
    });
}
