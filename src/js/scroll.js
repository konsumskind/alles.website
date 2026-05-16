
export class ScrollManager {
    constructor() {
        this.nav = document.querySelector('.bottom-nav');
        this.footer = document.querySelector('.desktop-footer-bar');
        this.themeSwitcher = document.querySelector('.theme-toggle-round');
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
        this.HIDE_SCROLL_THRESHOLD = 150; // New threshold for hiding on scroll down
        this.scrollDownShowStartY = null; // Track where it was last shown
        this.lastWidth = window.innerWidth;
        this.lastHeight = window.innerHeight;
        this.wasDesktop = document.body.classList.contains('is-desktop');
        this.isLayoutTransitioning = false;

        // Auto-scroll state
        this.isAutoScrolling = false;
        this.autoScrollTimeout = null;
        this.resizeTimer = null;

        this.init();
        this.setupViewObserver();
    }

    init() {
        window.addEventListener('touchstart', () => {
            this.handleTouchStart();
            this.isAutoScrolling = false;
        });
        window.addEventListener('touchend', () => this.handleTouchEnd());
        window.addEventListener('touchcancel', () => this.handleTouchEnd());
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('resize', () => this.handleResize()); // Specialized resize handler
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

    handleResize() {
        // Prevent animations during resize
        document.body.classList.add('resize-animation-stopper');
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            document.body.classList.remove('resize-animation-stopper');
        }, 400);

        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        const isDesktop = document.body.classList.contains('is-desktop');

        // Force out-in animation ONLY when crossing the mobile/desktop state
        // because this causes a jump from top to bottom (position change).
        const positionJumps = this.wasDesktop !== isDesktop;
        this.wasDesktop = isDesktop; // Update for next resize

        if (positionJumps && !this.isLayoutTransitioning) {
            this.isLayoutTransitioning = true;

            // 1. Hide everything immediately to animate "out"
            this.nav.classList.remove('nav-visible');
            if (this.footer) this.footer.classList.remove('footer-visible');
            if (this.themeSwitcher) this.themeSwitcher.classList.remove('theme-switcher--visible');

            // 2. Wait for layout shift and "out" animation, then show again
            setTimeout(() => {
                this.isLayoutTransitioning = false;
                this.handleScroll();
            }, 600);
        } else if (!this.isLayoutTransitioning) {
            // For other resizes (e.g. height changes), just handle normally.
            // CSS transitions will handle visibility changes smoothly if they occur.
            this.handleScroll();
        }

        this.lastWidth = currentWidth;
        this.lastHeight = currentHeight;
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

        // Nav & Footer Visibility
        this.updateBarVisibility(currentScrollY);

        this.lastScrollY = currentScrollY;

        // Active Section Highlight
        this.updateActiveSection();
    }

    updateBarVisibility(currentScrollY) {
        if (!this.nav) return;

        const isImmersive = document.body.classList.contains('mode-immersive');
        const isSmallHeight = window.innerHeight < 768;

        if (isImmersive) {
            this.nav.classList.remove('nav-visible');
            if (this.footer) this.footer.classList.remove('footer-visible');
            if (this.themeSwitcher) this.themeSwitcher.classList.remove('theme-switcher--visible');
            this.scrollUpStartY = null;
            this.scrollDownShowStartY = null;
            return;
        }

        const isDesktop = document.body.classList.contains('is-desktop');

        // On desktop with enough height, always show
        if (isDesktop && !isSmallHeight) {
            this.nav.classList.add('nav-visible');
            if (this.footer) this.footer.classList.add('footer-visible');
            if (this.themeSwitcher) this.themeSwitcher.classList.add('theme-switcher--visible');
            this.scrollDownShowStartY = currentScrollY; // Always considered "just shown" here
            return;
        }

        // Mobile logic or Small Height Desktop logic
        const setVisible = (visible) => {
            if (visible) {
                this.nav.classList.add('nav-visible');
                if (this.footer) this.footer.classList.add('footer-visible');
                if (this.themeSwitcher) this.themeSwitcher.classList.add('theme-switcher--visible');
                if (this.scrollDownShowStartY === null) {
                    this.scrollDownShowStartY = window.scrollY;
                }
            } else {
                this.nav.classList.remove('nav-visible');
                if (this.footer) this.footer.classList.remove('footer-visible');
                if (this.themeSwitcher) this.themeSwitcher.classList.remove('theme-switcher--visible');
                this.scrollDownShowStartY = null;
            }
        };

        if (currentScrollY <= 50) {
            setVisible(false);
            this.scrollUpStartY = null;
        } else {
            if (currentScrollY < 150 || this.isIntroScrollLock) {
                setVisible(true);
                this.scrollUpStartY = null;
            } else {
                if (currentScrollY > this.lastScrollY) {
                    // Scrolling Down
                    const distanceSinceShow = this.scrollDownShowStartY !== null ? currentScrollY - this.scrollDownShowStartY : 0;

                    if (distanceSinceShow > this.HIDE_SCROLL_THRESHOLD) {
                        setVisible(false);
                        this.scrollUpStartY = null;
                    }
                    // ... (lines 203-209 handled by context matching or just replacing block)
                } else if (currentScrollY < this.lastScrollY) {
                    // Scrolling Up
                    this.scrollDownStartY = null;

                    if (this.isTouching && this.hasScrolledDownInThisTouch) {
                        if (this.scrollUpStartY === null) {
                            this.scrollUpStartY = this.lastScrollY;
                        }

                        const dynamicThreshold = Math.max(this.STANDARD_SCROLL_THRESHOLD, this.lastDownStrokeDistance);

                        if ((this.scrollUpStartY - currentScrollY) > dynamicThreshold) {
                            setVisible(true);
                        }
                    } else {
                        setVisible(true);
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

    setupViewObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                } else {
                    // Optional: Remove if they should shrink again when scrolling out
                    entry.target.classList.remove('in-view');
                }
            });
        }, {
            rootMargin: '-100px 0px -100px 0px', // Shrink trigger area by 10% top/bottom
            threshold: 1 // Trigger when 40% is visible within that shrunk area
        });

        document.querySelectorAll('.observe-view').forEach(el => observer.observe(el));
    }
}
