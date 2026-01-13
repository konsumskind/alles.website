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
        if (this.currentX < 0) { // Moving Left (Mail)
            this.resetAnimations();
            const alpha = 0.5 + (progress * 0.5);
            // const purple = `rgba(168, 85, 247, ${alpha})`;
            // Better to use opacity with CSS variable to avoid Hex parsing
            if (this.iconLeft) {
                this.iconLeft.style.opacity = alpha;
                this.iconLeft.style.color = 'var(--purple)';
            }
            if (this.arrowLeft) {
                this.arrowLeft.style.opacity = alpha;
                this.arrowLeft.style.color = 'var(--purple)';
            }
        } else { // Moving Right (Call)
            this.resetAnimations();
            const alpha = 0.5 + (progress * 0.5);
            if (this.iconRight) {
                this.iconRight.style.opacity = alpha;
                this.iconRight.style.color = 'var(--blue)';
            }
            if (this.arrowRight) {
                this.arrowRight.style.opacity = alpha;
                this.arrowRight.style.color = 'var(--blue)';
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
                el.style.animation = ''; // let CSS take over
            }
        });
    }
    triggerAction(type) {
        if (type === 'mail') {
            window.location.href = "mailto:janoschkartschall@gmail.com";
            showToast('Mail-App wird geöffnet...');
        } else {
            window.location.href = "tel:+4915772998248";
            showToast('Anruf wird gestartet...');
        }
        setTimeout(() => this.resetSwipe(), 1000);
    }
}