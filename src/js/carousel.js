
export class Carousel {
    constructor(selector) {
        this.root = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!this.root) return;

        this.track = this.root.querySelector('.carousel__track');
        this.viewport = this.root.querySelector('.carousel__viewport');
        if (!this.track || !this.viewport) return;

        // Configuration
        this.gap = 24; // 1.5rem
        this.autoPlayDelay = 6000;
        this.autoPlayInterval = null;
        this.mobileOnly = this.root.hasAttribute('data-mobile-only');
        this.active = false;

        this.originalItems = Array.from(this.track.children); // Store originally
        if (this.originalItems.length === 0) return;

        this.init();
    }

    init() {
        this.checkResponsive();
        window.addEventListener('resize', () => {
            this.checkResponsive();
            if (this.active) this.handleResize();
        });

        // Always bind interaction events
        this.bindEvents();
    }

    checkResponsive() {
        if (this.mobileOnly) {
            const isDesktop = window.matchMedia('(min-width: 768px)').matches;
            if (isDesktop && this.active) {
                this.teardown();
            } else if (!isDesktop && !this.active) {
                this.setup();
            } else if (isDesktop && !this.active) {
                this.root.classList.add('carousel--disabled');
            }
        } else {
            // Always active if not restricted
            if (!this.active) this.setup();
        }
    }

    setup() {
        if (this.active) return;
        this.active = true;
        this.root.classList.remove('carousel--disabled');

        this.itemWidth = this.originalItems[0].getBoundingClientRect().width;
        this.singleMove = this.itemWidth + this.gap;
        this.totalItemsCount = this.originalItems.length;

        // State
        this.currentIndex = this.totalItemsCount;
        this.isDragging = false;
        this.startX = 0;
        this.dragDiff = 0;

        this.setupClones();
        this.createDots();
        this.updateTrack(this.currentIndex, false);
        this.startAutoPlay();
    }

    teardown() {
        if (!this.active) return;
        this.active = false;
        this.stopAutoPlay();
        this.removeClones();
        this.removeDots();

        // Reset Styles
        this.track.style.transform = '';
        this.track.style.transition = '';
        this.track.style.width = '';
        this.root.classList.add('carousel--disabled');
    }

    setupClones() {
        const fragmentStart = document.createDocumentFragment();
        const fragmentEnd = document.createDocumentFragment();

        this.originalItems.forEach(item => {
            const cloneStart = item.cloneNode(true);
            const cloneEnd = item.cloneNode(true);
            cloneStart.classList.add('carousel__clone');
            cloneEnd.classList.add('carousel__clone');
            fragmentStart.appendChild(cloneStart);
            fragmentEnd.appendChild(cloneEnd);
        });

        this.track.insertBefore(fragmentStart, this.track.firstChild);
        this.track.appendChild(fragmentEnd);
    }

    removeClones() {
        const clones = this.track.querySelectorAll('.carousel__clone');
        clones.forEach(el => el.remove());
    }

    createDots() {
        let controls = this.root.querySelector('.carousel__controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'carousel__controls';
            this.root.appendChild(controls);
        }
        this.controls = controls;
        this.controls.innerHTML = '';
        this.dots = [];

        for (let i = 0; i < this.totalItemsCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'carousel__dot';
            dot.addEventListener('click', () => {
                this.currentIndex = this.totalItemsCount + i;
                this.updateTrack(this.currentIndex, true);
                this.stopAutoPlay();
                this.startAutoPlay();
            });
            this.controls.appendChild(dot);
            this.dots.push(dot);
        }
    }

    removeDots() {
        if (this.controls) {
            this.controls.remove();
            this.controls = null;
            this.dots = [];
        }
    }

    updateDots() {
        if (!this.dots || !this.dots.length) return;
        const activeIndex = this.currentIndex % this.totalItemsCount;
        this.dots.forEach((dot, index) => {
            if (index === activeIndex) dot.classList.add('carousel__dot--active');
            else dot.classList.remove('carousel__dot--active');
        });
    }

    updateTrack(index, transition = true) {
        if (!this.active) return;
        if (transition) {
            this.track.style.transition = 'transform 1s cubic-bezier(0.42, 1, 0.5, 1)';
        } else {
            this.track.style.transition = 'none';
        }

        const viewportWidth = this.viewport.offsetWidth;
        const centerOffset = (viewportWidth - this.itemWidth) / 2;
        const newPos = (index * this.singleMove) - centerOffset;

        this.track.style.transform = `translateX(-${newPos}px)`;
        this.updateDots();
    }

    moveNext() {
        if (!this.active) return;
        this.currentIndex++;
        this.updateTrack(this.currentIndex, true);
    }

    movePrev() {
        if (!this.active) return;
        this.currentIndex--;
        this.updateTrack(this.currentIndex, true);
    }

    startAutoPlay() {
        if (!this.active) return;
        this.stopAutoPlay();
        this.autoPlayInterval = setInterval(() => {
            this.moveNext();
        }, this.autoPlayDelay);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    handleResize() {
        if (!this.active) return;
        if (!this.originalItems.length) return;

        const firstItem = this.originalItems[0];
        if (firstItem) {
            this.itemWidth = firstItem.getBoundingClientRect().width;
            this.singleMove = this.itemWidth + this.gap;
            this.updateTrack(this.currentIndex, false);
        }
    }

    handleTransitionEnd() {
        if (!this.active) return;
        if (this.currentIndex >= this.totalItemsCount * 2) {
            this.currentIndex = this.totalItemsCount;
            this.updateTrack(this.currentIndex, false);
        }
        if (this.currentIndex < this.totalItemsCount) {
            this.currentIndex = this.totalItemsCount * 2 - 1;
            this.updateTrack(this.currentIndex, false);
        }
    }

    handleStart(e) {
        if (!this.active) return;
        this.isDragging = true;
        this.startX = (e.touches ? e.touches[0].clientX : e.pageX);
        this.stopAutoPlay();
        this.track.style.transition = 'none';
        this.track.style.cursor = 'grabbing';
    }

    handleMove(e) {
        if (!this.active || !this.isDragging) return;
        const currentX = (e.touches ? e.touches[0].clientX : e.pageX);
        this.dragDiff = this.startX - currentX;

        const viewportWidth = this.viewport.offsetWidth;
        const centerOffset = (viewportWidth - this.itemWidth) / 2;
        const currentPos = (this.currentIndex * this.singleMove) - centerOffset;

        this.track.style.transform = `translateX(-${currentPos + this.dragDiff}px)`;
    }

    handleEnd() {
        if (!this.active || !this.isDragging) return;
        this.isDragging = false;
        this.track.style.cursor = 'grab';

        const threshold = this.singleMove / 4;

        if (this.dragDiff > threshold) {
            this.moveNext();
        } else if (this.dragDiff < -threshold) {
            this.movePrev();
        } else {
            this.updateTrack(this.currentIndex, true);
        }

        this.dragDiff = 0;
        this.startAutoPlay();
    }

    bindEvents() {
        this.track.addEventListener('transitionend', () => this.handleTransitionEnd());

        const start = (e) => this.handleStart(e);
        const move = (e) => this.handleMove(e);
        const end = () => this.handleEnd();

        this.viewport.addEventListener('mousedown', start);
        this.viewport.addEventListener('touchstart', start);

        this.viewport.addEventListener('mousemove', move);
        this.viewport.addEventListener('touchmove', move);

        this.viewport.addEventListener('mouseup', end);
        this.viewport.addEventListener('mouseleave', end);
        this.viewport.addEventListener('touchend', end);
    }
}

export const initCarousel = () => {
    document.querySelectorAll('.carousel').forEach(el => new Carousel(el));
};
