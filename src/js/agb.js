// src/js/agb.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class AgbOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('agb-overlay', { 
            historyKey: 'agb',
            topBuffer: 140 
        });
        
        this.links = document.querySelectorAll('.js-open-agb');
        if (!this.overlay.overlay) return;

        this.init();
    }

    init() {
        this.links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.overlay.open();
            });
        });
    }
}
