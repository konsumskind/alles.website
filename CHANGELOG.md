# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## [2026-04-28] - Code-Cleanup & Architektur-Bereinigung

### Bereinigt
- **Inline-Styles entfernt:** Alle `style=""`-Attribute in `index.html` und dynamisch erzeugten JS-Strings durch semantische BEM-Klassen ersetzt. Neue Klassen: `.section__intro--flush`, `.accordion--spaced`, `.carousel--top-only`, `.feature-card--full-height`, `.section__references`, `.config-value--wide/--narrow`, `.toggle-switch--compact`, `.contact-card__inner`, `.location-header`, `.location-header__title/--icon/--address/--link`, `.location-preview__map-overlay`, `.breath-circle-inner__icon`, `.breath-btn-wrapper`, `.breath-btn__icon`, `.breath-btn__icon--reverse`, `.btn__icon`, `.workshop-card__title`.
- **Inline-Event-Handler entfernt:** `onclick="window.open(...)"` auf WhatsApp- und Maps-Links durch semantische `<a href="..." target="_blank">`-Tags ersetzt.
- **`window.showToast` entfernt:** `ThemeManager` importiert `showToast` nun direkt aus `utils.js` statt über den globalen Namespace. `window.showToast`-Zuweisung aus `main.js` entfernt.
- **Profil-Bild Fallback:** Inline `onerror`-Handler vom Profilbild entfernt.
- **`main.js` aufgeräumt:** Ungenutzter `sendMail`-Import entfernt. `initBreathing()` vereinfacht (kein `removeAttribute('onclick')` mehr nötig).
- **SCSS erweitert:** `width: 100%` direkt in `.configurator__slider` definiert (war vorher nur inline).

### Pricing Logic & Offer Card UI
- **Dynamische Preislogik:** Rabattstaffelungen für "Einzelsitzungen" in `pricing.js` um einen Step nach hinten verschoben (Fokus: 5% ab der 4. Sitzung, 10% ab der 6. Sitzung. Deep Dive: 10% ab der 4. Sitzung). Paketpreise gelten weiterhin ab der ersten Sitzung des Pakets.
- **Kompakte Configurator UI:** Der Paket-Toggle wurde platzsparend direkt neben den Sitzungs-Slider verschoben. Das Label für die Sitzungsanzahl ändert sich nun dynamisch (z.B. "3 Sitzungen einzeln" vs. "3 Sitzungen Pkt").
- **Dynamische Slider-Ticks:** Eingravierte Skalen-Striche (`.slider-ticks`) rahmen die Slider-Tracks nun von oben und unten ein. Die Ticks werden basierend auf `min`, `max` und `step` der Range-Inputs über JavaScript exakt berechnet und generiert. Pseudo-Elemente (`::before`, `::after`) verhindern ein Durchscheinen hinter dem Track.
- **Magnet-Slider:** Bei aktiviertem "Paketbuchung"-Toggle greift nun eine Snap-Logik. Der Slider animiert weich auf die gültigen Paketgrößen. Bei Fokus rastet er beim Ziehen ausschließlich bei 3 und 5 ein (4 wird übersprungen), bei Deep-Dive verriegelt er fest auf 3.
- **Offer Card Grouping:** Header (Badge, Titel, Subtitle) und Body (Config-Grid, Footer) der Offer-Cards wurden gruppiert (`.offer-card__header` / `.offer-card__body`). Flexbox-Spacing verteilt den Höhenausgleich im Responsive-Grid nun exakt zwischen Subtitle und Config-Grid, wodurch die Fußzeilen immer auf gleicher Höhe abschließen.

---

## [2026-04-27] - UI & Architektur Refinements

### Hinzugefügt / Geändert
- **Architektur (BEM):** Das `Kostenlos!`-Badge wurde aus dem spezifischen `_process.scss` extrahiert und als globales, wiederverwendbares `.highlight-badge` in `_badges.scss` definiert.
- **Hero-Sektion:** Das initiale 4-Sekunden-Timeout für das Ausblenden des Hero-Badges wurde entfernt. Das Badge wird nun komplett scrollbasiert über einen `IntersectionObserver` gesteuert.
- **Architektur (JS):** Die JavaScript-Steuerung des Hero-Badges (`initHeroBadge`) wurde aus der zentralen `main.js` entfernt und stattdessen sauber in der `HeroAnimation` Klasse (`src/js/hero.js`) gekapselt.
- **Swipe-Button (Swipe CTA):** 
  - **Bugfix:** Ein Problem wurde behoben, bei dem beim Hin- und Herwischen beide Farben (lila und blau) gleichzeitig aktiv blieben. Die nicht aktive Seite wird nun sofort korrekt in den Inaktiv-Zustand zurückgesetzt.
  - **UI Polish:** Den Icons und Richtungspfeilen im Swipe-Button wurde ein dynamischer `text-shadow` (Glow/Shine-Effekt) hinzugefügt, der beim Wischen entsprechend der Bewegungsrichtung intensiviert wird (Lila für links, Blau für rechts).

### Entfernt
- Ein temporäres, zweites Highlight-Badge am CTA-Button der Process-Sektion wurde verworfen und vollständig aus HTML, CSS und JS entfernt.
