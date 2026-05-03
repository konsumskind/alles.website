// src/js/privacy.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class PrivacyOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('privacy-overlay', { 
            historyKey: 'privacy',
            topBuffer: 140 
        });
        
        this.link = document.getElementById('privacyLink');
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        this.link?.addEventListener('click', (e) => {
            e.preventDefault();
            this.overlay.open();
        });
    }
}
