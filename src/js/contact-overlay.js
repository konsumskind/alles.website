// src/js/contact-overlay.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class ContactOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('contact-overlay', { 
            historyKey: 'contact',
            topBuffer: 140 
        });
        
        // Select trigger links in the highlight-badges of both desktop CTAs
        this.links = document.querySelectorAll('.hero__desktop-cta .highlight-badge a, .process__desktop-cta .highlight-badge a');
        
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        // Initialize scrape-safe links
        this.initSafeLinks();

        // Bind overlay open triggers
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.overlay.open();
                
                // Optional: hide the highlight badge on click if requested, to match desktopCtaBtn behavior
                document.querySelectorAll('.highlight-badge').forEach(el => {
                    el.classList.remove('show');
                });
            });
        });

        // Booking button in the overlay: Close contact overlay and open booking overlay
        const overlayBookingBtn = document.getElementById('contactOverlayBookingBtn');
        if (overlayBookingBtn) {
            overlayBookingBtn.addEventListener('click', () => {
                this.overlay.close();
                document.dispatchEvent(new CustomEvent('openBookingForm'));
            });
        }
    }

    /**
     * Reconstructs the phone and email links dynamically in JavaScript
     * to prevent automated web crawlers from scraping them from the static HTML.
     */
    initSafeLinks() {
        // Safe Phone Link Reconstruction
        const safePhoneLinks = this.overlay.overlay.querySelectorAll('.js-safe-phone');
        safePhoneLinks.forEach(link => {
            const country = link.getAttribute('data-tel-a') || '';
            const area = link.getAttribute('data-tel-b') || '';
            const num = link.getAttribute('data-tel-c') || '';
            
            if (country && area && num) {
                const fullPhone = `${country} ${area} ${num}`;
                const rawPhone = `${country}${area}${num}`;
                
                // Set visible text
                const textEl = link.querySelector('.js-phone-text');
                if (textEl) {
                    textEl.textContent = fullPhone;
                }
                
                // Set href dynamically
                link.setAttribute('href', `tel:${rawPhone}`);
            }
        });

        // Safe Email Link Reconstruction
        const safeEmailLinks = this.overlay.overlay.querySelectorAll('.js-safe-email');
        safeEmailLinks.forEach(link => {
            const user = link.getAttribute('data-mail-u') || '';
            const domain = link.getAttribute('data-mail-d') || '';
            
            if (user && domain) {
                const fullEmail = `${user}@${domain}`;
                
                // Set visible text
                const textEl = link.querySelector('.js-email-text');
                if (textEl) {
                    textEl.textContent = fullEmail;
                }
                
                // Set href dynamically
                link.setAttribute('href', `mailto:${fullEmail}`);
            }
        });
    }
}
