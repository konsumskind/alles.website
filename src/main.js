import './scss/main.scss'
import { OfferConfigurator } from './js/pricing.js';
import { BreathExercise } from './js/breathing.js';
import { SwipeButton } from './js/swipe.js';
import { ThemeManager } from './js/theme.js';
import { Accordion } from './js/accordion.js';
import { initCarousel } from './js/carousel.js';
import { ScrollManager } from './js/scroll.js';
import { initContactForm, sendMail } from './js/contact.js';
import { ProcessAnimation } from './js/process.js';
import { initPreloader } from './js/preloader.js';
import { HeroAnimation } from './js/hero.js';
import { showToast } from './js/utils.js';

// Expose showToast globally for modules that need it (e.g., ThemeManager)
window.showToast = showToast;

// Initialize Breathing Exercise
const initBreathing = () => {
    // Clean up inline handler if present
    const btn = document.getElementById('breathBtn');
    if (btn) btn.removeAttribute('onclick');
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
            showToast('Infos zu Workshops folgen in Kürze!');
        });
    }
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    // Core Modules
    new ThemeManager();
    window.scrollManager = new ScrollManager(); // Handles Nav, Scroll & Touch Feedback

    // UI Components
    new Accordion('haltungAccordion');
    initCarousel();
    initSwipeButtons();
    new OfferConfigurator();
    new ProcessAnimation();

    // Feature Modules
    initBreathing();
    initContactForm();
    initWorkshopToast();
    initPreloader();

    // Visuals
    new HeroAnimation().init();
});

