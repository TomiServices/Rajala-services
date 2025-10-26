// Core Web Vitals tracking
// This script tracks Core Web Vitals metrics and sends them to Google Analytics

// Function to send metrics to Google Analytics
function sendToAnalytics(metric) {
    // Check if gtag is available (loaded via cookie-consent.js)
    if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
            event_category: 'Web Vitals',
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            event_label: metric.id,
            non_interaction: true,
        });
        
        console.log('Web Vital:', metric.name, Math.round(metric.value), metric.rating);
    }
}

// Dynamically import web-vitals library
function loadWebVitals() {
    // Use a simple implementation without external library to keep it lightweight
    
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
        try {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                sendToAnalytics({
                    name: 'LCP',
                    value: lastEntry.renderTime || lastEntry.loadTime,
                    rating: lastEntry.renderTime < 2500 ? 'good' : lastEntry.renderTime < 4000 ? 'needs-improvement' : 'poor',
                    id: 'v1-' + Date.now()
                });
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            console.log('LCP tracking not supported');
        }

        // First Input Delay (FID)
        try {
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    sendToAnalytics({
                        name: 'FID',
                        value: entry.processingStart - entry.startTime,
                        rating: entry.processingStart - entry.startTime < 100 ? 'good' : entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor',
                        id: 'v1-' + Date.now()
                    });
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            console.log('FID tracking not supported');
        }

        // Cumulative Layout Shift (CLS)
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });

            // Report CLS when page is hidden
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    sendToAnalytics({
                        name: 'CLS',
                        value: clsValue,
                        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
                        id: 'v1-' + Date.now()
                    });
                }
            });
        } catch (e) {
            console.log('CLS tracking not supported');
        }

        // First Contentful Paint (FCP)
        try {
            const fcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    if (entry.name === 'first-contentful-paint') {
                        sendToAnalytics({
                            name: 'FCP',
                            value: entry.startTime,
                            rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor',
                            id: 'v1-' + Date.now()
                        });
                    }
                });
            });
            fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
            console.log('FCP tracking not supported');
        }

        // Time to First Byte (TTFB)
        try {
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            if (navigationEntry) {
                const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
                sendToAnalytics({
                    name: 'TTFB',
                    value: ttfb,
                    rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
                    id: 'v1-' + Date.now()
                });
            }
        } catch (e) {
            console.log('TTFB tracking not supported');
        }
    }
}

// Load Web Vitals tracking after page load
if (document.readyState === 'complete') {
    loadWebVitals();
} else {
    window.addEventListener('load', loadWebVitals);
}
