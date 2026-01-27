import videoLightIntro from '/src/assets/bg-start_intro_v09.mp4';
import videoLightLoop from '/src/assets/bg-start_loop_v10.mp4';
import videoDarkIntro from '/src/assets/bg-start-dark_loop_v08.mp4';
import videoDarkLoop from '/src/assets/bg-start-dark_loop_v08.mp4';

export class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'theme-pref-v1'; // 'light' | 'dark' | 'auto'
        this.toggleBtn = document.getElementById('themeToggle');
        this.wrapper = this.toggleBtn ? this.toggleBtn.querySelector('.icon-wrap') : null;
        this.icon = this.toggleBtn ? this.toggleBtn.querySelector('i') : null;

        this.state = localStorage.getItem(this.STORAGE_KEY) || 'auto';
        this.isAtTop = window.scrollY <= 50;
        this.currentIsDark = false;

        // Video State
        this.video1 = document.getElementById('heroVideo1');
        this.video2 = document.getElementById('heroVideo2');
        this.introPlayed = false;

        this.init();
    }

    init() {
        if (!this.toggleBtn) return;

        // Determine initial theme
        this.applyTheme(this.state, true); // true = initial load
        this.updateUI(this.state);

        // System Listener
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.state === 'auto') {
                this.applyTheme('auto');
            }
        });

        // Click Listener -> Cycle Modes
        this.toggleBtn.addEventListener('click', () => {
            // User interaction: If we switch theme, we treat intro as done/skipped
            this.introPlayed = true;
            this.cycleTheme();
            this.animateIcon();
        });

        // Scroll Listener for Meta Theme Color
        window.addEventListener('scroll', () => {
            const atTop = window.scrollY <= 50;
            if (this.isAtTop !== atTop) {
                this.isAtTop = atTop;
                this.updateMetaThemeColor();
            }
        }, { passive: true });
    }

    animateIcon() {
        if (!this.wrapper) return;
        this.wrapper.classList.remove('spin');
        void this.wrapper.offsetWidth; // Force Reflow
        this.wrapper.classList.add('spin');
    }

    cycleTheme() {
        let next = 'auto';
        if (this.state === 'auto') next = 'light';
        else if (this.state === 'light') next = 'dark';
        else if (this.state === 'dark') next = 'auto';

        this.setTheme(next);

        if (window.showToast) {
            const labels = { 'auto': 'Automatisch', 'light': 'Hell', 'dark': 'Dunkel' };
            window.showToast(labels[next]);
        }
    }

    setTheme(val) {
        this.state = val;
        localStorage.setItem(this.STORAGE_KEY, val);
        this.applyTheme(val);
        this.updateUI(val);
    }

    applyTheme(val, isInitial = false) {
        const isDark = val === 'dark' || (val === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        // Define UI Update Callback
        const updateUI = () => {
            if (isDark) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            this.currentIsDark = isDark;
            this.updateMetaThemeColor();
        };

        // Update Hero Video and pass UI callback
        this.updateHeroVideo(isDark, isInitial, updateUI);
    }

    updateHeroVideo(isDark, isInitial = false, uiCallback) {
        if (!this.video1 || !this.video2) {
            if (uiCallback) uiCallback();
            return;
        }

        // LOGIC:
        // 1. Initial Load:
        //    - If Intro needed: Ensure correct Intro source is playing. Preload Loop in background.
        // 2. Runtime Switch (isInitial=false):
        //    - Immediate crossfade to Loop of new theme.

        if (isInitial && !this.introPlayed) {
            if (uiCallback) uiCallback();

            // Setup Intro
            const introSrc = isDark ? videoDarkIntro : videoLightIntro;
            const loopSrc = isDark ? videoDarkLoop : videoLightLoop;

            // Check if HTML source matches our target intro (HTML has Light Intro by default)
            // Using simple string check
            if (this.video1.getAttribute('src') !== introSrc) {
                this.video1.src = introSrc;
                this.video1.load();
                this.video1.play().catch(e => console.log("Intro autoplay failed", e));
            }

            // Setup Transition to Loop when Intro ends
            this.video1.loop = false;
            this.video1.onended = () => {
                this.introPlayed = true;
                this.transitionToVideo(loopSrc, true);
            };

            // Preload the Loop in Video 2
            this.video2.src = loopSrc;
            this.video2.load();
        } else {
            // Runtime Switch or Intro Finished State
            // Always target the Loop
            const loopSrc = isDark ? videoDarkLoop : videoLightLoop;

            // If we are already playing this loop, do nothing
            const active = this.getActiveVideo();
            // Note: .src returns absolute, loopSrc from import is absolute (vite)
            if (active.src === loopSrc || active.src.indexOf(loopSrc) > -1) {
                // Ensure loop is true
                if (!active.loop) active.loop = true;
                if (uiCallback) uiCallback();
                return;
            }

            // Otherwise, Crossfade to new Loop
            this.introPlayed = true; // Ensure flag is set
            this.transitionToVideo(loopSrc, true, uiCallback);

            // Background preload immediate
            // We need to load the next video. transitionToVideo does that.
        }
    }

    transitionToVideo(src, looping, uiCallback) {
        const active = this.getActiveVideo();
        const next = this.video1 === active ? this.video2 : this.video1;

        // Setup Next Video
        next.src = src;
        next.loop = looping;
        next.load();

        // Play
        const playPromise = next.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Determine when to crossfade. 
                // Immediate looks best if preloaded.

                // SYNC UI CHANGE
                if (uiCallback) uiCallback();

                next.classList.add('active');
                active.classList.remove('active');

                // Cleanup Old
                active.pause();
                active.src = ""; // Unload to save memory? Optional.
                // Keep onended clean
                active.onended = null;
            }).catch(e => {
                console.log("Video Play Error", e);
                // Fallback UI update if video fails
                if (uiCallback) uiCallback();
            });
        } else {
            if (uiCallback) uiCallback();
        }
    }

    getActiveVideo() {
        return this.video1.classList.contains('active') ? this.video1 : this.video2;
    }

    updateMetaThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) return;

        if (this.isAtTop) {
            metaThemeColor.setAttribute('content', '#95d4f6');
        } else {
            metaThemeColor.setAttribute('content', this.currentIsDark ? '#16181b' : '#ebebeb');
        }
    }

    updateUI(val) {
        if (!this.icon) return;
        this.icon.className = 'fas';
        this.icon.style.transform = '';

        if (val === 'auto') {
            this.icon.classList.add('fa-adjust');
            this.toggleBtn.style.color = 'var(--text-light)';
        } else if (val === 'light') {
            this.icon.classList.add('fa-sun');
            this.toggleBtn.style.color = 'var(--orange)';
        } else if (val === 'dark') {
            this.icon.classList.add('fa-moon');
            this.toggleBtn.style.color = 'var(--blue)';
        }
    }
}
