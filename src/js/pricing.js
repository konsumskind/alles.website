
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
                            "1": 180,
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
                        "max": 3,
                        "step": 1,
                        "default": 1
                    },
                    "prices": {
                        "baseScale": {
                            "1": 490,
                            "2": 595
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
        this.bindEvents();
        this.updateAll();
    }

    bindEvents() {
        this.offers.forEach(offer => {
            const suffix = offer.id.replace('offer-', '');

            if (offer.type === 'session') {
                const toggle = document.querySelector(`[data-target="people-${suffix}"]`);
                const slider = document.getElementById(`sessions-${suffix}`);

                if (toggle) {
                    toggle.addEventListener('change', () => this.updateSessionOffer(offer, suffix));
                }
                if (slider) {
                    slider.addEventListener('input', (e) => {
                        const valEl = document.getElementById(`sessions-val-${suffix}`);
                        if (valEl) valEl.innerHTML = `${e.target.value}<span> Sitzungen</span>`;
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
            sessionValEl.innerHTML = `${sessions}<span>${suffixText}</span>`;
        }

        // Discount Logic
        let discount = 0;
        if (sessions >= 5) discount = 0.10;
        else if (sessions >= 3 && suffix === 'fokus') discount = 0.05;
        else if (sessions >= 3 && suffix === 'deep') discount = 0.10;

        // Total Package Price
        let total = (basePrice * sessions) * (1 - discount);

        // Per Session Price (effective)
        let perSession = total / sessions;

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
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }
}
