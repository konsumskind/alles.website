
/**
 * Service to interact with Google Gemini API
 */
export class GeminiService {
    constructor() {
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        this.modelName = 'gemini-2.5-flash'; // Or 'gemini-1.5-flash-002' if preferred/available
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    /**
     * Get feedback for breathing exercise
     * @param {number} bpm - Breaths per minute
     * @param {number} ratio - Ratio of Exhale/Inhale
     * @returns {Promise<string|null>} - The feedback text or null if failed
     */
    async getBreathFeedback(bpm, ratio) {
        if (!this.apiKey) {
            console.warn('GeminiService: No API Key found.');
            return null;
        }

        const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;

        const systemPrompt = `ROLE:
Du bist ein Atem-Coach mit systemischer Haltung und in meiner Website integriert. Gib kurzes (max 250 Zeichen), klares Feedback zu einer Atemübung zur Regulierung des Nervensystems. Verwende keine Messwerte und konjunktive im Text. Nur bei entspannter Atmung und Frequenz (<11 Atemzüge/min und min. 1:2 Verhältnis) leite humorvoll zum nächten Abschnitt (Angebote) über.

INPUT DATEN:
- Frequenz (Atemzüge/min)
- 1:Ausatem Verhältnis (Ausatmung / Einatmung. >1 = längeres Ausatmen)`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nWERTE: Freq: ${bpm}, Ratio: ${ratio}` }]
                    }]
                })
            });

            if (!response.ok) {
                if (response.status === 429) {
                    console.warn("GeminiService: Rate limit exceeded.");
                    return null;
                }
                // Fallback for 404
                if (response.status === 404) {
                    console.warn(`GeminiService: Model ${this.modelName} not found.`);
                    return null;
                }
                return null;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return text || null;

        } catch (e) {
            console.error("GeminiService: Network error", e);
            return null;
        }
    }
}
