// src/js/modules/DraggableOverlay.js

const DISMISS_THRESHOLD = 120;

export class DraggableOverlay {
    constructor(id, options = {}) {
        this.id = id;
        this.overlay = document.getElementById(id);
        if (!this.overlay) return;

        this.content = this.overlay.querySelector('.overlay__content');
        this.grab = this.overlay.querySelector('.overlay__grab');
        this.closeBtns = this.overlay.querySelectorAll('.overlay__close');
        this.historyKey = options.historyKey || id;
        this.topBuffer = options.topBuffer || 100;

        this.isOpen = false;
        this.isDragging = false;
        this.isWindowDragging = false;
        
        this.dragStartY = 0;
        this.dragStartX = 0;
        this.currentDragY = 0;
        this.currentScrollY = 0;
        
        this.winX = 0;
        this.winY = 0;
        
        this.velocity = 0;
        this.inertiaRaf = null;

        this.init();
    }

    init() {
        this.closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));
        
        window.addEventListener('popstate', (e) => {
            if (this.isOpen && (!e.state || !e.state[this.historyKey])) {
                this.close(false);
            }
        });

        if (this.content) {
            // Bring to front on ANY interaction within the content area on desktop
            this.content.addEventListener('mousedown', () => {
                if (window.innerWidth >= 768) this.bringToFront();
            }, true);

            // Drag Start
            this.content.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });
            this.content.addEventListener('mousedown', (e) => this.onDragStart(e));

            // Desktop Window Dragging
            this.grab?.addEventListener('mousedown', (e) => {
                if (window.innerWidth >= 768) {
                    this.bringToFront();
                    this.isWindowDragging = true;
                    this.dragStartX = e.clientX;
                    this.dragStartY = e.clientY;
                    
                    const rect = this.content.getBoundingClientRect();
                    this.winX = rect.left;
                    this.winY = rect.top;
                    
                    this.content.classList.add('is-dragging');
                    e.stopPropagation();
                    e.preventDefault();
                }
            });

            window.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
            window.addEventListener('mousemove', (e) => this.onDragMove(e));

            window.addEventListener('touchend', () => this.onDragEnd());
            window.addEventListener('mouseup', () => this.onDragEnd());
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleResize());
        }
    }

    bringToFront() {
        document.querySelectorAll('.overlay').forEach(ov => {
            ov.style.zIndex = '1000';
        });
        this.overlay.style.zIndex = '1200';
    }

    getY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
    }

    onDragStart(e) {
        if (!this.isOpen || this.isWindowDragging) return;
        if (window.innerWidth >= 768) return;

        this.isDragging = true;
        this.dragStartY = this.getY(e);
        this.content.classList.add('is-dragging');
        this.lastY = this.dragStartY;
        this.lastTime = Date.now();
        this.velocity = 0;
        cancelAnimationFrame(this.inertiaRaf);
    }

    getMaxScrollUp() {
        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const contentHeight = this.content.offsetHeight;
        
        // On mobile, the content has an initial 'top' offset from SCSS (usually 100px)
        // We need to account for this initial offset when calculating how far we can scroll up.
        const style = window.getComputedStyle(this.content);
        const initialTop = parseInt(style.top) || 0;

        // Condition 1: Don't scroll higher than topBuffer
        const limitByBuffer = this.topBuffer - initialTop;
        
        // Condition 2: Don't scroll further than the bottom of the content
        const limitByContent = viewportHeight - contentHeight - initialTop;

        // We use the stricter of the two limits (the more negative one)
        return Math.min(limitByBuffer, limitByContent);
    }

    onDragMove(e) {
        if (this.isWindowDragging) {
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            
            this.content.style.transform = 'translate(0, 0)';
            this.content.style.left = `${this.winX + dx}px`;
            this.content.style.top = `${this.winY + dy}px`;
            return;
        }

        if (!this.isDragging) return;

        const y = this.getY(e);
        const now = Date.now();
        const dt = now - this.lastTime;
        const dy = y - this.lastY;

        if (dt > 0) {
            this.velocity = dy / dt;
        }

        const deltaY = y - this.dragStartY;
        const totalY = this.currentScrollY + deltaY;
        const maxScrollUp = this.getMaxScrollUp();

        if (totalY > 0) {
            this.currentDragY = totalY;
        } else {
            this.currentDragY = Math.max(maxScrollUp, totalY);
        }

        this.content.style.transform = `translateY(${this.currentDragY}px)`;
        this.lastY = y;
        this.lastTime = now;

        if (e.cancelable) e.preventDefault();
    }

    onDragEnd() {
        if (this.isWindowDragging) {
            this.isWindowDragging = false;
            this.content.classList.remove('is-dragging');
            const rect = this.content.getBoundingClientRect();
            this.winX = rect.left;
            this.winY = rect.top;
            return;
        }

        if (!this.isDragging) return;
        this.isDragging = false;
        this.content.classList.remove('is-dragging');

        if (this.currentDragY > DISMISS_THRESHOLD) {
            this.close();
        } else {
            this.currentScrollY = this.currentDragY;
            if (Math.abs(this.velocity) > 0.1) {
                this.applyInertia();
            } else {
                this.snapToBoundaries();
            }
        }
    }

    applyInertia() {
        const friction = 0.85;
        this.velocity *= friction;
        this.currentScrollY += this.velocity * 16;

        const maxScrollUp = this.getMaxScrollUp();

        if (this.currentScrollY > 0) {
            this.currentScrollY = 0;
            this.velocity = 0;
        } else if (this.currentScrollY < maxScrollUp) {
            this.currentScrollY = maxScrollUp;
            this.velocity = 0;
        }

        this.content.style.transform = `translateY(${this.currentScrollY}px)`;

        if (Math.abs(this.velocity) > 0.01) {
            this.inertiaRaf = requestAnimationFrame(() => this.applyInertia());
        }
    }

    snapToBoundaries() {
        const maxScrollUp = this.getMaxScrollUp();
        this.currentScrollY = Math.max(maxScrollUp, Math.min(0, this.currentScrollY));
        this.content.style.transform = `translateY(${this.currentScrollY}px)`;
    }

    handleResize() {
        if (!this.isOpen || this.isDragging || this.isWindowDragging) return;
        
        if (window.innerWidth < 768) {
            const maxScrollUp = this.getMaxScrollUp();
            if (this.currentScrollY < maxScrollUp) {
                this.currentScrollY = maxScrollUp;
                this.content.style.transform = `translateY(${this.currentScrollY}px)`;
            }
        }
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.currentScrollY = 0;
        this.currentDragY = 0;
        cancelAnimationFrame(this.inertiaRaf);
        
        if (window.innerWidth >= 768) {
            const openOverlays = Array.from(document.querySelectorAll('.overlay.is-open:not(#' + this.id + ')'));
            
            if (openOverlays.length > 0) {
                const lastOverlay = openOverlays[openOverlays.length - 1];
                const lastContent = lastOverlay.querySelector('.overlay__content');
                if (lastContent) {
                    const rect = lastContent.getBoundingClientRect();
                    this.content.style.top = `${rect.top + 20}px`;
                    this.content.style.left = `${rect.left + 20}px`;
                    this.content.style.transform = 'translate(0, 0)';
                }
            } else {
                this.content.style.top = '';
                this.content.style.left = '';
                this.content.style.transform = '';
            }
        } else {
            this.content.style.top = '';
            this.content.style.left = '';
            this.content.style.transform = '';
        }
        
        const body = this.overlay.querySelector('.overlay__body');
        if (body) body.scrollTop = 0;
        
        this.overlay.classList.add('is-open');

        const otherOpenCount = document.querySelectorAll('.overlay.is-open:not(#' + this.id + ')').length;
        if (otherOpenCount === 0) {
            this.overlay.classList.add('has-blur');
        }

        document.body.classList.add('overlay-active');
        
        const state = {};
        state[this.historyKey] = true;
        history.pushState(state, '');

        if (window.innerWidth >= 768) {
            this.bringToFront();
        }
    }

    close(popHistory = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.overlay.classList.remove('is-open');
        this.overlay.classList.remove('has-blur');

        // Reset transform and desktop positioning on mobile only to allow CSS transitions to take over
        if (window.innerWidth < 768) {
            this.content.style.transform = '';
            this.content.style.top = '';
            this.content.style.left = '';
        }
        
        const openOverlays = document.querySelectorAll('.overlay.is-open');
        if (openOverlays.length === 0) {
            document.body.classList.remove('overlay-active');
        }

        if (popHistory && history.state && history.state[this.historyKey]) {
            history.back();
        }
    }
}
