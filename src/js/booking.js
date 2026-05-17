// src/js/booking.js
import { showToast } from './utils.js';
import { DraggableOverlay, updateOverlayHeights } from './modules/DraggableOverlay.js';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxDRlrVlJLIk7rZjduRgtJZ2wpNF0WwOOAv8V2EYl9EDk1Jo5n32uLvNKMeOLMLyN5EXQ/exec';

export class BookingForm {
    constructor() {
        this.overlay = new DraggableOverlay('booking-overlay', {
            historyKey: 'booking',
            topBuffer: 150
        });

        this.form = document.getElementById('bookingForm');
        this.submitBtn = document.getElementById('b-submitBtn');
        this.slotInput = document.getElementById('b-slotSelect');
        this.timeSelect = document.getElementById('b-timeSelect');
        this.pickerContainer = document.getElementById('bookingPicker');

        if (!this.overlay.overlay || !this.form) return;

        this.picker = new BookingPicker(this.pickerContainer, this.timeSelect, (iso) => {
            this.slotInput.value = iso;
        });

        this.init();
    }

    init() {
        document.addEventListener('openBookingForm', () => this.overlay.open());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Slots direkt im Hintergrund laden, sobald die Seite initialisiert wird
        this.picker.loadSlots();




        const urlParams = new URLSearchParams(window.location.search);
        this.inviteToken = urlParams.get('invite');
        this.inviteMode = urlParams.get('mode');

        if (this.inviteToken) {
            if (this.inviteMode !== 'separate') {
                // Gemeinsamer Termin -> Verstecke die Datumsauswahl
                if (this.pickerContainer) {
                    this.pickerContainer.style.display = 'none';
                    const h4 = this.pickerContainer.previousElementSibling;
                    if (h4 && h4.tagName === 'H4') {
                        h4.style.display = 'none';
                    }
                }
                if (this.timeSelect) {
                    this.timeSelect.style.display = 'none';
                    this.timeSelect.removeAttribute('required');
                }
                if (this.slotInput) {
                    this.slotInput.removeAttribute('required');
                }
                this.submitBtn.innerHTML = 'Am Termin teilnehmen';
            } else {
                // Eigener Termin -> Zeige Datumsauswahl, ändere nur den Button-Text
                this.submitBtn.innerHTML = 'Termin vereinbaren (Einladung)';
            }

            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('openBookingForm'));
            }, 800);
        }


        // Select Animation Logic
        const selectIcon = this.timeSelect.parentElement.querySelector('.select-wrapper__icon');
        this.timeSelect.addEventListener('mousedown', () => {
            selectIcon?.classList.add('select-wrapper__icon--open');
            selectIcon?.classList.replace('fa-clock', 'fa-chevron-down');
        });
        this.timeSelect.addEventListener('change', () => {
            selectIcon?.classList.remove('select-wrapper__icon--open');
            if (this.timeSelect.value) {
                selectIcon?.classList.replace('fa-chevron-down', 'fa-clock');
            } else {
                selectIcon?.classList.replace('fa-clock', 'fa-chevron-down');
            }
        });
        this.timeSelect.addEventListener('blur', () => selectIcon?.classList.remove('select-wrapper__icon--open'));

        // Dev Helper: Sofort Overlay öffnen über Konsole
        window.__openBooking = () => this.overlay.open();
    }



    async handleSubmit(e) {
        e.preventDefault();

        if (!this.slotInput.value && !this.inviteToken) {
            showToast('Bitte wähle einen Termin aus.');
            return;
        }

        const originalBtnText = this.submitBtn.innerHTML;
        this.submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Senden...';
        this.submitBtn.disabled = true;

        const formData = {
            firstName: document.getElementById('b-firstName').value,
            lastName: document.getElementById('b-lastName').value,
            email: document.getElementById('b-email').value,
            phone: document.getElementById('b-phone').value,
            selectedTime: this.slotInput.value,
            inviteToken: this.inviteToken,
            inviteMode: this.inviteMode
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
            showToast('Fast geschafft! Bitte bestätige den Link in deinen E-Mails.');
            this.form.reset();
            this.picker.reset();
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

class BookingPicker {
    constructor(container, timeSelect, onSelect) {
        this.container = container;
        this.timeSelect = timeSelect;
        this.onSelect = onSelect;
        this.daysTrack = container.querySelector('#daysTrack');
        this.monthSelector = container.querySelector('.month-selector');

        this.monthsAvailable = [];
        this.availableSlots = [];
        this.selectedDateStr = null;

        // Physics/Dragging State
        this.isDragging = false;
        this.startX = 0;
        this.scrollLeftStart = 0;
        this.isSnapping = false;
        this.snapCooldown = false;
        this.statusEl = document.getElementById('booking-picker-status');

        this.init();
    }

    init() {
        if (this.monthSelector) {
            this.monthSelector.setAttribute('role', 'button');
            this.monthSelector.setAttribute('tabindex', '0');
            this.monthSelector.setAttribute('aria-label', 'Nächsten Monat anzeigen');

            // We treat any "drag attempt" (mousedown followed by mouseup) as a click
            // to simulate a vertical scroll interaction without full physics.
            this.monthSelector.addEventListener('mouseup', (e) => {
                this.toggleMonth();
            });

            this.monthSelector.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent ghost clicks
                this.toggleMonth();
            });

            // Block standard click to prevent double execution with mouseup
            this.monthSelector.addEventListener('click', (e) => e.preventDefault());

            // Add Enter / Space key support for month selection
            this.monthSelector.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleMonth();
                }
            });
        }

        // Native CSS Snap DAUERHAFT deaktivieren, da wir nun 100% JS Magnet-LERP nutzen!
        this.daysTrack.style.scrollSnapType = 'none';

        // Keyboard navigation for the thumbwheel track
        this.daysTrack.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateDays(-1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateDays(1);
            }
        });

        let scrollEndTimeout = null;

        // Native Scroll Listener for updating UI dynamically
        this.daysTrack.addEventListener('scroll', () => {
            this.updateWheelRotation();
            if (!this.isDragging && !this.isSnapping && !this.snapCooldown) {
                this.detectCenterDay();

                // Debounce: Erkennt, wann die native "Schwungkraft" des iPhones endet
                clearTimeout(scrollEndTimeout);
                scrollEndTimeout = setTimeout(() => {
                    if (!this.isDragging && !this.isSnapping && !this.snapCooldown) {
                        const closest = this.detectCenterDay();
                        if (closest) {
                            this.scrollToItem(closest); // Magnetischer JS-Snap!
                        }
                    }
                }, 150);
            }
        });

        // Stoppt den JS-Snap sofort, wenn der Nutzer wieder auf das Display tippt
        this.daysTrack.addEventListener('touchstart', () => {
            cancelAnimationFrame(this.scrollRaf);
            this.isSnapping = false;
        }, { passive: true });

        this.daysTrack.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only primary mouse button
            this.isDragging = true;
            cancelAnimationFrame(this.scrollRaf); // Stop ongoing snap
            this.isSnapping = false;

            this.startX = e.pageX - this.daysTrack.offsetLeft;
            this.scrollLeftStart = this.daysTrack.scrollLeft;

            this.daysTrack.style.scrollBehavior = 'auto';
            this.daysTrack.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault(); // Prevent text selection

            const x = e.pageX - this.daysTrack.offsetLeft;
            const walk = (x - this.startX) * 1.5; // Drag speed multiplier
            this.daysTrack.scrollLeft = this.scrollLeftStart - walk;

            this.detectCenterDay();
        });

        const stopDragging = () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            this.daysTrack.style.cursor = 'grab';

            // Sofort JS-Magnet einrasten lassen
            const closest = this.detectCenterDay();
            if (closest) {
                this.scrollToItem(closest);
            }
        };

        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('mouseleave', stopDragging);

        this.timeSelect.addEventListener('change', () => {
            this.onSelect(this.timeSelect.value);
        });
    }

    navigateDays(direction) {
        const items = Array.from(this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)'));
        if (items.length === 0) return;

        const currentActive = this.daysTrack.querySelector('.thumbwheel-item.active');
        let index = items.indexOf(currentActive);

        if (index === -1) {
            index = 0;
        } else {
            index = Math.max(0, Math.min(items.length - 1, index + direction));
        }

        const targetItem = items[index];
        if (targetItem) {
            this.scrollToItem(targetItem);
        }
    }

    announceSelection(dateStr) {
        if (!this.statusEl || !dateStr) return;
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const readableDate = dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        this.statusEl.textContent = `Ausgewähltes Datum: ${readableDate}`;
    }

    async loadSlots() {
        this.timeSelect.disabled = true;
        this.timeSelect.innerHTML = '<option value="">Lade...</option>';

        try {
            if (GAS_WEB_APP_URL) {
                const response = await fetch(`${GAS_WEB_APP_URL}?action=getSlots`);
                this.availableSlots = await response.json();
            } else {
                this.availableSlots = this.generateSimulatedSlots();
            }
            this.renderDays();
        } catch (err) {
            console.error(err);
            this.timeSelect.innerHTML = '<option value="">Fehler</option>';
        }
    }

    generateSimulatedSlots() {
        const slots = [];
        const now = new Date();
        for (let i = 1; i < 60; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            if (d.getDay() === 0 || d.getDay() === 6) continue;
            if (Math.random() > 0.6) continue;
            [10, 14, 16].forEach(h => {
                const s = new Date(d);
                s.setHours(h, 0, 0, 0);
                slots.push(s.toISOString());
            });
        }
        return slots;
    }

    renderDays() {
        this.daysTrack.innerHTML = '';
        this.daysTrack.setAttribute('role', 'listbox');
        this.daysTrack.setAttribute('aria-label', 'Datum auswählen');

        this.timeSelect.disabled = true;
        this.timeSelect.innerHTML = '<option value="" disabled selected>Uhrzeit...</option>';
        this.onSelect(null);

        this.monthsAvailable = [];
        const now = new Date();
        const trackItems = [];

        for (let i = 0; i < 40; i++) {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            // Handle timezone cleanly
            const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const hasSlots = this.availableSlots.some(s => s.startsWith(dateStr));

            if (hasSlots) {
                trackItems.push({ date, dateStr, isDummy: false });

                const monthStr = date.toLocaleDateString('de-DE', { month: 'long' });
                const monthYearStr = dateStr.substring(0, 7); // YYYY-MM

                if (!this.monthsAvailable.some(m => m.name === monthStr)) {
                    this.monthsAvailable.push({
                        name: monthStr,
                        yearMonth: monthYearStr
                    });
                }
            }
        }

        if (trackItems.length === 0) {
            this.daysTrack.innerHTML = '<div style="padding: 1rem; font-size: 0.8rem; color: var(--text-lighter);">Keine Termine</div>';
            return;
        }

        // Add 3 dummy days at the start
        const firstDate = trackItems[0].date;
        for (let i = 1; i <= 3; i++) {
            const d = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() - i);
            trackItems.unshift({ date: d, isDummy: true });
        }

        // Add 3 dummy days at the end
        const lastDate = trackItems[trackItems.length - 1].date;
        for (let i = 1; i <= 3; i++) {
            const d = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + i);
            trackItems.push({ date: d, isDummy: true });
        }

        trackItems.forEach(item => {
            const dayEl = document.createElement('div');
            dayEl.className = 'thumbwheel-item';

            if (item.isDummy) {
                dayEl.classList.add('disabled');
                dayEl.setAttribute('aria-hidden', 'true');
            } else {
                dayEl.dataset.date = item.dateStr;
                dayEl.dataset.month = item.dateStr.substring(0, 7);
                dayEl.addEventListener('click', () => this.scrollToItem(dayEl));
                dayEl.setAttribute('role', 'option');
                dayEl.setAttribute('tabindex', '-1');
                dayEl.setAttribute('aria-selected', 'false');

                // Readably formatted date for screen reader, e.g. "Montag, 18. Mai"
                const readable = item.date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
                dayEl.setAttribute('aria-label', readable);
            }

            dayEl.innerHTML = `
                <span class="day-name" aria-hidden="true">${item.date.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                <span class="day-num" aria-hidden="true">${item.date.getDate()}</span>
            `;

            this.daysTrack.appendChild(dayEl);
        });

        // Initialize Month Selector
        if (this.monthSelector) {
            this.updateMonthSelector();
        }

        // Initial detection
        setTimeout(() => {
            const firstActive = this.daysTrack.querySelector('.thumbwheel-item:not(.disabled)');
            if (firstActive) {
                this.scrollToItem(firstActive);
            }
            this.updateWheelRotation();
            this.detectCenterDay();
            updateOverlayHeights();
        }, 100);
    }

    updateMonthSelector() {
        if (!this.monthSelector) return;

        // Current selection or first available or actual current month
        let baseDate;
        if (this.selectedDateStr) {
            const [y, m] = this.selectedDateStr.split('-').map(Number);
            baseDate = new Date(y, m - 1, 1);
        } else if (this.monthsAvailable.length > 0) {
            const [y, m] = this.monthsAvailable[0].yearMonth.split('-').map(Number);
            baseDate = new Date(y, m - 1, 1);
        } else {
            const now = new Date();
            baseDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const prevDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
        const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

        const getShort = (date) => date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');

        this.monthSelector.innerHTML = `
            <span class="month-label">${getShort(prevDate)}</span>
            <span class="month-label month-label--current">${getShort(baseDate)}</span>
            <span class="month-label">${getShort(nextDate)}</span>
        `;
    }

    toggleMonth() {
        if (!this.monthsAvailable || this.monthsAvailable.length <= 1) {
            this.monthSelector.classList.add('month-selector--bounce');
            setTimeout(() => {
                this.monthSelector.classList.remove('month-selector--bounce');
            }, 650);
            return;
        }

        const currentMonthYear = this.selectedDateStr ? this.selectedDateStr.substring(0, 7) : this.monthsAvailable[0].yearMonth;
        let currentIndex = this.monthsAvailable.findIndex(m => m.yearMonth === currentMonthYear);

        let nextIndex = (currentIndex + 1) % this.monthsAvailable.length;
        const targetMonthYear = this.monthsAvailable[nextIndex].yearMonth;

        const firstDayOfMonth = this.daysTrack.querySelector(`.thumbwheel-item[data-month="${targetMonthYear}"]:not(.disabled)`);
        if (firstDayOfMonth) {
            this.scrollToItem(firstDayOfMonth);
        }
    }

    scrollToItem(item) {
        this.isSnapping = true;

        // Optimistic UI update for immediate feedback
        const items = this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)');
        items.forEach(i => {
            i.classList.remove('active');
            i.setAttribute('aria-selected', 'false');
        });
        item.classList.add('active');
        item.setAttribute('aria-selected', 'true');

        const dateStr = item.dataset.date;
        if (this.selectedDateStr !== dateStr) {
            this.selectedDateStr = dateStr;
            this.announceSelection(dateStr);
            this.updateTimes(dateStr);

            const monthYear = item.dataset.month;
            if (this.monthSelector && monthYear) {
                this.updateMonthSelector();
            }
        }

        cancelAnimationFrame(this.scrollRaf);

        const animateScroll = () => {
            const trackRect = this.daysTrack.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();
            const currentOffset = (itemRect.left + itemRect.width / 2) - (trackRect.left + trackRect.width / 2);

            // Wenn wir fast perfekt in der Mitte sind
            if (Math.abs(currentOffset) < 0.5) {
                this.isSnapping = false;

                // Kurzer Cooldown verhindert, dass der Scroll-Event sofort erneut scrollToItem feuert
                this.snapCooldown = true;
                setTimeout(() => { this.snapCooldown = false; }, 200);

                this.updateWheelRotation();
                this.detectCenterDay();
                return;
            }

            // Smooth Scroll (LERP) - passt sich dynamisch an veränderte Breiten an!
            let step = currentOffset * 0.15;
            const minStep = Math.sign(currentOffset) * 1.0;
            if (Math.abs(step) < Math.abs(minStep)) step = minStep;

            this.daysTrack.scrollLeft += step;
            this.scrollRaf = requestAnimationFrame(animateScroll);
        };

        this.scrollRaf = requestAnimationFrame(animateScroll);
    }

    updateWheelRotation() {
        const trackWidth = this.daysTrack.offsetWidth;
        const scrollLeft = this.daysTrack.scrollLeft;
        const scrollCenter = scrollLeft + (trackWidth / 2);
        const maxDistance = trackWidth / 1.8;

        const items = Array.from(this.daysTrack.querySelectorAll('.thumbwheel-item'));

        // 1. Lese-Phase: Alle Layout-Werte sammeln (Verhindert Layout Thrashing!)
        const itemMetrics = items.map(item => {
            return {
                item,
                itemCenter: item.offsetLeft + (item.offsetWidth / 2)
            };
        });

        // 2. Schreib-Phase: CSS Variablen aktualisieren
        itemMetrics.forEach(({ item, itemCenter }) => {
            const offset = itemCenter - scrollCenter;

            let normalizedOffset = offset / maxDistance;
            normalizedOffset = Math.max(-1, Math.min(1, normalizedOffset));

            const sign = Math.sign(normalizedOffset);
            // Non-linear easing: rotation steps get larger closer to the edge
            const easing = Math.pow(Math.abs(normalizedOffset), 1.5);
            const angle = sign * easing * 70;

            // Size scaling (visual size of the content)
            const visualScale = 1 - (easing * 0.3); // Drops to 0.7

            // Layout width scaling (to counteract the 3D rotateY spreading them apart)
            // Rotating by 'angle' squashes visual width by exactly cos(angle).
            // We apply this exact mathematical ratio to the physical width to keep them tight!
            const radians = Math.abs(angle) * (Math.PI / 180);
            let widthScale = Math.cos(radians);
            // Pack them slightly tighter at the edges by multiplying widthScale slightly if needed,
            // but cos(angle) is usually perfect.

            // We apply a minimum width scale so they don't vanish completely
            widthScale = Math.max(0.2, widthScale);

            item.style.setProperty('--wheel-rotate', `${angle}deg`);
            item.style.setProperty('--wheel-scale', visualScale);
            item.style.setProperty('--wheel-width-scale', widthScale);
        });
    }

    detectCenterDay() {
        const trackWidth = this.daysTrack.offsetWidth;
        const scrollCenter = this.daysTrack.scrollLeft + (trackWidth / 2);

        let closestItem = null;
        let minDistance = Infinity;

        const items = Array.from(this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)'));

        // 1. Lese-Phase
        const itemMetrics = items.map(item => {
            return {
                item,
                itemCenter: item.offsetLeft + (item.offsetWidth / 2)
            };
        });

        // 2. Schreib-Phase
        itemMetrics.forEach(({ item, itemCenter }) => {
            const distance = Math.abs(scrollCenter - itemCenter);

            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            closestItem.classList.add('active');
            closestItem.setAttribute('aria-selected', 'true');
            const dateStr = closestItem.dataset.date;
            if (this.selectedDateStr !== dateStr) {
                this.selectedDateStr = dateStr;
                this.announceSelection(dateStr);
                this.updateTimes(dateStr);

                // Update month selector
                const monthYear = closestItem.dataset.month;
                if (this.monthSelector && monthYear) {
                    this.updateMonthSelector();
                }
            }
        }
        return closestItem;
    }

    updateTimes(dateStr) {
        const daySlots = this.availableSlots.filter(s => s.startsWith(dateStr));
        this.timeSelect.innerHTML = '<option value="" disabled selected>Uhrzeit...</option>';

        if (daySlots.length === 0) {
            this.timeSelect.disabled = true;
            this.timeSelect.innerHTML = '<option value="">Keine Termine</option>';
            return;
        }

        daySlots.sort().forEach(slotIso => {
            const date = new Date(slotIso);
            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const option = document.createElement('option');
            option.value = slotIso;
            option.textContent = timeStr;
            this.timeSelect.appendChild(option);
        });

        this.timeSelect.disabled = false;
        this.onSelect(null);

        // Ensure icon is back to chevron when times are updated
        const selectIcon = this.timeSelect.parentElement.querySelector('.select-wrapper__icon');
        selectIcon?.classList.replace('fa-clock', 'fa-chevron-down');
    }

    reset() {
        this.selectedDateStr = null;
        this.loadSlots();
    }
}
