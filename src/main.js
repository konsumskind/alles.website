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
import { showToast, isMobileDevice } from './js/utils.js';
import { BookingForm } from './js/booking.js';
import { PrivacyOverlay } from './js/privacy.js';
import { ImprintOverlay } from './js/imprint.js';
import { AgbOverlay } from './js/agb.js';

/**
 * Updates the body class based on the device state (isMobileDevice)
 * This allows JS to control CSS variables like border-radius.
 */
const updateDeviceStatus = () => {
    const isLargeScreen = window.innerWidth >= 768;

    if (!isMobileDevice() || isLargeScreen) {
        document.body.classList.add('is-desktop');
    } else {
        document.body.classList.remove('is-desktop');
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
    new PrivacyOverlay();
    new ImprintOverlay();
    new AgbOverlay();

    // Visuals
    new HeroAnimation().init();
});
