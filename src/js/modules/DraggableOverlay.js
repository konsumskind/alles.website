// src/js/modules/DraggableOverlay.js

let globalOverlayStack = [];

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
            const nextStack = e.state?.overlayStack || [];
            
            // Logic: If I was the top of the stack, and I'm no longer the top, I should close.
            // This covers both: 
            // 1. Being removed from history entirely.
            // 2. Another window being focused (reordered stack).
            const wasTop = globalOverlayStack[globalOverlayStack.length - 1] === this.historyKey;
            const isTopNow = nextStack[nextStack.length - 1] === this.historyKey;

            if (this.isOpen && wasTop && !isTopNow) {
                this.close(false);
            }
            
            // Also close if I'm completely gone from the stack (fallback)
            if (this.isOpen && !nextStack.includes(this.historyKey)) {
                this.close(false);
            }

            // Sync global stack for the next transition
            // Note: This runs for every instance, but the check is instance-specific.
            // We update the global stack after a small delay to ensure all instances processed the change.
            setTimeout(() => {
                globalOverlayStack = nextStack;
            }, 0);
        });

        if (this.content) {
            // Bring to front on ANY interaction within the content area on desktop
            this.content.addEventListener('mousedown', (e) => {
                if (window.innerWidth >= 768) {
                    this.bringToFront();
                    // Don't stop propagation here to allow buttons/inputs to work,
                    // but we ensure only THIS instance reacts by being scoped to this.content
                }
            }, true);

            // Drag Start
            this.content.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });
            this.content.addEventListener('mousedown', (e) => this.onDragStart(e));

            // Desktop Window Dragging
            const handleWindowDragStart = (e) => {
                if (window.innerWidth >= 768) {
                    this.bringToFront();
                    this.isWindowDragging = true;
                    this.dragStartX = this.getX(e);
                    this.dragStartY = this.getY(e);
                    
                    const rect = this.content.getBoundingClientRect();
                    this.winX = rect.left;
                    this.winY = rect.top;
                    
                    this.content.classList.add('is-dragging');
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                }
            };

            this.grab?.addEventListener('mousedown', handleWindowDragStart);
            this.grab?.addEventListener('touchstart', handleWindowDragStart, { passive: false });

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

        // Update history order if needed
        const currentState = history.state || {};
        const currentStack = currentState.overlayStack || [];
        
        if (currentStack.length > 0 && currentStack[currentStack.length - 1] !== this.historyKey) {
            // Reorder: move this key to the end
            const newStack = currentStack.filter(k => k !== this.historyKey);
            newStack.push(this.historyKey);
            
            globalOverlayStack = [...currentStack]; // Backup current for popstate check
            history.pushState({ ...currentState, overlayStack: newStack }, '');
            globalOverlayStack = newStack; // Update current
        }
    }

    getX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    getY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
    }

    onDragStart(e) {
        if (!this.isOpen || this.isWindowDragging) return;
        if (window.innerWidth >= 768) return;

        // Don't start a drag if we're touching the thumbwheel or elements marked with .no-drag
        if (e.target.closest('.thumbwheel, .no-drag')) {
            return;
        }

        // Check if the touch started in the scrollable body
        const body = this.overlay.querySelector('.overlay__body');
        const isScrollable = this.overlay.classList.contains('overlay--scrollable');
        this.touchInBody = isScrollable && body && body.contains(e.target);
        
        this.dragMode = this.touchInBody ? 'unresolved' : 'overlay';

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
            const dx = this.getX(e) - this.dragStartX;
            const dy = this.getY(e) - this.dragStartY;
            
            this.content.style.transform = 'translate(0, 0)';
            this.content.style.left = `${this.winX + dx}px`;
            this.content.style.top = `${this.winY + dy}px`;
            
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (!this.isDragging) return;

        const y = this.getY(e);
        
        if (this.dragMode === 'unresolved') {
            const body = this.overlay.querySelector('.overlay__body');
            const dy = y - this.dragStartY;
            
            // Wait for a tiny bit of movement to accurately determine direction
            if (Math.abs(dy) < 2) return;
            
            if (body && body.scrollHeight > body.clientHeight) {
                const isAtTop = body.scrollTop <= 0;
                // Add a small threshold (1px) for bottom detection due to fractional scaling
                const isAtBottom = Math.ceil(body.scrollTop + body.clientHeight) >= body.scrollHeight - 1;
                
                const pullingDown = dy > 0;
                const pullingUp = dy < 0;

                const shouldDragOverlay = (isAtTop && pullingDown) || (isAtBottom && pullingUp);

                if (shouldDragOverlay) {
                    this.dragMode = 'overlay';
                } else {
                    this.dragMode = 'scroll';
                }
            } else {
                this.dragMode = 'overlay';
            }
        }

        if (this.dragMode === 'scroll') {
            // Let native scroll handle it, cancel our drag
            this.isDragging = false;
            this.content.classList.remove('is-dragging');
            return;
        }

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

        if (!this.isDragging) {
            this.touchInBody = false;
            return;
        }
        this.isDragging = false;
        this.touchInBody = false;
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
        
        const openOverlays = Array.from(document.querySelectorAll('.overlay.is-open'));
        const isFirstOverlay = openOverlays[0] === this.overlay;

        if (window.innerWidth >= 768) {
            // Desktop
            this.content.style.minHeight = '';
            this.content.style.transform = '';
            this.currentScrollY = 0;
            
            if (isFirstOverlay) {
                this.content.style.top = '';
                this.content.style.left = '';
            }
        } else {
            // Mobile
            this.content.style.left = '';
            
            if (isFirstOverlay) {
                this.content.style.top = '';
                this.content.style.minHeight = '';
            }
            
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
            // Mobile: Stack overlays with a vertical offset relative to the current top of the existing one
            const openOverlays = Array.from(document.querySelectorAll('.overlay.is-open:not(#' + this.id + ')'));
            if (openOverlays.length > 0) {
                const lastOverlay = openOverlays[openOverlays.length - 1];
                const lastContent = lastOverlay.querySelector('.overlay__content');
                if (lastContent) {
                    const rect = lastContent.getBoundingClientRect();
                    // Offset by 40px relative to the CURRENT screen position of the last overlay
                    const newTop = rect.top + 40;
                    this.content.style.top = `${newTop}px`;
                    this.content.style.minHeight = `calc(100% - ${newTop}px)`;
                }
            } else {
                this.content.style.top = ''; // Fallback to CSS default (100px or 140px)
                this.content.style.minHeight = '';
            }
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
        
        // Stack-based History Management
        const currentState = history.state || {};
        const currentStack = currentState.overlayStack || [];
        if (!currentStack.includes(this.historyKey)) {
            const newStack = [...currentStack, this.historyKey];
            globalOverlayStack = [...currentStack];
            history.pushState({ ...currentState, overlayStack: newStack }, '');
            globalOverlayStack = newStack;
        }

        this.bringToFront();
    }

    close(popHistory = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.overlay.classList.remove('is-open');
        this.overlay.classList.remove('has-blur');

        // Reset transform and desktop positioning on mobile only to allow CSS transitions to take over
        if (window.innerWidth < 768) {
            this.content.style.transform = '';
            // We do NOT reset top/left here to prevent a visual jump during the close transition
            // if the overlay was stacked. open() handles resetting them when necessary.
        }
        
        const openOverlays = document.querySelectorAll('.overlay.is-open');
        if (openOverlays.length === 0) {
            document.body.classList.remove('overlay-active');
        }

        if (popHistory) {
            const currentState = history.state || {};
            const currentStack = currentState.overlayStack || [];
            
            if (currentStack.length > 0) {
                const isNewest = currentStack[currentStack.length - 1] === this.historyKey;
                
                if (isNewest) {
                    history.back();
                } else {
                    // Remove this key from the stack without going back
                    const newStack = currentStack.filter(k => k !== this.historyKey);
                    history.replaceState({ ...currentState, overlayStack: newStack }, '');
                }
            }
        }
    }
}
