import { showToast } from './utils.js';

export class SwipeButton {
    constructor(container) {
        this.container = container;
        this.knob = container.querySelector('.swipe-knob');

        // Find icons and arrows within this specific container
        this.iconLeft = container.querySelector('.swipe-icon-left');
        this.iconRight = container.querySelector('.swipe-icon-right');
        this.arrowLeft = container.querySelector('.swipe-arrow-left');
        this.arrowRight = container.querySelector('.swipe-arrow-right');

        // Mode detection
        if (container.classList.contains('swipe-container--left-only')) {
            this.mode = 'left-only';
        } else if (container.classList.contains('swipe-container--right-only')) {
            this.mode = 'right-only';
        } else {
            this.mode = 'dual';
        }

        // Action detection for single-mode buttons
        this.forcedAction = container.getAttribute('data-action');

        if (!this.knob) {
            console.warn('SwipeButton: Missing knob element', container);
            return;
        }

        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;

        this.updateDimensions();

        // Bind methods
        this.startDrag = this.startDrag.bind(this);
        this.drag = this.drag.bind(this);
        this.endDrag = this.endDrag.bind(this);

        this.init();
    }

    updateDimensions() {
        this.containerWidth = this.container.offsetWidth;
        this.knobWidth = this.knob.offsetWidth;

        if (this.mode === 'dual') {
            this.maxDrag = (this.containerWidth / 2) - (this.knobWidth / 2);
        } else {
            this.maxDrag = this.containerWidth - this.knobWidth;
        }
    }

    init() {
        this.resetKnobPosition();

        this.container.addEventListener('mousedown', this.startDrag);
        this.container.addEventListener('touchstart', this.startDrag, { passive: false });
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('touchmove', this.drag, { passive: false });
        document.addEventListener('mouseup', this.endDrag);
        document.addEventListener('touchend', this.endDrag);

        window.addEventListener('resize', () => {
            this.updateDimensions();
            this.resetKnobPosition();
        });
    }

    resetKnobPosition() {
        if (this.mode === 'dual') {
            this.knob.style.left = '50%';
            this.knob.style.transform = `translateX(-50%)`;
        } else if (this.mode === 'left-only') {
            this.knob.style.left = 'auto';

            this.knob.style.transform = `translateX(0)`;
        } else if (this.mode === 'right-only') {

            this.knob.style.right = 'auto';
            this.knob.style.transform = `translateX(0)`;
        }
    }

    startDrag(e) {
        this.isDragging = true;
        this.startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        this.knob.style.transition = 'none';
    }

    drag(e) {
        if (!this.isDragging) return;
        if (e.cancelable) e.preventDefault();

        const clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        let deltaX = clientX - this.startX;

        if (this.mode === 'dual') {
            if (deltaX > this.maxDrag) deltaX = this.maxDrag;
            else if (deltaX < -this.maxDrag) deltaX = -this.maxDrag;
        } else if (this.mode === 'left-only') {
            if (deltaX > 0) deltaX = 0;
            else if (deltaX < -this.maxDrag) deltaX = -this.maxDrag;
        } else if (this.mode === 'right-only') {
            if (deltaX < 0) deltaX = 0;
            else if (deltaX > this.maxDrag) deltaX = this.maxDrag;
        }

        this.currentX = deltaX;

        if (this.mode === 'dual') {
            this.knob.style.transform = `translateX(calc(-50% + ${this.currentX}px))`;
        } else {
            this.knob.style.transform = `translateX(${this.currentX}px)`;
        }

        this.updateVisuals();
    }

    updateVisuals() {
        const progress = Math.abs(this.currentX) / this.maxDrag;
        const alpha = 0.5 + (progress * 0.3);
        const shine = 2 + (progress * 10);

        const resetSide = (icon, arrow) => {
            if (icon) {
                icon.style.opacity = ''; icon.style.color = ''; icon.style.textShadow = '';
            }
            if (arrow) {
                arrow.style.opacity = ''; arrow.style.color = ''; arrow.style.textShadow = '';
            }
        };

        const applyTheme = (side, colorVar, glowColor) => {
            const icon = side === 'left' ? this.iconLeft : this.iconRight;
            const arrow = side === 'left' ? this.arrowLeft : this.arrowRight;
            const glow = `0 0 ${shine}px ${glowColor}`;

            if (icon) {
                icon.style.opacity = alpha;
                icon.style.color = `var(--${colorVar})`;
                icon.style.textShadow = glow;
            }
            if (arrow) {
                arrow.style.opacity = alpha;
                arrow.style.color = `var(--${colorVar})`;
                arrow.style.textShadow = glow;
            }
        };

        this.resetAnimations();

        if (this.currentX < 0) { // Sliding Left
            if (this.mode === 'dual') resetSide(this.iconRight, this.arrowRight);
            applyTheme('left', 'purple', 'rgba(168, 85, 247, ' + alpha + ')');
            this.knob.style.boxShadow = `var(--raised), var(--engraved)`;
        } else if (this.currentX > 0) { // Sliding Right
            if (this.mode === 'dual') resetSide(this.iconLeft, this.arrowLeft);

            // Determine theme based on action
            const action = this.mode === 'dual' ? 'call' : (this.forcedAction || 'call');
            if (action === 'mail') {
                applyTheme('right', 'purple', 'rgba(168, 85, 247, ' + alpha + ')');
            } else {
                applyTheme('right', 'blue', 'rgba(0, 179, 255, ' + alpha + ')');
            }
            this.knob.style.boxShadow = `var(--raised), var(--engraved)`;
        } else {
            resetSide(this.iconLeft, this.arrowLeft);
            resetSide(this.iconRight, this.arrowRight);
            this.knob.style.boxShadow = '';
        }
    }

    resetAnimations() {
        if (this.arrowLeft) this.arrowLeft.style.animation = 'none';
        if (this.arrowRight) this.arrowRight.style.animation = 'none';
    }

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.knob.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        const threshold = this.maxDrag * 0.85;

        if (this.currentX < -threshold) {
            if (this.mode === 'dual') {
                this.knob.style.transform = `translateX(calc(-50% - ${this.maxDrag}px))`;
                this.triggerAction('mail');
            } else {
                this.knob.style.transform = `translateX(-${this.maxDrag}px)`;
                this.triggerAction(this.forcedAction || 'mail');
            }
        } else if (this.currentX > threshold) {
            if (this.mode === 'dual') {
                this.knob.style.transform = `translateX(calc(-50% + ${this.maxDrag}px))`;
                this.triggerAction('call');
            } else {
                this.knob.style.transform = `translateX(${this.maxDrag}px)`;
                this.triggerAction(this.forcedAction || 'call');
            }
        } else {
            this.resetSwipe();
        }
    }

    resetSwipe() {
        this.currentX = 0;
        this.resetKnobPosition();

        const els = [this.iconLeft, this.iconRight, this.arrowLeft, this.arrowRight];
        els.forEach(el => {
            if (el) {
                el.style.opacity = ''; el.style.color = ''; el.style.textShadow = ''; el.style.animation = '';
            }
        });
        this.knob.style.boxShadow = '';
    }

    triggerAction(type) {
        if (type === 'mail') {
            document.dispatchEvent(new CustomEvent('openBookingForm'));
        } else {
            window.location.href = "tel:+4915772998248";
            showToast('Anruf wird gestartet...');
        }
        setTimeout(() => this.resetSwipe(), 300);
    }
}