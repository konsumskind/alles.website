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
import { showToast } from './js/utils.js';
import { BookingForm } from './js/booking.js';
import { PrivacyOverlay } from './js/privacy.js';
import { ImprintOverlay } from './js/imprint.js';
import { AgbOverlay } from './js/agb.js';
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
