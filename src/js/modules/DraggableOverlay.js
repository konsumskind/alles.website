let globalOverlayStack = [];
const allInstances = [];
let isBlurManuallyDisabled = false;

const DISMISS_THRESHOLD = 120;

export function updateOverlayHeights() {
    const bookingOverlayContent = document.querySelector('#booking-overlay .overlay__content');
    if (bookingOverlayContent) {
        const height = bookingOverlayContent.offsetHeight;
        if (height > 0) {
            document.documentElement.style.setProperty('--booking-overlay-height', `${height}px`);
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateOverlayHeights);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateOverlayHeights);
    }
    document.addEventListener('DOMContentLoaded', updateOverlayHeights);
}

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
        this.touchInBody = false;

        this.dragStartY = 0;
        this.dragStartX = 0;
        this.currentDragY = 0;
        this.startDragY = 0;

        this.lastY = 0;
        this.lastTime = 0;
        this.velocity = 0;
        this.wheelTimeout = null;
        this.wheelScrollUpAccumulator = 0;

        this.winX = 0;
        this.winY = 0;

        allInstances.push(this);
        this.init();
    }

    init() {
        this.closeBtns.forEach(btn => btn.addEventListener('click', () => this.close()));

        window.addEventListener('popstate', (e) => {
            const nextStack = e.state?.overlayStack || [];
            const wasTop = globalOverlayStack[globalOverlayStack.length - 1] === this.historyKey;
            const isTopNow = nextStack[nextStack.length - 1] === this.historyKey;

            if (this.isOpen && wasTop && !isTopNow) {
                this.close(false);
            }

            if (this.isOpen && !nextStack.includes(this.historyKey)) {
                this.close(false);
            }

            setTimeout(() => {
                globalOverlayStack = nextStack;
            }, 0);
        });

        if (this.content) {
            // Desktop: Bring to front
            this.content.addEventListener('mousedown', (e) => {
                if (window.innerWidth >= 768 && window.innerHeight >= 768) {
                    isBlurManuallyDisabled = false;
                    this.bringToFront();
                    this.checkOverlap();
                }
            }, true);

            // Mobile: Drag Start
            this.content.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });
            this.content.addEventListener('mousedown', (e) => this.onDragStart(e));

            // Desktop: Window Dragging
            const handleWindowDragStart = (e) => {
                if (window.innerWidth >= 768 && window.innerHeight >= 768) {
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

            // Global Drag Move & End
            window.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });
            window.addEventListener('mousemove', (e) => this.onDragMove(e));

            window.addEventListener('touchend', () => this.onDragEnd());
            window.addEventListener('mouseup', () => this.onDragEnd());

            // Mouse Wheel Support for Mobile Overlay
            this.content.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleResize());
        }
    }

    static closeAll() {
        allInstances.forEach(instance => {
            if (instance.isOpen) {
                instance.close();
            }
        });
    }

    bringToFront() {
        document.querySelectorAll('.overlay').forEach(ov => {
            ov.style.zIndex = '1000';
        });
        this.overlay.style.zIndex = '1200';

        const currentState = history.state || {};
        const currentStack = currentState.overlayStack || [];

        if (currentStack.length > 0 && currentStack[currentStack.length - 1] !== this.historyKey) {
            const newStack = currentStack.filter(k => k !== this.historyKey);
            newStack.push(this.historyKey);

            globalOverlayStack = [...currentStack];
            history.pushState({ ...currentState, overlayStack: newStack }, '');
            globalOverlayStack = newStack;
        }
    }

    getX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    getY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
    }

    // Calculates the required downward shift if the overlay is taller than the screen minus topBuffer
    calculateInitialY() {
        if (window.innerWidth >= 768 && window.innerHeight >= 768) return 0;

        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const contentHeight = this.content.offsetHeight;

        // defaultTop is where the top of the content would naturally sit if bottom is 0
        const defaultTop = viewportHeight - contentHeight;

        // If the natural top is higher than our requested buffer, we force it down (positive Y shift)
        if (defaultTop < this.topBuffer) {
            return this.topBuffer - defaultTop;
        }

        return 0; // Fits perfectly, no initial shift needed
    }

    onDragStart(e) {
        if (!this.isOpen || this.isWindowDragging) return;
        if (window.innerWidth >= 768 && window.innerHeight >= 768) return;

        // Don't start drag on restricted elements
        if (e.target.closest('.thumbwheel, .no-drag')) return;

        const body = this.overlay.querySelector('.overlay__body');
        this.touchInBody = body && body.contains(e.target);

        this.dragMode = 'unresolved';
        this.isDragging = true;
        this.dragStartY = this.getY(e);
        this.startDragY = this.currentDragY || 0;

        this.lastY = this.dragStartY;
        this.lastTime = Date.now();
        this.velocity = 0;

        this.content.classList.add('is-dragging');
        this.content.style.transition = 'none'; // Disable transition for instant finger tracking
    }

    onDragMove(e) {
        if (this.isWindowDragging) {
            const dx = this.getX(e) - this.dragStartX;
            const dy = this.getY(e) - this.dragStartY;

            this.content.style.transform = 'translate(0, 0)';
            this.content.style.left = `${this.winX + dx}px`;
            this.content.style.top = `${this.winY + dy}px`;

            this.checkOverlap();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (!this.isDragging) return;

        const y = this.getY(e);
        const deltaY = y - this.dragStartY;

        // Determine if we should scroll the content natively or drag the whole overlay
        if (this.dragMode === 'unresolved') {
            if (Math.abs(deltaY) < 5) return; // Wait for a tiny movement to determine direction

            const body = this.overlay.querySelector('.overlay__body');
            const isAtTop = body ? body.scrollTop <= 0 : true;

            if (this.touchInBody) {
                if (deltaY < 0) { // Pulling UP
                    if (this.currentDragY > 0) {
                        this.dragMode = 'overlay'; // Overlay is in peeking state, pull it up
                    } else {
                        this.dragMode = 'scroll'; // Overlay is fully open, let user scroll the content
                    }
                } else { // Pulling DOWN
                    if (isAtTop) {
                        this.dragMode = 'overlay'; // Content is at top, pull overlay down
                    } else {
                        this.dragMode = 'scroll'; // Content is scrolled down, let user scroll up
                    }
                }
            } else {
                this.dragMode = 'overlay'; // Touch started on header/grab -> always drag overlay
            }
        }

        if (this.dragMode === 'scroll') {
            this.isDragging = false;
            this.content.classList.remove('is-dragging');
            this.content.style.transition = '';
            return;
        }

        // DragMode === 'overlay'
        if (e.cancelable) e.preventDefault();

        // Track velocity
        const now = Date.now();
        const dt = now - this.lastTime;
        if (dt > 0) {
            this.velocity = (y - this.lastY) / dt;
        }
        this.lastY = y;
        this.lastTime = now;

        let newY = this.startDragY + deltaY;

        // Add resistance if user tries to drag higher than the fully open state (0)
        if (newY < 0) {
            newY = newY * 0.3; // Rubber-band effect
        }

        this.currentDragY = newY;
        this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
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
        this.content.style.transition = ''; // Restore CSS transitions for the snap animation

        if (this.dragMode === 'scroll') return;

        const initialY = this.calculateInitialY();
        const swipeThreshold = 0.5;

        // Fast swipe down
        if (this.velocity > swipeThreshold) {
            if (this.currentDragY > initialY) {
                this.close(); // Swiped down from peeking state
            } else {
                this.currentDragY = initialY; // Swiped down from fully open state -> snap to peek
                this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
            }
            return;
        }

        // Fast swipe up
        if (this.velocity < -swipeThreshold) {
            this.currentDragY = 0; // Fully expand
            this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
            return;
        }

        // Normal positional snapping
        if (this.currentDragY > initialY + (DISMISS_THRESHOLD / 2)) {
            this.close(); // Pulled down past peek state
        } else if (initialY === 0 && this.currentDragY > DISMISS_THRESHOLD / 2) {
            this.close(); // Pulled down from a naturally fully open state
        } else {
            // Decide whether to snap to fully open (0) or peeking (initialY)
            if (this.currentDragY < initialY * 0.6) {
                this.currentDragY = 0;
            } else {
                this.currentDragY = initialY;
            }
            this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
        }
    }

    onWheel(e) {
        if (window.innerWidth >= 768 && window.innerHeight >= 768) return;
        if (!this.isOpen || this.isDragging) return;

        const body = this.overlay.querySelector('.overlay__body');
        const isAtTop = body ? body.scrollTop <= 0 : true;
        const initialY = this.calculateInitialY();

        // 1. Overlay is in peeking mode
        if (this.currentDragY > 0) {
            if (e.cancelable) e.preventDefault();

            // We are already transitioning, ignore further wheel inputs during this animation
            if (this.content.classList.contains('is-animating')) return;

            if (e.deltaY > 0) {
                // Scroll down -> Smoothly open the overlay fully
                this.currentDragY = 0;
                this.content.classList.add('is-animating');
                this.content.style.transition = 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
                this.content.style.transform = `translate(-50%, 0)`;
                setTimeout(() => {
                    this.content.style.transition = '';
                    this.content.classList.remove('is-animating');
                }, 400);
            } else if (e.deltaY < 0) {
                // Scroll up -> Close the overlay
                this.close();
            }
        }
        // 2. Overlay is fully open
        else {
            if (e.deltaY < 0 && isAtTop) {
                if (e.cancelable) e.preventDefault();

                if (this.content.classList.contains('is-animating')) return;

                this.wheelScrollUpAccumulator += Math.abs(e.deltaY);

                // Threshold of 80 to avoid accidental collapse from minor trackpad inertia
                if (this.wheelScrollUpAccumulator > 80) {
                    this.wheelScrollUpAccumulator = 0;

                    if (initialY > 0) {
                        // Collapse to peeking state
                        this.currentDragY = initialY;
                        this.content.classList.add('is-animating');
                        this.content.style.transition = 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
                        this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
                        setTimeout(() => {
                            this.content.style.transition = '';
                            this.content.classList.remove('is-animating');
                        }, 400);
                    } else {
                        // No peeking state -> Close completely
                        this.close();
                    }
                }
            } else {
                // Reset accumulator if scrolling down or if scrolled away from top
                this.wheelScrollUpAccumulator = 0;
            }
        }
    }

    handleResize() {
        if (!this.isOpen || this.isDragging || this.isWindowDragging) return;

        const openOverlays = Array.from(document.querySelectorAll('.overlay.is-open'));
        const isFirstOverlay = openOverlays[0] === this.overlay;

        if (window.innerWidth >= 768 && window.innerHeight >= 768) {
            // Desktop
            this.content.style.minHeight = '';
            this.content.style.transform = '';

            if (isFirstOverlay) {
                this.content.style.top = '';
                this.content.style.left = '';
            }
        } else {
            // Mobile
            this.content.style.top = '';
            this.content.style.left = '';
            this.content.style.minHeight = '';

            const initialY = this.calculateInitialY();
            // Preserve fully expanded state if it was already fully expanded
            if (this.currentDragY !== 0) {
                this.currentDragY = initialY;
            }
            this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
        }

        this.checkOverlap();
    }

    checkOverlap() {
        if (window.innerWidth < 768 || window.innerHeight < 768) return;
        if (isBlurManuallyDisabled && window.innerWidth >= 900 && window.innerHeight >= 900) return;

        const main = document.querySelector('main');
        if (!main) return;

        const mainRect = main.getBoundingClientRect();
        const threshold = 56;
        const openOverlays = document.querySelectorAll('.overlay.is-open');
        let anyOverlaps = false;

        openOverlays.forEach(overlay => {
            const content = overlay.querySelector('.overlay__content');
            if (content) {
                const rect = content.getBoundingClientRect();
                const overlaps = !(rect.right < mainRect.left + threshold ||
                    rect.left > mainRect.right - threshold ||
                    rect.bottom < mainRect.top + threshold ||
                    rect.top > mainRect.bottom - threshold);

                if (overlaps) anyOverlaps = true;
            }
        });

        if (anyOverlaps) {
            document.body.classList.add('has-backdrop-blur');
        } else {
            document.body.classList.remove('has-backdrop-blur');
        }
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.currentDragY = 0;
        this.wheelScrollUpAccumulator = 0;

        // Set state to open to allow measuring height correctly
        this.overlay.classList.add('is-open');
        document.body.classList.add('overlay-active');

        updateOverlayHeights();

        if (window.innerWidth >= 768 && window.innerHeight >= 768) {
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
            // Mobile: Calculate initial gap shift immediately
            this.content.style.top = '';
            this.content.style.left = '';
            this.content.style.minHeight = '';

            this.currentDragY = this.calculateInitialY();
            this.content.style.transform = `translate(-50%, ${this.currentDragY}px)`;
        }

        const body = this.overlay.querySelector('.overlay__body');
        if (body) body.scrollTop = 0;

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
        this.checkOverlap();
    }

    close(popHistory = true) {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.overlay.classList.remove('is-open');

        if (window.innerWidth < 768 || window.innerHeight < 768) {
            this.content.style.transform = '';
        }

        const openOverlays = document.querySelectorAll('.overlay.is-open');
        if (openOverlays.length === 0) {
            document.body.classList.remove('overlay-active');
        }

        this.checkOverlap();

        if (popHistory) {
            const currentState = history.state || {};
            const currentStack = currentState.overlayStack || [];

            if (currentStack.length > 0) {
                const isNewest = currentStack[currentStack.length - 1] === this.historyKey;

                if (isNewest) {
                    history.back();
                } else {
                    const newStack = currentStack.filter(k => k !== this.historyKey);
                    history.replaceState({ ...currentState, overlayStack: newStack }, '');
                }
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Backspace') {
        if (globalOverlayStack.length === 0) return;

        if (e.key === 'Backspace') {
            const active = document.activeElement;
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) ||
                active.isContentEditable;
            if (isInput) return;
        }

        const topKey = globalOverlayStack[globalOverlayStack.length - 1];
        const instance = allInstances.find(inst => inst.historyKey === topKey);

        if (instance && instance.isOpen) {
            instance.close();
            if (e.key === 'Backspace') e.preventDefault();
        }
    }
});

window.addEventListener('mousedown', (e) => {
    if (!document.body.classList.contains('overlay-active')) return;
    const clickedContent = e.target.closest('.overlay__content');

    if (clickedContent) {
        if (isBlurManuallyDisabled) {
            isBlurManuallyDisabled = false;
            const openInstance = allInstances.find(inst => inst.isOpen);
            if (openInstance) openInstance.checkOverlap();
        }
        return;
    }

    if (window.innerWidth >= 900 && window.innerHeight >= 900) {
        isBlurManuallyDisabled = true;
        document.body.classList.remove('has-backdrop-blur');
    } else {
        DraggableOverlay.closeAll();
    }
});