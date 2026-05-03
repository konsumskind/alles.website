
export class OfferConfigurator {
    constructor() {
        // Hardcoded offers data from offers.json
        this.offers = [
            {
                "id": "offer-fokus",
                "type": "session",
                "badge": {
                    "text": "Fokus",
                    "style": "primary"
                },
                "title": "Die Einzelsitzung",
                "subtitle": "Wir analysieren die Situation, strukturieren komplexe Gedanken und erarbeiten konkrete Handlungsoptionen für den Alltag.",
                "config": {
                    "duration": 90,
                    "location": "Online / Atelier",
                    "peopleToggle": true,
                    "sessions": {
                        "min": 1,
                        "max": 5,
                        "step": 1,
                        "default": 1
                    },
                    "prices": {
                        "baseScale": {
                            "1": 170,
                            "2": 220
                        },
                        "unit": "€",
                        "perLabel": "Sitzung"
                    }
                }
            },
            {
                "id": "offer-deep-dive",
                "type": "session",
                "badge": {
                    "text": "Deep Dive",
                    "style": "secondary"
                },
                "title": "Intensiv-Sitzung",
                "subtitle": "Kompaktes Format (halber Tag) für Themen mit hoher Dringlichkeit oder Komplexität. Ermöglicht die tiefe Bearbeitung von Blockaden, akute Krisenintervention oder Entscheidungsfindung am Stück.",
                "config": {
                    "duration": "3.5 Stunden",
                    "location": "Online / Atelier",
                    "peopleToggle": true,
                    "sessions": {
                        "min": 1,
                        "max": 2,
                        "step": 1,
                        "default": 1
                    },
                    "prices": {
                        "baseScale": {
                            "1": 360,
                            "2": 480
                        },
                        "unit": "€",
                        "perLabel": "Sitzung"
                    }
                }
            },
            {
                "id": "offer-mediation",
                "type": "time",
                "badge": {
                    "text": "Klärung",
                    "style": "blue"
                },
                "title": "Mediation",
                "subtitle": "Konfliktmoderation für Paare oder Geschäftspartner. Als allparteilicher Dritter leite ich das Gespräch, um die Kommunikation wiederherzustellen und tragfähige, verbindliche Vereinbarungen zu erarbeiten.",
                "config": {
                    "location": "Online / Atelier",
                    "durationSlider": {
                        "min": 60,
                        "max": 120,
                        "step": 15,
                        "default": 60
                    },
                    "prices": {
                        "ratePerMin": 2.5,
                        "unit": "€",
                        "perLabel": "Partei",
                        "split": 2
                    }
                }
            }
        ];
        this.init();
    }

    init() {
        this.generateSliderTicks();
        this.bindEvents();
        this.updateAll();
    }

    generateSliderTicks() {
        const sliders = document.querySelectorAll('.configurator__slider');
        sliders.forEach(slider => {
            const wrapper = slider.closest('.slider-wrapper');
            if (wrapper) {
                const ticksContainer = wrapper.querySelector('.slider-ticks');
                if (ticksContainer) {
                    ticksContainer.innerHTML = '';
                    const min = parseInt(slider.min) || 0;
                    const max = parseInt(slider.max) || 100;
                    const step = parseInt(slider.step) || 1;
                    const stepsCount = Math.floor((max - min) / step) + 1;

                    for (let i = 0; i < stepsCount; i++) {
                        const tick = document.createElement('span');
                        ticksContainer.appendChild(tick);
                    }
                }
            }
        });
    }

    bindEvents() {
        this.offers.forEach(offer => {
            const suffix = offer.id.replace('offer-', '');

            if (offer.type === 'session') {
                const toggle = document.querySelector(`[data-target="people-${suffix}"]`);
                const packageToggle = document.querySelector(`[data-target="package-${suffix}"]`);
                const slider = document.getElementById(`sessions-${suffix}`);

                if (toggle) {
                    toggle.addEventListener('change', () => this.updateSessionOffer(offer, suffix));
                }
                if (packageToggle) {
                    packageToggle.addEventListener('change', (e) => {
                        const isPackage = e.target.checked;
                        if (isPackage) {
                            let val = parseInt(slider.value);
                            let target = val;
                            if (suffix === 'fokus') {
                                if (val < 4) target = 3;
                                else target = 5;
                            } else if (suffix === 'deep-dive') {
                                target = 2;
                            }

                            if (val !== target) {
                                this.animateSliderValue(slider, target, suffix);
                            } else {
                                this.updateSessionOffer(offer, suffix);
                            }
                            slider.dataset.prevValue = target;
                        } else {
                            this.updateSessionOffer(offer, suffix);
                        }
                    });
                }
                if (slider) {
                    slider.dataset.prevValue = slider.value;
                    slider.addEventListener('input', (e) => {
                        const isPackage = packageToggle?.checked;
                        if (isPackage) {
                            let val = parseInt(e.target.value);
                            let prev = parseInt(slider.dataset.prevValue || 3);

                            if (suffix === 'fokus') {
                                if (val < 4) val = 3;
                                else if (val > 4) val = 5;
                                else if (val === 4) {
                                    val = (prev < 4) ? 5 : 3;
                                }
                            } else if (suffix === 'deep-dive') {
                                val = 2;
                            }
                            e.target.value = val;
                        }
                        slider.dataset.prevValue = e.target.value;
                        this.updateSessionOffer(offer, suffix);
                    });
                }

            } else if (offer.type === 'time') {
                const slider = document.getElementById(`duration-${suffix}`);
                if (slider) {
                    slider.addEventListener('input', (e) => {
                        const val = e.target.value;
                        const valEl = document.getElementById(`duration-val-${suffix}`);
                        if (valEl) valEl.textContent = `${val} min`;
                        this.updateTimeOffer(offer, suffix);
                    });
                }
            }
        });
    }

    updateAll() {
        this.offers.forEach(offer => {
            const suffix = offer.id.replace('offer-', '');
            if (offer.type === 'session') {
                this.updateSessionOffer(offer, suffix);
            } else if (offer.type === 'time') {
                this.updateTimeOffer(offer, suffix);
            }
        });
    }

    updateSessionOffer(offer, suffix) {
        const toggleEl = document.querySelector(`[data-target="people-${suffix}"]`);
        const isTwoPeople = toggleEl?.checked;
        const packageToggleEl = document.querySelector(`[data-target="package-${suffix}"]`);
        const isPackage = packageToggleEl?.checked;
        const sessionsInput = document.getElementById(`sessions-${suffix}`);
        if (!sessionsInput) return;

        const sessions = parseInt(sessionsInput.value || 1);
        const prices = offer.config.prices;
        const basePrice = isTwoPeople ? (prices.baseScale['2'] || 0) : prices.baseScale['1'];

        // Update Person Label
        const personLabel = document.getElementById(`people-val-${suffix}`);
        if (personLabel) {
            personLabel.textContent = isTwoPeople ? '2 Personen' : '1 Person';
        }

        // Update Session Label
        const sessionValEl = document.getElementById(`sessions-val-${suffix}`);
        if (sessionValEl) {
            const label = offer.config.prices.perLabel === 'Sitzung' ? ' Sitzung' : 'Einheit';
            const suffixText = sessions === 1 ? label : label + 'en'; // simple plural
            const modeText = isPackage ? ' Pkt' : '';
            sessionValEl.innerHTML = `${sessions}<span>${suffixText}${modeText}</span>`;
        }

        // Discount Logic
        let total = 0;
        let currentDiscount = 0;
        if (isPackage) {
            let packageDiscount = 0;
            if (sessions >= 5) packageDiscount = 0.136;
            else if (sessions >= 3 && suffix === 'fokus') packageDiscount = 0.10;
            else if (sessions >= 2 && suffix === 'deep-dive') packageDiscount = 0.136;

            currentDiscount = packageDiscount;
            total = (basePrice * sessions) * (1 - packageDiscount);
        } else {
            for (let i = 1; i <= sessions; i++) {
                let sessionDiscount = 0;
                if (i >= 6) sessionDiscount = 0.136;
                else if (i >= 4 && suffix === 'fokus') sessionDiscount = 0.10;
                else if (i >= 3 && suffix === 'deep-dive') sessionDiscount = 0.136;

                currentDiscount = sessionDiscount;
                total += basePrice * (1 - sessionDiscount);
            }
        }

        // Per Session Price (effective for the current session)
        let perSession = basePrice * (1 - currentDiscount);

        // Update Total
        this.animatePrice(`price-total-${suffix}`, Math.round(total));

        // Update Per Session Label
        const perSessionEl = document.getElementById(`price-per-session-${suffix}`);
        if (perSessionEl) {
            perSessionEl.textContent = Math.round(perSession);
        }
    }

    updateTimeOffer(offer, suffix) {
        const slider = document.getElementById(`duration-${suffix}`);
        if (!slider) return;

        const duration = parseInt(slider.value || offer.config.durationSlider.default);
        const rate = offer.config.prices.ratePerMin;
        const total = duration * rate;
        const perParty = total / (offer.config.prices.split || 1);

        this.animatePrice(`price-total-${suffix}`, Math.round(total));

        const perPartyEl = document.getElementById(`price-per-partei-${suffix}`);
        if (perPartyEl) {
            if (perParty % 1 === 0) {
                perPartyEl.textContent = perParty;
            } else {
                perPartyEl.textContent = perParty.toFixed(2).replace('.', ',');
            }
        }
    }

    animatePrice(elementId, endValue) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (el.animationId) {
            cancelAnimationFrame(el.animationId);
        }

        let startValue = parseInt(el.textContent);
        if (isNaN(startValue)) startValue = 0;

        if (startValue === endValue) return;

        const duration = 500;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);

            const current = Math.round(startValue + (endValue - startValue) * ease);
            el.textContent = current;

            if (progress < 1) {
                el.animationId = requestAnimationFrame(step);
            }
        };

        el.animationId = requestAnimationFrame(step);
    }

    animateSliderValue(slider, targetValue, suffix) {
        let startValue = parseFloat(slider.value);
        if (startValue === targetValue) return;

        const offer = this.offers.find(o => o.id === `offer-${suffix}`);
        const duration = 300;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            const current = startValue + (targetValue - startValue) * ease;
            slider.value = current;

            if (offer) {
                this.updateSessionOffer(offer, suffix);
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                slider.value = targetValue;
                if (offer) this.updateSessionOffer(offer, suffix);
            }
        };

        requestAnimationFrame(step);
    }
}
