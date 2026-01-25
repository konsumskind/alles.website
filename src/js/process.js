export class ProcessAnimation {
    constructor() {
        this.container = document.getElementById('profileProcess');
        this.track = document.getElementById('processTrack');
        this.labelsTrack = document.getElementById('processLabels');
        this.labelItems = document.querySelectorAll('.profile-process__label-item');
        this.textElement = document.getElementById('processText');
        this.progressLine = document.getElementById('processProgress');
        this.steps = document.querySelectorAll('.profile-process__step');

        if (!this.container || !this.track || !this.labelsTrack) return;

        this.stepCount = this.steps.length;
        this.currentIndex = 0;
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

        // Ensure labels are centered after initial render
        setTimeout(() => this.updateLabelsTrack(0), 100);

        // Handle Resize by recalculating layout
        window.addEventListener('resize', () => {
            this.updateLayout(this.currentIndex, this.currentIndex);
        });
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
            const containerCenter = this.container.offsetWidth / 2;

            // Calculate step center relative to the track START
            const stepLeft = activeStep.offsetLeft;
            const stepWidth = activeStep.offsetWidth;
            const stepCenter = stepLeft + (stepWidth / 2);

            // Desired shift: Move track so stepCenter aligns with containerCenter
            const shift = containerCenter - stepCenter;

            this.track.style.transform = `translateX(${shift}px)`;
        }

        // 2. Update Labels Track (Horizontal scroll to center)
        this.updateLabelsTrack(index);

        // 3. Update progress line width
        if (this.progressLine) {
            const isBackward = index < oldIndex;
            // Delay line when moving backward so circles can vanish first
            this.progressLine.style.transitionDelay = isBackward ? '0.3s' : '0s';

            const progress = (index / (this.stepCount - 1)) * 100;
            this.progressLine.style.width = `${progress}%`;
        }
    }

    updateLabelsTrack(index) {
        const activeLabel = this.labelItems[index];
        if (!activeLabel) return;

        const containerWidth = this.labelsTrack.parentElement.offsetWidth;
        const trackRect = this.labelsTrack.getBoundingClientRect();
        const itemRect = activeLabel.getBoundingClientRect();

        // Calculate item center relative to track
        const itemOffsetInTrack = itemRect.left - trackRect.left + (itemRect.width / 2);

        // Center of container
        const centerOffset = containerWidth / 2;

        // Final translateX
        const shift = centerOffset - itemOffsetInTrack;

        this.labelsTrack.style.transform = `translateX(${shift}px)`;
    }

    updateContent(step) {
        const descText = step.getAttribute('data-text');

        // Animate Description Text
        if (this.textElement.innerText !== descText) {
            this.textElement.style.opacity = 0;
            setTimeout(() => {
                this.textElement.innerText = descText;
                this.textElement.style.opacity = 1;
            }, 150);
        }
    }
}
