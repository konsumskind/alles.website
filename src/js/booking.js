// src/js/booking.js
import { showToast } from './utils.js';
import { DraggableOverlay } from './modules/DraggableOverlay.js';

const GAS_WEB_APP_URL = ''; 

export class BookingForm {
    constructor() {
        this.overlay = new DraggableOverlay('booking-overlay', { 
            historyKey: 'booking',
            topBuffer: 150 
        });

        this.form = document.getElementById('bookingForm');
        this.slotSelect = document.getElementById('b-slotSelect');
        this.selectIcon = this.slotSelect?.parentElement.querySelector('.select-wrapper__icon');
        this.submitBtn = document.getElementById('b-submitBtn');

        if (!this.overlay.overlay || !this.form) return;

        this.init();
    }

    init() {
        document.addEventListener('openBookingForm', () => this.overlay.open());

        // Select Chevron Animation
        this.slotSelect.addEventListener('mousedown', () => {
            this.selectIcon?.classList.toggle('select-wrapper__icon--open');
        });
        this.slotSelect.addEventListener('change', () => {
            this.selectIcon?.classList.remove('select-wrapper__icon--open');
        });
        this.slotSelect.addEventListener('blur', () => {
            this.selectIcon?.classList.remove('select-wrapper__icon--open');
        });

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Load slots on open
        document.addEventListener('openBookingForm', () => this.loadSlots());
    }

    async loadSlots() {
        this.slotSelect.innerHTML = '<option value="">Lade Termine...</option>';
        this.slotSelect.disabled = true;

        try {
            let slots = [];
            if (GAS_WEB_APP_URL) {
                const response = await fetch(`${GAS_WEB_APP_URL}?action=getSlots`);
                slots = await response.json();
            } else {
                await new Promise(r => setTimeout(r, 1000));
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                slots = [
                    new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
                    new Date(tomorrow.setHours(13, 30, 0, 0)).toISOString(),
                    new Date(tomorrow.setHours(15, 0, 0, 0)).toISOString()
                ];
            }
            this.populateSlots(slots);
        } catch (error) {
            console.error('Error loading slots:', error);
            showToast('Fehler beim Laden der Termine');
            this.slotSelect.innerHTML = '<option value="">Keine Termine verfügbar</option>';
        } finally {
            this.slotSelect.disabled = false;
        }
    }

    populateSlots(slots) {
        this.slotSelect.innerHTML = '<option value="" disabled selected>Bitte wählen...</option>';
        if (slots.length === 0) {
            this.slotSelect.innerHTML = '<option value="">Keine Termine verfügbar</option>';
            return;
        }
        slots.forEach(slotIso => {
            const date = new Date(slotIso);
            const formatted = date.toLocaleDateString('de-DE', { 
                weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
            }) + ' Uhr';
            const option = document.createElement('option');
            option.value = slotIso;
            option.textContent = formatted;
            this.slotSelect.appendChild(option);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        const originalBtnText = this.submitBtn.innerHTML;
        this.submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Senden...';
        this.submitBtn.disabled = true;

        const formData = {
            firstName: document.getElementById('b-firstName').value,
            lastName: document.getElementById('b-lastName').value,
            email: document.getElementById('b-email').value,
            phone: document.getElementById('b-phone').value,
            selectedTime: this.slotSelect.value
        };

        try {
            if (GAS_WEB_APP_URL) {
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    body: JSON.stringify(formData),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
            } else {
                await new Promise(r => setTimeout(r, 1500));
            }
            showToast('Termin erfolgreich angefragt!');
            this.form.reset();
            this.overlay.close();
        } catch (error) {
            console.error('Error submitting booking:', error);
            showToast('Fehler bei der Buchung. Bitte später versuchen.');
        } finally {
            this.submitBtn.innerHTML = originalBtnText;
            this.submitBtn.disabled = false;
        }
    }
}
