/**
 * Cookie Consent Banner for Fixnero Website
 * GDPR Compliant - No analytics run before user consent
 */

(function() {
    'use strict';
    
    const COOKIE_NAME = 'fixnero_cookie_consent';
    const COOKIE_EXPIRY_DAYS = 365;
    
    const translations = {
        fi: {
            title: '🍪 Evästeet',
            message: 'Sivustomme käyttää evästeitä käyttökokemuksen parantamiseksi ja analytiikkaan. Hyväksymällä evästeet autat meitä kehittämään palveluitamme.',
            accept: 'Hyväksy evästeet',
            reject: 'Vain välttämättömät',
            readMore: 'Lue lisää'
        },
        en: {
            title: '🍪 Cookies',
            message: 'Our website uses cookies to improve user experience and analytics. By accepting cookies, you help us develop our services.',
            accept: 'Accept cookies',
            reject: 'Essential only',
            readMore: 'Read more'
        }
    };
    
    function detectLanguage() {
        const browserLang = navigator.language;
        return browserLang.startsWith('fi') ? 'fi' : 'en';
    }
    
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
    
    function setCookieConsent(value) {
        const date = new Date();
        date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = COOKIE_NAME + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
    }
    
    function initAnalytics() {
        if (window.gtag) {
            return;
        }
        
        const GA_MEASUREMENT_ID = 'G-1DZ4WCV7ZK';
        
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        
        gtag('js', new Date());
        gtag('config', GA_MEASUREMENT_ID, {
            'anonymize_ip': true,
            'cookie_flags': 'SameSite=Lax;Secure'
        });
    }
    
    function showCookieBanner() {
        const lang = detectLanguage();
        const t = translations[lang];
        
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <p>
                        <strong>${t.title}</strong><br>
                        ${t.message}
                    </p>
                </div>
                <div class="cookie-consent-buttons">
                    <button id="cookie-accept" class="cookie-btn cookie-btn-accept">
                        ${t.accept}
                    </button>
                    <button id="cookie-reject" class="cookie-btn cookie-btn-reject">
                        ${t.reject}
                    </button>
                    <a href="cookie-policy" class="cookie-link">
                        ${t.readMore}
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
                color: #FFA500; /* Updated to orange for better accessibility and brand consistency */
            }
            
            .cookie-consent-text strong {
                font-size: 1.1rem;
                color: #FFA500; /* Updated to orange for better accessibility and brand consistency */
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
                background: #FF8C00; /* Updated to orange for brand consistency */
                color: #000; /* Black text for better contrast on orange background */
            }
            
            .cookie-btn-accept:hover {
                background: #FFA500; /* Brighter orange on hover */
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
            }
            
            .cookie-btn-reject {
                background: #666;
                color: #fff;
                border: 1px solid #FFA500; /* Orange border for visual consistency */
            }
            
            .cookie-btn-reject:hover {
                background: #555;
                transform: translateY(-2px);
                border-color: #FFA500;
            }
            
            .cookie-link {
                color: #FFA500; /* Updated to orange for brand consistency */
                text-decoration: underline;
                font-size: 0.9rem;
                transition: color 0.3s ease;
            }
            
            .cookie-link:hover {
                color: #FFB347; /* Lighter orange on hover for better visibility */
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
    
    function removeBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'slideDown 0.3s ease-out';
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }
    
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
    
    function init() {
        const consent = getCookieConsent();
        
        if (consent === null) {
            showCookieBanner();
        } else if (consent === 'accepted') {
            initAnalytics();
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
