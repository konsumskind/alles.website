// src/js/imprint.js
import { DraggableOverlay } from './modules/DraggableOverlay.js';

export class ImprintOverlay {
    constructor() {
        this.overlay = new DraggableOverlay('imprint-overlay', { 
            historyKey: 'imprint',
            topBuffer: 140 
        });
        
        this.links = document.querySelectorAll('.js-open-imprint');
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
