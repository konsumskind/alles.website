import { showToast } from './utils.js';
export class SwipeButton {
    constructor(container) {
        this.container = container;
        this.knob = container.querySelector('.swipe-knob');
        // Find icons and arrows within this specific container
        this.iconLeft = container.querySelector('.swipe-icon-left');
        this.iconRight = container.querySelector('.swipe-icon-right');
        // Arrows might be direct children of knob or deeper.
        // Using querySelector on container finding .swipe-arrow-left is safer if unique classes used.
        // But current CSS uses .swipe-arrow and IDs. Let's assume we add classes .swipe-arrow-left/right to HTML.
        this.arrowLeft = container.querySelector('.swipe-arrow-left');
        this.arrowRight = container.querySelector('.swipe-arrow-right');
        if (!this.knob || !this.iconLeft || !this.iconRight) {
            console.warn('SwipeButton: Missing required elements', container);
            return;
        }
        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;
        this.containerWidth = this.container.offsetWidth;
        this.knobWidth = this.knob.offsetWidth;
        this.maxDrag = (this.containerWidth / 2) - (this.knobWidth / 2);
        // Bind methods
        this.startDrag = this.startDrag.bind(this);
        this.drag = this.drag.bind(this);
        this.endDrag = this.endDrag.bind(this);
        this.init();
    }
    init() {
        // Initial State Center
        this.knob.style.transform = `translateX(-50%)`;
        this.container.addEventListener('mousedown', this.startDrag);
        this.container.addEventListener('touchstart', this.startDrag, { passive: false });
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('touchmove', this.drag, { passive: false });
        document.addEventListener('mouseup', this.endDrag);
        document.addEventListener('touchend', this.endDrag);
        // Update on resize
        window.addEventListener('resize', () => {
            this.containerWidth = this.container.offsetWidth;
            this.maxDrag = (this.containerWidth / 2) - (this.knobWidth / 2);
        });
    }
    startDrag(e) {
        this.isDragging = true;
        this.startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        this.knob.style.transition = 'none';
    }
    drag(e) {
        if (!this.isDragging) return;
        // Only prevent default if we are actually dragging this specific button?
        // Actually blocking vertical scroll globally while dragging is good UX for horizontal swipe.
        // But we need to check if *this* instance is dragging.
        // If multiple buttons exist, we need to be careful.
        // Logic: if isDragging is true for THIS instance, block.
        if (e.cancelable) e.preventDefault();
        const clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - this.startX;
        // Clamp logic
        if (deltaX > this.maxDrag) this.currentX = this.maxDrag;
        else if (deltaX < -this.maxDrag) this.currentX = -this.maxDrag;
        else this.currentX = deltaX;
        this.knob.style.transform = `translateX(calc(-50% + ${this.currentX}px))`;
        // Visual Feedback
        this.updateVisuals();
    }
    updateVisuals() {
        const progress = Math.abs(this.currentX) / this.maxDrag; // 0 to 1

        const resetSide = (icon, arrow) => {
            if (icon) {
                icon.style.opacity = '';
                icon.style.color = '';
                icon.style.textShadow = '';
            }
            if (arrow) {
                arrow.style.opacity = '';
                arrow.style.color = '';
                arrow.style.textShadow = '';
            }
        };

        if (this.currentX < 0) { // Moving Left (Mail)
            this.resetAnimations();
            resetSide(this.iconRight, this.arrowRight);

            const alpha = 0.5 + (progress * 0.3);
            const shine = 2 + (progress * 10);
            const purpleGlow = `0 0 ${shine}px rgba(168, 85, 247, ${alpha})`;

            if (this.iconLeft) {
                this.iconLeft.style.opacity = alpha;
                this.iconLeft.style.color = 'var(--purple)';
                this.iconLeft.style.textShadow = purpleGlow;
            }
            if (this.arrowLeft) {
                this.arrowLeft.style.opacity = alpha;
                this.arrowLeft.style.color = 'var(--purple)';
                this.arrowLeft.style.textShadow = purpleGlow;
            }
            if (this.knob) {
                this.knob.style.boxShadow = `var(--raised), var(--engraved)`;
            }
        } else if (this.currentX > 0) { // Moving Right (Call)
            this.resetAnimations();
            resetSide(this.iconLeft, this.arrowLeft);

            const alpha = 0.5 + (progress * 0.3);
            const shine = 2 + (progress * 10);
            const blueGlow = `0 0 ${shine}px rgba(0, 179, 255, ${alpha})`;

            if (this.iconRight) {
                this.iconRight.style.opacity = alpha;
                this.iconRight.style.color = 'var(--blue)';
                this.iconRight.style.textShadow = blueGlow;
            }
            if (this.arrowRight) {
                this.arrowRight.style.opacity = alpha;
                this.arrowRight.style.color = 'var(--blue)';
                this.arrowRight.style.textShadow = blueGlow;
            }
            if (this.knob) {
                this.knob.style.boxShadow = `var(--raised), var(--engraved)`;
            }
        } else {
            resetSide(this.iconLeft, this.arrowLeft);
            resetSide(this.iconRight, this.arrowRight);
            if (this.knob) {
                this.knob.style.boxShadow = '';
            }
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
        const threshold = this.maxDrag * 0.9;
        if (this.currentX < -threshold) {
            this.knob.style.transform = `translateX(calc(-50% - ${this.maxDrag}px))`;
            this.triggerAction('mail');
        } else if (this.currentX > threshold) {
            this.knob.style.transform = `translateX(calc(-50% + ${this.maxDrag}px))`;
            this.triggerAction('call');
        } else {
            this.resetSwipe();
        }
    }
    resetSwipe() {
        this.currentX = 0;
        this.knob.style.transform = `translateX(-50%)`;
        // Reset Styles
        const els = [this.iconLeft, this.iconRight, this.arrowLeft, this.arrowRight];
        els.forEach(el => {
            if (el) {
                el.style.opacity = '';
                el.style.color = '';
                el.style.textShadow = '';
                el.style.animation = ''; // let CSS take over
            }
        });
        if (this.knob) {
            this.knob.style.boxShadow = '';
        }
    }
    triggerAction(type) {
        if (type === 'mail') {
            if (this.container.closest('#start')) {
                document.dispatchEvent(new CustomEvent('openBookingForm'));
            } else {
                window.location.href = "mailto:janoschkartschall@gmail.com";
                showToast('Mail-App wird geöffnet...');
            }
        } else {
            window.location.href = "tel:+4915772998248";
            showToast('Anruf wird gestartet...');
        }
        setTimeout(() => this.resetSwipe(), 1000);
    }
}