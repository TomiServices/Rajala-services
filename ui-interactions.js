// Defer non-critical UI initialization to reduce main-thread blocking
function initializeUIInteractions() {
    // Hamburger and nav toggle
    const hamburger = document.querySelector('.hamburger-menu');
    const nav = document.getElementById('nav');
    hamburger.addEventListener('click', () => {
        nav.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            nav.classList.toggle('active');
            hamburger.classList.toggle('active');
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
// Responsive nav close on resize - debounced to reduce main-thread work
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth > 1279) {
            nav.classList.remove('active');
            hamburger.classList.remove('active');
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
