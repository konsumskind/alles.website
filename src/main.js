import './scss/main.scss'
import { OfferConfigurator } from './js/pricing.js';
import { BreathExercise } from './js/breathing.js';
import { SwipeButton } from './js/swipe.js';
import { ThemeManager } from './js/theme.js';
import { Accordion } from './js/accordion.js';
import { initCarousel } from './js/carousel.js';
import { ScrollManager } from './js/scroll.js';
import { initContactForm } from './js/contact.js';
import { ProcessAnimation } from './js/process.js';
import { initPreloader } from './js/preloader.js';
import { HeroAnimation } from './js/hero.js';
import { showToast, isDesktopDevice } from './js/utils.js';
import { BookingForm } from './js/booking.js';
import { PrivacyOverlay } from './js/privacy.js';
import { ImprintOverlay } from './js/imprint.js';
import { AgbOverlay } from './js/agb.js';
import { ContactOverlay } from './js/contact-overlay.js';


/**
 * Updates the body class based on the device state (isMobileDevice)
 * This allows JS to control CSS variables like border-radius.
 */
const updateDeviceStatus = () => {
    const isLargeScreen = window.innerWidth >= 590;
    const isDesktop = isDesktopDevice();

    // --------------------------------------------------------
    // PRÜFUNG 1: Bildschirmbreite (unabhängig vom Gerät)
    // --------------------------------------------------------
    if (isLargeScreen) {
        document.body.classList.add('high-width');
    } else {
        document.body.classList.remove('high-width');
    }

    // --------------------------------------------------------
    // PRÜFUNG 2: Gerätetyp (unabhängig von der Breite)
    // --------------------------------------------------------
    if (!isDesktop) {
        document.body.classList.add('is-desktop');
        // Elemente anpassen, wenn es ein ECHTER Desktop-Rechner ist
        document.querySelector('.hero .swipe-container').style.display = 'none';
        document.querySelector('#heroBadge').style.display = 'none';
        document.querySelector('.swipe-wrapper .hero__desktop-cta').style.display = 'flex';
    } else {
        document.body.classList.remove('is-desktop');

        // Elemente anpassen, wenn es ein Mobile-Gerät/Tablet ist
        document.querySelector('.hero .swipe-container').style.display = 'flex';
        document.querySelector('.swipe-wrapper .hero__desktop-cta').style.display = 'none';
        document.querySelector('#heroBadge').style.display = 'block';
    }
};

// Initialize Breathing Exercise
const initBreathing = () => {
    new BreathExercise();
};

const initSwipeButtons = () => {
    const swipeContainers = document.querySelectorAll('.swipe-container');
    swipeContainers.forEach(container => {
        new SwipeButton(container);
    });
};

const initWorkshopToast = () => {
    const card = document.getElementById('workshopCard');
    if (card) {
        card.addEventListener('click', () => {
            showToast('Infos folgen in Kürze!');
        });
    }
};



document.addEventListener('DOMContentLoaded', () => {
    // Prevent browser from jumping on history navigation
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Device Status
    updateDeviceStatus();
    window.addEventListener('resize', updateDeviceStatus);

    // Core Modules
    new ThemeManager();
    window.scrollManager = new ScrollManager(); // Handles Nav, Scroll & Touch Feedback

    // UI Components
    new Accordion('haltungAccordion');
    initCarousel();
    initSwipeButtons();
    new OfferConfigurator();
    document.querySelectorAll('.profile-process').forEach(el => {
        new ProcessAnimation(el);
    });

    // Feature Modules
    initBreathing();
    initContactForm();
    initWorkshopToast();
    initPreloader();
    new BookingForm();

    // Desktop CTA click & hover listeners
    const desktopCtaBtns = document.querySelectorAll('.hero__desktop-cta .btn, .process__desktop-cta .btn');
    desktopCtaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('openBookingForm'));
            document.querySelectorAll('.highlight-badge').forEach(el => {
                el.classList.remove('show');
            });
        });

        btn.addEventListener('mouseenter', () => {
            const container = btn.closest('.hero__desktop-cta, .process__desktop-cta');
            if (container) {
                const badge = container.querySelector('.highlight-badge');
                if (badge && !badge.classList.contains('show')) {
                    badge.classList.add('show');
                }
            }
        });
    });
    new PrivacyOverlay();
    new ImprintOverlay();
    new AgbOverlay();
    new ContactOverlay();


    // Visuals
    new HeroAnimation().init();
});
