
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
        this.lastWidth = window.innerWidth;
        this.lastHeight = window.innerHeight;
        this.isLayoutTransitioning = false;
        this.resizeTimer = null;

        // Auto-scroll state
        this.isAutoScrolling = false;
        this.autoScrollTimeout = null;

        this.init();
        this.setupViewObserver();
        this.handleScroll(); // Initial status check on page load (shows nav/footer on desktop, highlights active section)
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

        // Make sure we update bar visibility and active section on resize
        this.handleScroll();

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
            return;
        }

        // On desktop with enough height, always show
        if (window.innerWidth >= 590 && !isSmallHeight) {
            this.nav.classList.add('nav-visible');
            if (this.footer) this.footer.classList.add('footer-visible');
            if (this.themeSwitcher) this.themeSwitcher.classList.add('theme-switcher--visible');
            return;
        }

        // Mobile logic or Small Height Desktop logic
        const setVisible = (visible) => {
            if (visible) {
                this.nav.classList.add('nav-visible');
                if (this.footer) this.footer.classList.add('footer-visible');
                if (this.themeSwitcher) this.themeSwitcher.classList.add('theme-switcher--visible');
            } else {
                this.nav.classList.remove('nav-visible');
                if (this.footer) this.footer.classList.remove('footer-visible');
                if (this.themeSwitcher) this.themeSwitcher.classList.remove('theme-switcher--visible');
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
                    setVisible(false);
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
