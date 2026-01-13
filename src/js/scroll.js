
export class ScrollManager {
    constructor() {
        this.nav = document.querySelector('.bottom-nav');
        this.lastScrollY = window.scrollY;
        this.isIntroScrollLock = window.scrollY <= 50;
        this.scrollTimeout = null;

        // Touch Tracking
        this.isTouching = false;
        this.hasScrolledDownInThisTouch = false;
        this.scrollUpStartY = null;
        this.scrollDownStartY = null;
        this.lastDownStrokeDistance = 0;
        this.STANDARD_SCROLL_THRESHOLD = 80;

        // Auto-scroll state
        this.isAutoScrolling = false;
        this.autoScrollTimeout = null;

        this.init();
    }

    init() {
        window.addEventListener('touchstart', () => {
            this.handleTouchStart();
            this.isAutoScrolling = false;
        });
        window.addEventListener('touchend', () => this.handleTouchEnd());
        window.addEventListener('touchcancel', () => this.handleTouchEnd());
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('wheel', () => {
            this.isAutoScrolling = false;
        }, { passive: true });
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown'].includes(e.code)) {
                this.isAutoScrolling = false;
            }
        });

        // Smooth Scroll for Anchors
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    this.isAutoScrolling = true;
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Touch feedback
        const buttons = document.querySelectorAll('.neu-btn, .neu-icon-btn, .nav-item');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', () => btn.classList.add('active'));
            btn.addEventListener('touchend', () => btn.classList.remove('active'));
        });
    }

    handleTouchStart() {
        this.isTouching = true;
        this.hasScrolledDownInThisTouch = false;
        this.lastDownStrokeDistance = 0;
        this.scrollDownStartY = null;
    }

    handleTouchEnd() {
        this.isTouching = false;
        this.hasScrolledDownInThisTouch = false;
        this.scrollUpStartY = null;
        this.scrollDownStartY = null;
        this.lastDownStrokeDistance = 0;
    }

    handleScroll() {
        const currentScrollY = window.scrollY;

        // Intro Lock Release Logic
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            if (currentScrollY > 50) {
                this.isIntroScrollLock = false;
            }
        }, 150);

        if (currentScrollY <= 50) {
            this.isIntroScrollLock = true;
        }

        // Auto-scroll detection cleanup
        if (this.isAutoScrolling) {
            clearTimeout(this.autoScrollTimeout);
            this.autoScrollTimeout = setTimeout(() => {
                this.isAutoScrolling = false;
            }, 100);

            // Still update these during auto-scroll
            this.lastScrollY = currentScrollY;
            this.updateActiveSection();
            return;
        }

        // Nav Visibility
        this.updateNavVisibility(currentScrollY);

        this.lastScrollY = currentScrollY;

        // Active Section Highlight
        this.updateActiveSection();
    }

    updateNavVisibility(currentScrollY) {
        if (!this.nav) return;

        const isImmersive = document.body.classList.contains('mode-immersive');

        if (currentScrollY <= 50 || isImmersive) {
            this.nav.classList.remove('nav-visible');
            this.scrollUpStartY = null;
        } else {
            if (currentScrollY < 150 || this.isIntroScrollLock) {
                this.nav.classList.add('nav-visible');
                this.scrollUpStartY = null;
            } else {
                if (currentScrollY > this.lastScrollY) {
                    // Scrolling Down
                    this.nav.classList.remove('nav-visible');
                    this.scrollUpStartY = null;

                    if (this.isTouching) {
                        this.hasScrolledDownInThisTouch = true;
                        if (this.scrollDownStartY === null) {
                            this.scrollDownStartY = this.lastScrollY;
                        }
                        this.lastDownStrokeDistance = currentScrollY - this.scrollDownStartY;
                    }
                } else if (currentScrollY < this.lastScrollY) {
                    // Scrolling Up
                    this.scrollDownStartY = null;

                    if (this.isTouching && this.hasScrolledDownInThisTouch) {
                        if (this.scrollUpStartY === null) {
                            this.scrollUpStartY = this.lastScrollY;
                        }

                        const dynamicThreshold = Math.max(this.STANDARD_SCROLL_THRESHOLD, this.lastDownStrokeDistance);

                        if ((this.scrollUpStartY - currentScrollY) > dynamicThreshold) {
                            this.nav.classList.add('nav-visible');
                        }
                    } else {
                        this.nav.classList.add('nav-visible');
                    }
                }
            }
        }
    }

    updateActiveSection() {
        const sections = document.querySelectorAll('section');
        const navItems = document.querySelectorAll('.nav-item');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // const sectionHeight = section.clientHeight; // Unused

            if (window.scrollY >= (sectionTop - 300)) {
                let currentId = section.getAttribute('id');
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href').includes(currentId)) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }
}
