
export class HeroAnimation {
    constructor() {
        this.hero = document.querySelector('.hero');
        this.title = document.querySelector('.hero__title');
        this.text = document.querySelector('.hero__text');
        this.name = document.querySelector('.hero__brand .name');
        this.tagline = document.querySelector('.hero__brand .tagline');
        this.uiElements = [];
    }

    init() {
        if (!this.hero || !this.title) return;

        // Apply initial state class to handle visibility via CSS
        this.hero.classList.add('hero--animating');

        // Start Video at full height (handled in HTML)
        const videoBg = document.querySelector('.hero__video-background');

        // Split title into words
        this.splitTitle();

        // --- Sequence ---

        // 1. Immediate: Trigger Swipe Button & Video Shrink
        // We give it a tiny delay to ensure DOM is ready and transitions catch
        setTimeout(() => {
            // Shrink Video
            if (videoBg) {
                // Force Reflow
                void videoBg.offsetHeight;
                videoBg.classList.remove('hero__video-background--full');
            }

            // Show Swipe Button
            this.animateSwipeButton();
        }, 500);

        // 2. Start Text / Content Animation after delay
        setTimeout(() => this.play(), 1000);
    }

    animateSwipeButton() {
        const swipeContainer = document.querySelector('.hero .swipe-container');
        const scrollArrow = document.querySelector('.hero__scroll-down');
        const ctaLabel = document.querySelector('.swipe-cta-label');
        const themeToggle = document.getElementById('themeToggle');

        if (!swipeContainer) return;

        // Step A: Scale Up (dot) & Theme Toggle
        swipeContainer.classList.add('swipe-step-1');
        if (themeToggle) themeToggle.classList.add('pop-in');

        // Step B: Expand Width (after scale up)
        setTimeout(() => {
            swipeContainer.classList.add('swipe-step-2');
        }, 600); // Wait for scale

        // Step C: Show Label
        setTimeout(() => {
            if (ctaLabel) ctaLabel.classList.add('reveal-label');
        }, 800);

        // Step D: Show Scroll Arrow
        setTimeout(() => {
            if (scrollArrow) scrollArrow.classList.add('reveal-arrow');
        }, 1100);
    }

    splitTitle() {
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const words = node.textContent.trim().split(/\s+/);
                const fragment = document.createDocumentFragment();

                words.forEach((word, index) => {
                    if (!word) return;
                    const span = document.createElement('span');
                    span.textContent = word + ' ';
                    span.classList.add('word');
                    span.style.opacity = '0'; // Ensure hidden initially
                    fragment.appendChild(span);
                });

                node.parentNode.replaceChild(fragment, node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                Array.from(node.childNodes).forEach(processNode);
            }
        };

        // Helper to wrap words
        const wrapWords = (element) => {
            const childNodes = Array.from(element.childNodes);
            childNodes.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                    const words = child.textContent.split(' ');
                    const fragment = document.createDocumentFragment();
                    words.forEach((word, i) => {
                        if (i < words.length - 1) word += ' ';
                        if (word.trim() === '') {
                            return;
                        }
                        const span = document.createElement('span');
                        span.textContent = word;
                        if (i < words.length - 1 || child.textContent.endsWith(' ')) {
                            span.innerHTML += '&nbsp;';
                        }

                        span.className = 'hero-word';
                        fragment.appendChild(span);
                    });
                    child.replaceWith(fragment);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    wrapWords(child);
                }
            });
        };

        wrapWords(this.title);
    }

    play() {
        const animate = (el, delay = 0) => {
            if (!el) return;
            setTimeout(() => {
                el.classList.add('animate-in');
            }, delay);
        };

        let currentDelay = 0;
        const wordDelay = 150; // ms between words

        // 1. Title Words
        const words = this.title.querySelectorAll('.hero-word');
        words.forEach((word) => {
            animate(word, currentDelay);
            currentDelay += wordDelay;
        });

        // 2. Text (wait a bit after title finishes)
        currentDelay += 300;
        animate(this.text, currentDelay);

        // 3. Name
        currentDelay += 400;
        animate(this.name, currentDelay);

        // 4. Tagline
        currentDelay += 200;
        animate(this.tagline, currentDelay);

        // 5. Theme Toggle
        currentDelay += 400;
        this.uiElements.forEach(el => animate(el, currentDelay));
    }
}
