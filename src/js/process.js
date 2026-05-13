export class ProcessAnimation {
    constructor(containerElement) {
        this.container = containerElement;
        this.track = this.container.querySelector('.profile-process__track');
        this.labelsTrack = this.container.querySelector('.profile-process__labels-track');
        this.labelItems = this.container.querySelectorAll('.profile-process__label-item');
        this.textElement = this.container.querySelector('.process-text');
        this.progressLine = this.container.querySelector('.profile-process__line--progress');
        this.steps = this.container.querySelectorAll('.profile-process__step');

        if (!this.container || !this.track || !this.labelsTrack) return;

        this.stepCount = this.steps.length;
        this.currentIndex = 0;
        this.animationTimeout = null;
        this.init();
    }

    init() {
        // Add click listeners to steps
        this.steps.forEach((step, index) => {
            step.style.cursor = 'pointer';
            step.addEventListener('click', () => {
                this.updateStep(index);
            });
        });

        // Add click listeners to label items
        this.labelItems.forEach((label, index) => {
            label.style.cursor = 'pointer';
            label.addEventListener('click', () => {
                this.updateStep(index);
            });
        });

        // Initialize first step
        this.updateStep(0);

        // Handle Resize by recalculating layout
        window.addEventListener('resize', () => {
            this.updateLayout(this.currentIndex, this.currentIndex);
        });

        // Intersection Observer to add/remove .in-view
        let visibilityTimeout;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    visibilityTimeout = setTimeout(() => {
                        this.container.classList.add('in-view');
                    }, 500); // kurze Zeit warten, bevor es auftaucht
                } else {
                    clearTimeout(visibilityTimeout);
                    this.container.classList.remove('in-view');
                }
            });
        }, { threshold: 0.6 });
        observer.observe(this.container);

        // Touch / Swipe Support
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        // Minimum swipe distance threshold
        const threshold = 50;
        const swipeDistance = this.touchStartX - this.touchEndX;

        // Check if swipe length exceeds threshold
        if (Math.abs(swipeDistance) > threshold) {
            // Swipe Left -> Next Step
            if (swipeDistance > 0) {
                if (this.currentIndex < this.stepCount - 1) {
                    this.updateStep(this.currentIndex + 1);
                }
            }
            // Swipe Right -> Previous Step
            else {
                if (this.currentIndex > 0) {
                    this.updateStep(this.currentIndex - 1);
                }
            }
        }
    }

    updateStep(index) {
        if (this.currentIndex === index && this.steps[index].classList.contains('active')) {
            this.updateLayout(index, this.currentIndex);
            return;
        }

        const oldIndex = this.currentIndex;
        this.currentIndex = index;
        this.updateLayout(index, oldIndex);

        // Update Active Step, Labels & Content
        this.steps.forEach((step, i) => {
            if (i === index) {
                step.classList.add('active');
                step.classList.remove('completed');
                this.updateContent(step);
            } else if (i < index) {
                step.classList.remove('active');
                step.classList.add('completed');
            } else {
                step.classList.remove('active');
                step.classList.remove('completed');
            }
        });

        this.labelItems.forEach((label, i) => {
            if (i === index) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
    }

    updateLayout(index, oldIndex) {
        // 1. Update Icons Track (Horizontal snap to center active step)
        const activeStep = this.steps[index];
        if (activeStep) {
            // Disable translate X for desktop hero version
            if (this.container.classList.contains('process-desktop-only')) {
                this.track.style.transform = 'none';
            } else {
                const containerCenter = this.container.offsetWidth / 2;

                // Calculate step center relative to the track START
                const stepLeft = activeStep.offsetLeft;
                const stepWidth = activeStep.offsetWidth;
                const stepCenter = stepLeft + (stepWidth / 2);

                // Desired shift: Move track so stepCenter aligns with containerCenter
                const shift = containerCenter - stepCenter;

                this.track.style.transform = `translateX(${shift}px)`;
            }
        }

        // 2. Update Labels Track (Horizontal scroll to center)
        // this.updateLabelsTrack(index); -> Disabled per requirement

        // 3. Update progress line width
        if (this.progressLine) {
            const isBackward = index < oldIndex;
            // Delay line when moving backward so circles can vanish first
            this.progressLine.style.transitionDelay = isBackward ? '0.3s' : '0s';

            const progress = (index / (this.stepCount - 1)) * 100;
            this.progressLine.style.width = `${progress}%`;
        }
    }



    updateContent(step) {
        const descText = step.getAttribute('data-text');

        // Animate Description Text
        if (this.textElement.innerText !== descText) {

            // Clear existing timeout to prevent overlap
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
            }

            // 1. Hide (Scale down & Blur)
            this.textElement.classList.add('hide');

            this.animationTimeout = setTimeout(() => {
                // 2. Change Content
                this.textElement.innerText = descText;

                // 3. Prepare for Enter (Scale up & Blur, No Transition)
                this.textElement.classList.add('prepare-enter');
                this.textElement.classList.remove('hide');

                // Force Reflow
                void this.textElement.offsetWidth;

                // 4. Animate In (Transition to Normal)
                this.textElement.classList.remove('prepare-enter');

                this.animationTimeout = null;
            }, 300); // Wait for hide transition (matches CSS)
        }
    }
}
