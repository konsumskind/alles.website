export class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'theme-pref-v1'; // 'light' | 'dark' | 'auto'
        this.toggleBtn = document.getElementById('themeToggle');
        this.wrapper = this.toggleBtn ? this.toggleBtn.querySelector('.icon-wrap') : null;
        this.icon = this.toggleBtn ? this.toggleBtn.querySelector('i') : null;
        this.state = localStorage.getItem(this.STORAGE_KEY) || 'auto';
        this.isAtTop = window.scrollY <= 50;
        this.currentIsDark = false;

        this.init();
    }

    init() {
        if (!this.toggleBtn) return;

        this.applyTheme(this.state);
        this.updateUI(this.state);

        // System Listener
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.state === 'auto') {
                this.applyTheme('auto');
            }
        });

        // Click Listener -> Cycle Modes
        this.toggleBtn.addEventListener('click', () => {
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

        // Remove class to reset animation
        this.wrapper.classList.remove('spin');

        // Force Reflow
        void this.wrapper.offsetWidth;

        // Add class
        this.wrapper.classList.add('spin');
    }

    cycleTheme() {
        // Order: Auto -> Light -> Dark -> Auto...
        let next = 'auto';
        if (this.state === 'auto') next = 'light';
        else if (this.state === 'light') next = 'dark';
        else if (this.state === 'dark') next = 'auto';

        this.setTheme(next);

        // Optional: Toast feedback since icon might be ambiguous
        if (window.showToast) {
            const labels = {
                'auto': 'Automatisch',
                'light': 'Hell',
                'dark': 'Dunkel'
            };
            window.showToast(labels[next]);
        }
    }

    setTheme(val) {
        this.state = val;
        localStorage.setItem(this.STORAGE_KEY, val);
        this.applyTheme(val);
        this.updateUI(val);
    }

    applyTheme(val) {
        const isDark = val === 'dark' || (val === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        // Update Body Class
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        this.currentIsDark = isDark;

        // Update Hero Video
        this.updateHeroVideo(isDark);

        // Update Meta Theme Color
        this.updateMetaThemeColor();
    }

    updateHeroVideo(isDark) {
        const video = document.querySelector('.hero__video-background video');
        if (!video) return;

        const currentSrc = video.getAttribute('src');
        const targetSrc = isDark ? '/src/assets/bg-start-dark_v05.mp4' : '/src/assets/bg-start_v04.mp4';

        // Only update if source is different to prevent flickering/reloading
        if (currentSrc !== targetSrc) {
            video.setAttribute('src', targetSrc);
            video.load();
            video.play().catch(e => console.log("Video autoplay blocked or failed", e));
        }
    }

    updateMetaThemeColor() {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) return;

        // If at top (Hero), use Light Blue #58c8f1 regardless of Dark Mode (as per request)
        // OR should it be dark in Dark Mode? 
        // Request: "#58c8f1 ... erst wenn man nach unten scrollt halt zur hintergrundfarbe wechselt"
        // Implicitly implies the top color is fixed or at least the starting point.
        // Assuming #58c8f1 is for the 'start' section visual (sky/water).

        if (this.isAtTop) {
            metaThemeColor.setAttribute('content', '#58c8f1');
        } else {
            // Standard Theme Background
            metaThemeColor.setAttribute('content', this.currentIsDark ? '#16181b' : '#ebebeb');
        }
    }

    updateUI(val) {
        if (!this.icon) return;

        // Reset classes and styles
        this.icon.className = 'fas';
        // Remove JS rotation as it is handled by CSS now for fa-moon
        this.icon.style.transform = '';

        // Set Icon based on state
        if (val === 'auto') {
            this.icon.classList.add('fa-adjust'); // Half/Half
            this.toggleBtn.style.color = 'var(--text-light)';
        } else if (val === 'light') {
            this.icon.classList.add('fa-sun');
            this.toggleBtn.style.color = 'var(--orange)';
        } else if (val === 'dark') {
            this.icon.classList.add('fa-moon');
            // .fa-moon rotation is handled by SCSS
            this.toggleBtn.style.color = 'var(--blue)';
        }
    }
}
