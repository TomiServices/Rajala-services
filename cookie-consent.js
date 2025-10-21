/**
 * Cookie Consent Banner for Fixnero Website
 * GDPR Compliant - No analytics run before user consent
 */

(function() {
    'use strict';
    
    // Cookie consent configuration
    const COOKIE_NAME = 'fixnero_cookie_consent';
    const COOKIE_EXPIRY_DAYS = 365;
    
    // Check if user has already given consent
    function getCookieConsent() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === COOKIE_NAME) {
                return value;
            }
        }
        return null;
    }
    
    // Set cookie consent
    function setCookieConsent(value) {
        const date = new Date();
        date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = COOKIE_NAME + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
    }
    
    // Initialize Google Analytics 4
    function initAnalytics() {
        // Check if GA is already loaded
        if (window.gtag) {
            console.log('Google Analytics already initialized');
            return;
        }
        
        // GA4 Measurement ID - Replace with actual ID when available
        const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: Replace with actual GA4 ID
        
        // Load GA4 script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
        document.head.appendChild(script);
        
        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID, {
            'anonymize_ip': true,
            'cookie_flags': 'SameSite=Lax;Secure'
        });
        
        console.log('Google Analytics initialized');
    }
    
    // Show cookie consent banner
    function showCookieBanner() {
        // Create banner HTML
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <p>
                        <strong>🍪 Evästeet</strong><br>
                        Sivustomme käyttää evästeitä käyttökokemuksen parantamiseksi ja analytiikkaan. 
                        Hyväksymällä evästeet autat meitä kehittämään palveluitamme.
                    </p>
                </div>
                <div class="cookie-consent-buttons">
                    <button id="cookie-accept" class="cookie-btn cookie-btn-accept">
                        Hyväksy evästeet
                    </button>
                    <button id="cookie-reject" class="cookie-btn cookie-btn-reject">
                        Vain välttämättömät
                    </button>
                    <a href="cookie-policy.html" class="cookie-link">
                        Lue lisää
                    </a>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #cookie-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(10px);
                color: #fff;
                padding: 20px;
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideUp 0.4s ease-out;
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .cookie-consent-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .cookie-consent-text {
                flex: 1;
                min-width: 300px;
            }
            
            .cookie-consent-text p {
                margin: 0;
                line-height: 1.6;
                font-size: 0.95rem;
            }
            
            .cookie-consent-text strong {
                font-size: 1.1rem;
            }
            
            .cookie-consent-buttons {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            
            .cookie-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            
            .cookie-btn-accept {
                background: #4CAF50;
                color: #fff;
            }
            
            .cookie-btn-accept:hover {
                background: #45a049;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
            }
            
            .cookie-btn-reject {
                background: #666;
                color: #fff;
            }
            
            .cookie-btn-reject:hover {
                background: #555;
                transform: translateY(-2px);
            }
            
            .cookie-link {
                color: #fff;
                text-decoration: underline;
                font-size: 0.9rem;
                transition: color 0.3s ease;
            }
            
            .cookie-link:hover {
                color: #4CAF50;
            }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
                #cookie-consent-banner {
                    padding: 16px;
                }
                
                .cookie-consent-content {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 16px;
                }
                
                .cookie-consent-text {
                    min-width: auto;
                }
                
                .cookie-consent-text p {
                    font-size: 0.9rem;
                }
                
                .cookie-consent-buttons {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .cookie-btn {
                    width: 100%;
                    padding: 14px 20px;
                }
                
                .cookie-link {
                    text-align: center;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(banner);
        
        // Add event listeners
        document.getElementById('cookie-accept').addEventListener('click', function() {
            setCookieConsent('accepted');
            removeBanner();
            initAnalytics();
        });
        
        document.getElementById('cookie-reject').addEventListener('click', function() {
            setCookieConsent('rejected');
            removeBanner();
        });
    }
    
    // Remove cookie banner
    function removeBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }
    
    // Add slideDown animation
    const slideDownStyle = document.createElement('style');
    slideDownStyle.textContent = `
        @keyframes slideDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(slideDownStyle);
    
    // Initialize on page load
    function init() {
        const consent = getCookieConsent();
        
        if (consent === null) {
            // No consent yet, show banner
            showCookieBanner();
        } else if (consent === 'accepted') {
            // User has accepted, initialize analytics
            initAnalytics();
        }
        // If rejected, do nothing (only essential cookies)
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
