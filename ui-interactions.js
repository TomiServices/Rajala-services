// Defer non-critical UI initialization to reduce main-thread blocking
function initializeUIInteractions() {
    // Hamburger and nav toggle
    const hamburger = document.querySelector('.hamburger-menu');
    const nav = document.getElementById('nav');
    
    // Check if hamburger menu exists before attaching listeners
    if (!hamburger || !nav) {
        console.warn('Hamburger menu or nav element not found, skipping initialization');
        return;
    }
    
    hamburger.addEventListener('click', () => {
        const isExpanded = nav.classList.toggle('active');
        hamburger.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isExpanded);
    });
    hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isExpanded = nav.classList.toggle('active');
            hamburger.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', isExpanded);
        }
    });
    // Smooth scroll for all anchor links in nav and footer
    document.querySelectorAll('nav a, .footer a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#') && href.length > 1) {
            const scrollToElement = document.querySelector(href);
            if (scrollToElement) {
                e.preventDefault();
                // Batch layout reads/writes using requestAnimationFrame
                requestAnimationFrame(() => {
                    const offset = window.innerWidth <= 1279 ? 0 : 70;
                    const rect = scrollToElement.getBoundingClientRect();
                    const scrollTop = window.pageYOffset + rect.top - offset;
                    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
                    nav.classList.remove('active'); // Close mobile nav
                });
            }
        }
    });
});

    // Highlight current page in navigation (for subpages)
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const navLinks = document.querySelectorAll('nav a[href*="#"]');
    
    // Map of subpage filenames to their corresponding navigation section IDs
    const pageToSectionMap = {
        'pesupalvelut': 'pesupalvelut',
        'sisapuhdistus': 'sisapuhdistus',
        'kiilloitus': 'kiilloitus',
        'kolhukorjaus': 'kolhukorjaus',
        'korjaustyot': 'korjaustyot',
        'rengastyot': 'rengastyot',
        'lasikorjaus': 'lasikorjaus',
        'autohuolto': 'autohuolto'
    };
    
    // Apply nav-active class to corresponding navigation link on subpages
    if (currentPage && pageToSectionMap[currentPage]) {
        const sectionId = pageToSectionMap[currentPage];
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            // Check if link matches current page section (handles both #section and index#section formats)
            if (href === `#${sectionId}` || href === `index#${sectionId}` || href.endsWith(`#${sectionId}`)) {
                link.classList.add('nav-active');
            }
        });
    }

    // Scroll-based navigation highlighting (homepage only)
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('index') || currentPage === '' || currentPage === 'index') {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        
        function highlightNavigation() {
            // Refined offset: activates when section reaches middle of viewport
            const scrollPosition = window.scrollY + (window.innerHeight / 2);
            
            let activeSection = null;
            let closestDistance = Infinity;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                const sectionMiddle = sectionTop + (sectionHeight / 2);
                
                // Find section closest to viewport center
                const distance = Math.abs(scrollPosition - sectionMiddle);
                if (distance < closestDistance && scrollPosition >= sectionTop - 100) {
                    closestDistance = distance;
                    activeSection = sectionId;
                }
            });
            
            // Update nav links
            navLinks.forEach(link => {
                link.classList.remove('nav-active');
                if (activeSection && link.getAttribute('href') === `#${activeSection}`) {
                    link.classList.add('nav-active');
                }
            });
        }
        
        // Throttle scroll event for better performance
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = setTimeout(() => {
                    highlightNavigation();
                    scrollTimeout = null;
                }, 100);
            }
        }, { passive: true });
        
        // Initial highlight on page load
        highlightNavigation();
    }

// Responsive nav close on resize - debounced to reduce main-thread work
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth > 1279) {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    }, 150);
}, { passive: true });

    // Scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    // Observe elements with scroll-animate class
    document.querySelectorAll('.scroll-animate').forEach(element => {
        observer.observe(element);
    });

    // Add keyboard accessibility to category boxes
    document.querySelectorAll('.category-box').forEach(box => {
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                box.click();
            }
        });
    });
}

// Initialize UI interactions after DOM content is loaded, using idle callback to reduce blocking
if ('requestIdleCallback' in window) {
    document.addEventListener('DOMContentLoaded', () => {
        requestIdleCallback(initializeUIInteractions);
    });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeUIInteractions, 0);
    });
}
