// src/js/privacy.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class PrivacyOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('privacy-overlay', { 
            historyKey: 'privacy',
            topBuffer: 140 
        });
        
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.js-open-privacy');
            if (link) {
                e.preventDefault();
                this.overlay.open();
            }
        });
    }
}
