// src/js/agb.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class AgbOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('agb-overlay', { 
            historyKey: 'agb',
            topBuffer: 140 
        });
        
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.js-open-agb');
            if (link) {
                e.preventDefault();
                this.overlay.open();
            }
        });
    }
}
