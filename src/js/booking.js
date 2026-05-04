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

        document.addEventListener('openBookingForm', () => {
            this.picker.loadSlots();
        });

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
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.slotInput.value) {
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
            selectedTime: this.slotInput.value
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
        this.monthBtns = [];

        this.monthsAvailable = [];
        this.availableSlots = [];
        this.selectedDateStr = null;

        // Physics/Dragging State
        this.isDragging = false;
        this.startX = 0;
        this.scrollLeftStart = 0;
        this.velocity = 0;
        this.lastX = 0;
        this.lastTime = 0;
        this.physicsRaf = null;
        this.isSnapping = false;

        this.init();
    }

    init() {
        if (this.monthSelector) {
            this.monthSelector.style.cursor = 'pointer';
            this.monthSelector.addEventListener('click', () => this.toggleMonth());
        }

        // Event Listeners for Thumbwheel
        this.daysTrack.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.daysTrack.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });
        this.daysTrack.addEventListener('scroll', () => {
            if (!this.isDragging && !this.isSnapping) {
                this.detectCenterDay();
            }
        });

        window.addEventListener('mousemove', (e) => this.onDragMove(e));
        window.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: false });

        window.addEventListener('mouseup', () => this.onDragEnd());
        window.addEventListener('touchend', () => this.onDragEnd());

        this.timeSelect.addEventListener('change', () => {
            this.onSelect(this.timeSelect.value);
        });
    }

    onDragStart(e) {
        this.isDragging = true;
        this.isSnapping = false;
        this.startX = this.getX(e);
        this.scrollLeftStart = this.daysTrack.scrollLeft;
        this.velocity = 0;
        this.lastX = this.startX;
        this.lastTime = Date.now();
        cancelAnimationFrame(this.physicsRaf);
        this.daysTrack.style.scrollSnapType = 'none';
        this.daysTrack.style.scrollBehavior = 'auto';
    }

    onDragMove(e) {
        if (!this.isDragging) return;

        const x = this.getX(e);
        const now = Date.now();
        const dt = now - this.lastTime;
        const dx = x - this.lastX;

        if (dt > 0) {
            this.velocity = -dx / dt; // Invert because we pull
        }

        this.daysTrack.scrollLeft = this.scrollLeftStart - (x - this.startX);
        this.lastX = x;
        this.lastTime = now;
        this.detectCenterDay();
    }

    onDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (Math.abs(this.velocity) > 0.1) {
            this.applyPhysics();
        } else {
            this.snapToCenter();
        }
    }

    applyPhysics() {
        const friction = 0.95;
        this.velocity *= friction;
        
        const previousScroll = this.daysTrack.scrollLeft;
        this.daysTrack.scrollLeft += this.velocity * 16;
        const newScroll = this.daysTrack.scrollLeft;

        this.detectCenterDay();

        // Check if the browser clamped the scroll (we hit the physical end of the track)
        // If so, we should abort the inertia so it bounces back immediately, instead of "hanging".
        const hitWall = Math.abs(this.velocity * 16) > 0.5 && previousScroll === newScroll;

        if (Math.abs(this.velocity) > 0.1 && !hitWall) {
            this.physicsRaf = requestAnimationFrame(() => this.applyPhysics());
        } else {
            // If we hit the wall, kill the momentum so the spring doesn't fight against it
            if (hitWall) this.velocity = 0;
            this.snapToCenter();
        }
    }

    animateToScroll(targetScroll, initialVelocity = 0) {
        this.daysTrack.style.scrollBehavior = 'auto';
        this.daysTrack.style.scrollSnapType = 'none';

        const spring = 0.08;
        const friction = 0.82;
        let vel = initialVelocity;
        let currentScroll = this.daysTrack.scrollLeft;
        
        cancelAnimationFrame(this.physicsRaf);

        const loop = () => {
            const distance = targetScroll - currentScroll;
            vel += distance * spring;
            vel *= friction;
            
            currentScroll += vel;
            this.daysTrack.scrollLeft = currentScroll;

            if (Math.abs(distance) > 0.5 || Math.abs(vel) > 0.5) {
                this.physicsRaf = requestAnimationFrame(loop);
            } else {
                this.daysTrack.scrollLeft = targetScroll;
                this.daysTrack.style.scrollSnapType = 'x mandatory';
                this.isSnapping = false;
                this.detectCenterDay();
            }
        };

        loop();
    }

    snapToCenter() {
        this.isSnapping = true;
        const items = Array.from(this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)'));
        const trackRect = this.daysTrack.getBoundingClientRect();
        const centerX = trackRect.left + trackRect.width / 2;

        let closestItem = null;
        let minDistance = Infinity;

        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(centerX - itemCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            const itemRect = closestItem.getBoundingClientRect();
            const offset = (itemRect.left + itemRect.width / 2) - centerX;
            const targetScroll = this.daysTrack.scrollLeft + offset;
            
            // Pass the current velocity from the manual swipe to continue the momentum into the bounce
            const initialVelocity = (this.velocity || 0) * 16;
            this.animateToScroll(targetScroll, initialVelocity);
        } else {
            this.isSnapping = false;
        }
    }

    getX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
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
            } else {
                dayEl.dataset.date = item.dateStr;
                dayEl.dataset.month = item.dateStr.substring(0, 7);
                dayEl.addEventListener('click', () => this.scrollToItem(dayEl));
            }
            
            dayEl.innerHTML = `
                <span class="day-name">${item.date.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                <span class="day-num">${item.date.getDate()}</span>
            `;

            this.daysTrack.appendChild(dayEl);
        });

        // Initialize Month Buttons
        if (this.monthSelector) {
            this.monthSelector.innerHTML = '';
            this.monthBtns = [];
            
            // Only create buttons for unique short month names
            const processedMonths = new Set();
            
            this.monthsAvailable.forEach((monthObj, index) => {
                // Determine short name (e.g. "Mai", "Jun") for compact display like before
                const shortName = new Date(monthObj.yearMonth + "-01").toLocaleDateString('de-DE', { month: 'short' });
                
                if (processedMonths.has(shortName)) return;
                processedMonths.add(shortName);

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = index === 0 ? 'month-btn active' : 'month-btn';
                btn.textContent = shortName;
                btn.dataset.monthYear = monthObj.yearMonth;
                btn.style.pointerEvents = 'none'; // Click goes to parent container
                
                this.monthSelector.appendChild(btn);
                this.monthBtns.push(btn);
            });
        }

        // Initial detection
        setTimeout(() => {
            const firstActive = this.daysTrack.querySelector('.thumbwheel-item:not(.disabled)');
            if (firstActive) {
                this.scrollToItem(firstActive);
            }
            this.detectCenterDay();
        }, 100);
    }

    toggleMonth() {
        if (!this.monthBtns || this.monthBtns.length <= 1) return;
        
        let currentIndex = this.monthBtns.findIndex(btn => btn.classList.contains('active'));
        if (currentIndex === -1) currentIndex = 0;
        
        let nextIndex = (currentIndex + 1) % this.monthBtns.length;
        const targetMonthYear = this.monthBtns[nextIndex].dataset.monthYear;
        
        const firstDayOfMonth = this.daysTrack.querySelector(`.thumbwheel-item[data-month="${targetMonthYear}"]:not(.disabled)`);
        if (firstDayOfMonth) {
            this.scrollToItem(firstDayOfMonth);
        }
    }

    scrollToItem(item) {
        this.isSnapping = true;

        // Optimistic UI update for immediate feedback
        const items = this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)');
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const dateStr = item.dataset.date;
        if (this.selectedDateStr !== dateStr) {
            this.selectedDateStr = dateStr;
            this.updateTimes(dateStr);
            
            const monthYear = item.dataset.month;
            if (this.monthBtns && monthYear) {
                this.monthBtns.forEach(btn => {
                    if (btn.dataset.monthYear === monthYear) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
        }

        const trackRect = this.daysTrack.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const scrollOffset = (itemRect.left + itemRect.width / 2) - (trackRect.left + trackRect.width / 2);
        const targetScroll = this.daysTrack.scrollLeft + scrollOffset;
        
        this.animateToScroll(targetScroll, 0);
    }

    detectCenterDay() {
        const trackRect = this.daysTrack.getBoundingClientRect();
        const centerX = trackRect.left + trackRect.width / 2;

        let closestItem = null;
        let minDistance = Infinity;

        const items = this.daysTrack.querySelectorAll('.thumbwheel-item:not(.disabled)');
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const distance = Math.abs(centerX - itemCenter);

            item.classList.remove('active');
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });

        if (closestItem) {
            closestItem.classList.add('active');
            const dateStr = closestItem.dataset.date;
            if (this.selectedDateStr !== dateStr) {
                this.selectedDateStr = dateStr;
                this.updateTimes(dateStr);
                
                // Update month buttons
                const monthYear = closestItem.dataset.month;
                if (this.monthBtns && monthYear) {
                    this.monthBtns.forEach(btn => {
                        if (btn.dataset.monthYear === monthYear) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            }
        }
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
