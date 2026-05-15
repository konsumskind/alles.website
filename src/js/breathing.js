
import { showToast } from './utils.js';
import { GeminiService } from './services/gemini.js';
import { calculateBreathStats, generateStaticFeedback } from './breathing-utils.js';

export class BreathExercise {
    constructor() {
        this.elements = {
            circle: document.getElementById('breathCircle'),
            text: document.getElementById('breathText'),
            btn: document.getElementById('breathBtn'),
            container: document.querySelector('.breath-container'),
            intro: document.querySelector('#atmung .block-text'),
            hint: document.getElementById('breathHint'),
            controlsExtra: document.getElementById('breathControlsExtra'),
            shareBtn: document.getElementById('shareBtn'),
            dotsContainer: document.getElementById('breathDots')
        };

        if (this.elements.intro) {
            this.originalIntro = this.elements.intro.innerHTML;
        }

        this.gemini = new GeminiService();
        this.state = 'IDLE'; // IDLE, CALIBRATION_READY, CALIBRATION_ACTIVE, GUIDANCE, FINISHED

        this.calibrationData = {
            startTime: 0,
            cycles: [], // { in: ms, out: ms }
            currentInStart: 0,
            currentOutStart: 0
        };

        this.guidanceConfig = {
            targetCycles: 4,
            currentCycle: 0,
            avgIn: 0,
            avgOut: 0
        };

        this.boundHandlers = {
            start: this.handleStart.bind(this),
            press: this.handlePress.bind(this),
            release: this.handleRelease.bind(this),
            pressTouch: (e) => { e.preventDefault(); this.handlePress(e); },
            releaseTouch: (e) => { e.preventDefault(); this.handleRelease(e); },
            popstate: this.handlePopState.bind(this),
            keydown: this.handleKeydown.bind(this)
        };

        this.restartHandler = null;

        this.init();
        if (this.elements.circle) this.elements.circle.classList.add('idle-breathing');
    }

    init() {
        if (this.elements.btn) {
            this.elements.btn.addEventListener('click', this.boundHandlers.start);
        }
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', () => this.shareApp());
        }
        window.addEventListener('popstate', this.boundHandlers.popstate);
        document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    shareApp() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'Janosch Kartschall - Breath Core',
                text: 'Entspanne dich mit der Breath Core Atemübung.',
                url: url
            }).catch(() => { });
        } else {
            try {
                navigator.clipboard.writeText(url);
                showToast("Link kopiert!");
            } catch (err) {
                alert('Teilen ist in diesem Browser nicht verfügbar.');
            }
        }
    }

    handleStart() {
        if (this.state === 'IDLE') {
            this.startCalibration();
        } else {
            // Instead of calling reset() directly, we go back in history.
            // This will trigger the popstate listener which then calls reset().
            history.back();
        }
    }

    updateDots(activeIndex) {
        const dots = document.querySelectorAll('.breath-dots .dot');
        dots.forEach((dot, i) => {
            dot.classList.remove('active', 'completed');
            if (i < activeIndex) dot.classList.add('completed');
            if (i === activeIndex) dot.classList.add('active');
        });
    }

    reset() {
        this.state = 'IDLE';
        this.updateUI('');

        if (this.elements.controlsExtra) {
            this.elements.controlsExtra.classList.remove('hidden');
        }

        if (this.restartHandler) {
            this.elements.circle.removeEventListener('click', this.restartHandler);
            this.elements.circle.removeEventListener('touchend', this.restartHandler);
            this.restartHandler = null;
        }
        this.elements.circle.style.cursor = '';
        this.elements.btn.style.display = '';

        const dotsContainer = document.getElementById('breathDots');
        if (dotsContainer) {
            dotsContainer.classList.remove('visible');
            setTimeout(() => dotsContainer.innerHTML = '', 500);
        }

        document.body.classList.remove('mode-immersive');

        const section = document.getElementById('atmung');
        if (section) {
            if (window.scrollManager) window.scrollManager.isAutoScrolling = true;
            section.scrollIntoView({ behavior: 'auto', block: 'center' });
        }

        document.querySelectorAll('section:not(#atmung)').forEach(s => {
            s.style.opacity = '';
            s.style.pointerEvents = '';
        });

        const nav = document.querySelector('.bottom-nav');
        if (nav && window.scrollY > 50) nav.classList.add('nav-visible');

        this.elements.circle.style.transition = '';
        this.elements.circle.classList.remove('inhale');
        this.elements.circle.classList.add('idle-breathing');
        this.elements.text.innerText = '';

        this.removeCalibrationListeners();
        this.elements.btn.onclick = null;
        this.elements.btn.innerHTML = '<i class="fas fa-play breath-btn__icon"></i> Übung starten';

        if (this.elements.intro && this.originalIntro) {
            this.updateIntroText(this.originalIntro);
        }

        if (this.elements.hint) this.elements.hint.classList.add('visible');
        if (this.elements.dotsContainer) this.elements.dotsContainer.classList.remove('visible');
        if (this.elements.controlsExtra) this.elements.controlsExtra.classList.remove('hidden');
    }

    startCalibration(isRestart = false) {
        this.aiFeedbackPromise = null;

        if (this.elements.circle.classList.contains('idle-breathing')) {
            if (this.elements.hint) this.elements.hint.classList.remove('visible');
            if (this.elements.dotsContainer) this.elements.dotsContainer.classList.add('visible');
            if (this.elements.controlsExtra) this.elements.controlsExtra.classList.add('hidden');

            const computed = window.getComputedStyle(this.elements.circle);
            const currentTransform = computed.transform;

            this.elements.circle.classList.remove('idle-breathing');
            this.elements.circle.style.transform = currentTransform; // Freeze
            void this.elements.circle.offsetWidth;

            this.elements.circle.style.transition = 'all 0.8s ease-out';
            this.elements.circle.style.transform = 'scale(1)';
        }

        if (this.restartHandler) {
            this.elements.circle.removeEventListener('click', this.restartHandler);
            this.elements.circle.removeEventListener('touchend', this.restartHandler);
            this.restartHandler = null;
        }

        this.removeCalibrationListeners();

        const section = document.getElementById('atmung');
        if (section) {
            if (window.scrollManager) window.scrollManager.isAutoScrolling = true;
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
            this.elements.circle.style.transform = '';
            this.elements.circle.style.boxShadow = '';
            this.elements.circle.style.color = '';

            if (this.elements.controlsExtra) this.elements.controlsExtra.classList.add('hidden');

            this.state = 'CALIBRATION_READY';
            document.body.classList.add('mode-immersive');

            document.querySelectorAll('section:not(#atmung)').forEach(s => {
                s.style.transition = 'opacity 0.5s ease';
                s.style.opacity = '0';
                s.style.pointerEvents = 'none';
            });

            document.querySelector('.bottom-nav')?.classList.remove('nav-visible');

            const dotsContainer = document.getElementById('breathDots');
            if (dotsContainer) {
                dotsContainer.innerHTML = '';
                for (let i = 0; i < 7; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot bounce-in';
                    dot.style.animationDelay = `${i * 0.1}s`;
                    dotsContainer.appendChild(dot);
                }
                requestAnimationFrame(() => dotsContainer.classList.add('visible'));
            }

            this.calibrationData.cycles = [];
            this.calibrationData.currentInStart = 0;

            this.updateUI('Halten');
            this.elements.text.classList.add('transparent');
            this.elements.text.innerText = 'Beim Einatmen den Core gedrückt halten und loslassen beim Ausatmen.';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.elements.text.classList.remove('transparent');
                });
            });

            this.elements.btn.innerHTML = '<i class="fas fa-stop breath-btn__icon"></i> Abbrechen';

            if (this.elements.intro) {
                if (!isRestart) {
                    this.updateIntroText("Die ersten drei Atemzyklen dienen der Kalibrierung, ab dem vierten Klick begleitet dich der <i>Breath Core</i> visuell in deinem Rhythmus. Atme durch die Nase ein und mindestens doppelt so lang, mit Lippenbremse, durch den Mund aus.");
                } else {
                    this.updateIntroText("");
                }
            }

            this.updateDots(0);
            this.elements.circle.style.transition = 'transform 4s ease-out, box-shadow 4s ease-out, color 2s ease';
            this.elements.circle.style.cursor = 'pointer';

            this.addCalibrationListeners();

            // Push state for browser back button support
            if (history.state?.immersive !== true) {
                history.pushState({ immersive: true }, '');
            }
        }, 800);
    }

    addCalibrationListeners() {
        const target = this.elements.circle;
        target.addEventListener('mousedown', this.boundHandlers.press);
        target.addEventListener('touchstart', this.boundHandlers.pressTouch);
        target.addEventListener('mouseup', this.boundHandlers.release);
        target.addEventListener('touchend', this.boundHandlers.releaseTouch);
        target.addEventListener('mouseleave', this.boundHandlers.release);
    }

    removeCalibrationListeners() {
        const target = this.elements.circle;
        target.style.cursor = '';
        target.removeEventListener('mousedown', this.boundHandlers.press);
        target.removeEventListener('touchstart', this.boundHandlers.pressTouch);
        target.removeEventListener('mouseup', this.boundHandlers.release);
        target.removeEventListener('touchend', this.boundHandlers.releaseTouch);
        target.removeEventListener('mouseleave', this.boundHandlers.release);
    }

    handlePress(e) {
        if (this.state !== 'CALIBRATION_READY' && this.state !== 'CALIBRATION_ACTIVE') return;

        if (this.calibrationData.cycles.length === 0 && this.elements.intro) {
            this.updateIntroText("");
        }

        this.state = 'CALIBRATION_ACTIVE';
        const now = Date.now();

        if (this.calibrationData.currentOutStart > 0) {
            const outDuration = now - this.calibrationData.currentOutStart;
            if (outDuration > 200) {
                const lastCycle = this.calibrationData.cycles[this.calibrationData.cycles.length - 1];
                if (lastCycle) {
                    lastCycle.out = outDuration;
                    if (this.calibrationData.cycles.length >= 3) {
                        this.finishCalibration();
                        return;
                    }
                }
            }
        }

        this.calibrationData.currentInStart = now;
        this.calibrationData.currentOutStart = 0;
        this.calibrationData.cycles.push({ in: 0, out: 0 });

        const count = this.calibrationData.cycles.length;
        this.updateDots(count - 1);

        this.elements.circle.classList.add('inhale');
        this.elements.circle.innerText = 'Ein';
        this.elements.text.innerText = `Kalibrierung...`;
    }

    handleRelease(e) {
        if (this.state !== 'CALIBRATION_ACTIVE') return;

        const now = Date.now();
        const inDuration = now - this.calibrationData.currentInStart;

        if (inDuration < 450) {
            this.state = 'CALIBRATION_READY';
            this.calibrationData.cycles = [];
            this.calibrationData.currentInStart = 0;
            this.calibrationData.currentOutStart = 0;

            this.elements.circle.classList.remove('inhale');
            this.elements.circle.innerText = 'Halten';
            this.updateDots(-1);
            this.elements.text.innerText = "Zu kurz! Halte den Core entspannt gedrückt, solange du einatmest.";
            return;
        }

        const currentCycle = this.calibrationData.cycles[this.calibrationData.cycles.length - 1];
        if (currentCycle) {
            currentCycle.in = inDuration;
        }

        this.calibrationData.currentOutStart = now;
        this.elements.circle.classList.remove('inhale');
        this.elements.circle.innerText = 'Aus';
    }

    finishCalibration() {
        this.state = 'GUIDANCE';

        const cycles = this.calibrationData.cycles;
        const completeCycles = cycles.filter(c => c.in > 0 && c.out > 0);

        if (completeCycles.length === 0) {
            this.reset();
            return;
        }

        const avgIn = completeCycles.reduce((sum, c) => sum + c.in, 0) / completeCycles.length;
        const avgOut = completeCycles.reduce((sum, c) => sum + c.out, 0) / completeCycles.length;

        this.guidanceConfig.avgIn = avgIn;
        this.guidanceConfig.avgOut = avgOut;
        this.guidanceConfig.currentCycle = 0;

        // Pre-load AI Feedback
        const { bpm, ratioVal } = calculateBreathStats(avgIn, avgOut);
        this.aiFeedbackPromise = this.gemini.getBreathFeedback(bpm, ratioVal);

        this.startGuidance();
    }

    startGuidance() {
        this.elements.btn.innerHTML = '<i class="fas fa-stop breath-btn__icon"></i> Abbrechen';

        const runCycle = () => {
            if (this.state !== 'GUIDANCE') return;
            if (this.guidanceConfig.currentCycle >= this.guidanceConfig.targetCycles) {
                this.showResults();
                return;
            }

            this.guidanceConfig.currentCycle++;

            const totalCount = 3 + this.guidanceConfig.currentCycle;
            this.elements.text.innerText = `Übung Läuft...`;
            this.updateDots(totalCount - 1);

            const inTime = this.guidanceConfig.avgIn;
            this.elements.circle.style.transition = `transform ${inTime}ms ease-in-out, box-shadow ${inTime}ms ease-in-out, color ${inTime}ms ease`;
            this.elements.circle.classList.add('inhale');
            this.elements.circle.innerText = 'Ein';

            setTimeout(() => {
                if (this.state !== 'GUIDANCE') return;

                const outTime = this.guidanceConfig.avgOut;
                this.elements.circle.style.transition = `transform ${outTime}ms ease-in-out, box-shadow ${outTime}ms ease-in-out, color ${outTime}ms ease`;
                this.elements.circle.classList.remove('inhale');
                this.elements.circle.innerText = 'Aus';

                setTimeout(() => {
                    if (this.state !== 'GUIDANCE') return;
                    runCycle();
                }, outTime);

            }, inTime);
        };

        runCycle();
    }

    showResults() {
        if (this.state === 'FINISHED') return;
        this.state = 'FINISHED';

        const { bpm, ratioVal, ratio, inSec, outSec } = calculateBreathStats(this.guidanceConfig.avgIn, this.guidanceConfig.avgOut);

        const staticFeedback = generateStaticFeedback(bpm, ratioVal);

        if (this.elements.intro) {
            this.updateIntroText(staticFeedback);

            if (this.aiFeedbackPromise) {
                this.aiFeedbackPromise.then(aiText => {
                    if (aiText) this.updateIntroText(aiText);
                });
            }
        }

        this.elements.circle.innerText = 'Neustart';
        this.elements.circle.style.cursor = 'pointer';

        this.restartHandler = (e) => {
            e.stopPropagation();
            this.startCalibration(true);
        };
        this.elements.circle.addEventListener('click', this.restartHandler);
        this.elements.circle.addEventListener('touchend', this.restartHandler);

        this.elements.text.innerHTML = `Ein: ${inSec}s | Aus: ${outSec}s<br>${bpm} Atemzüge/Min | Verhältnis 1:${ratio}`;
        this.elements.btn.innerHTML = '<i class="fas fa-play breath-btn__icon breath-btn__icon--reverse"></i> Zurück';

        const dotsContainer = document.getElementById('breathDots');
        if (dotsContainer) dotsContainer.classList.remove('visible');
    }

    updateIntroText(newText) {
        if (!this.elements.intro) return;
        this.elements.intro.classList.add('fade-out');
        setTimeout(() => {
            this.elements.intro.innerHTML = newText;
            this.elements.intro.classList.remove('fade-out');
        }, 500);
    }

    updateUI(text) {
        if (text === '') {
            this.elements.circle.innerHTML = '<i class="fas fa-lungs breath-circle-inner__icon"></i>';
        } else {
            this.elements.circle.innerText = 'Start';
        }
    }

    handlePopState(e) {
        // If we are in immersive mode but the state no longer says so, reset
        if (this.state !== 'IDLE' && (!e.state || !e.state.immersive)) {
            this.reset();
        }
    }

    handleKeydown(e) {
        if (this.state !== 'IDLE') {
            if (e.key === 'Escape' || e.key === 'Backspace') {
                // Prevent backspace from navigating away if browsers still do that
                // and stop exercise by going back in history
                e.preventDefault();
                history.back();
            }
        }
    }
}
