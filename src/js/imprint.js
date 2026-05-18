// src/js/imprint.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class ImprintOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('imprint-overlay', { 
            historyKey: 'imprint',
            topBuffer: 140 
        });
        
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.js-open-imprint');
            if (link) {
                e.preventDefault();
                this.overlay.open();
            }
        });
    }
}
