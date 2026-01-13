
/**
 * Calculates feedback strings based on breathing metrics.
 */
export const calculateBreathStats = (avgIn, avgOut) => {
    const ratio = (avgOut / avgIn).toFixed(1);
    const ratioVal = parseFloat(ratio);
    const cycleDuration = avgIn + avgOut;
    const bpm = Math.round(60000 / cycleDuration);
    const inSec = (avgIn / 1000).toFixed(1);
    const outSec = (avgOut / 1000).toFixed(1);

    return { bpm, ratioVal, ratio, inSec, outSec };
};

export const generateStaticFeedback = (bpm, ratioVal) => {
    let freqText = '';
    let ratioText = '';
    let transitionText = '';

    // 1. Frequency (BPM)
    let freqCategory = 'mid';
    if (bpm > 15) freqCategory = 'high';
    else if (bpm < 10) freqCategory = 'low';

    switch (freqCategory) {
        case 'high':
            freqText = `Wir messen aktuell eine erhöhte Atemfrequenz von ${bpm} Zügen pro Minute`;
            break;
        case 'mid':
            freqText = `Deine Atmung liegt mit ${bpm} Zügen pro Minute in einem normalen Bereich`;
            break;
        case 'low':
            freqText = `Sehr gut. Mit ${bpm} Zügen pro Minute ist deine Grundfrequenz schön niedrig`;
            break;
    }

    // 2. Ratio (In:Out)
    let ratioCategory = 'neutral';
    if (ratioVal < 0.9) ratioCategory = 'in_bias';
    else if (ratioVal > 1.1) ratioCategory = 'out_bias';

    switch (ratioCategory) {
        case 'in_bias':
            ratioText = "und zusätzlich ist deine Einatmung dominant.";
            break;
        case 'neutral':
            ratioText = "und das Verhältnis von Ein- zu Ausatmung ist ausgeglichen.";
            break;
        case 'out_bias':
            ratioText = "und du atmest bereits länger aus als ein.";
            break;
    }

    // 3. Recommendation
    if (freqCategory === 'high' || ratioCategory === 'in_bias') {
        transitionText = "Verlängere nun die Ausatmung, wenn du zur Ruhe kommen willst.";
    } else if (freqCategory === 'low' && ratioCategory === 'out_bias') {
        transitionText = "Du bist kurz vor einem Nickerchen! Schau dir schnell meine Angebote an, bevor du einschläfst.";
    } else {
        transitionText = "Lass uns diesen Zustand vertiefen und vom bloßen Funktionieren ins wirkliche Regenerieren kommen.";
    }

    return `${freqText} ${ratioText}<br>${transitionText}`;
};
