---
trigger: always_on
---

# Projekt-Regeln & Struktur

Dieser Arbeitsbereich folgt einer strikten Struktur, um Wartbarkeit und Konsistenz zu gewährleisten.

## 1. Projektstruktur

### Root
- **`src/`**: Quellcode.
- **`dist/`**: Produktions-Build (automatisch generiert).
- **`index.html`**: Haupt-Einstiegspunkt. Soll sauber gehalten werden (keine Inline-Styles/Scripts).
- **`vite.config.js`**: Vite Konfiguration.

### SCSS (`src/scss/`)
Die Styles werden über `main.scss` gesammelt.
- **`main.scss`**: Importiert alle Partials. Keine direkten Styles hier.
- **`_variables.scss`**: Globale Variablen (Farben, Fonts, Spacing).
- **`base/`**: Reset, Typografie (`_reset.scss`, `_typography.scss`).
- **`components/`**: Wiederverwendbare UI-Elemente (Buttons, Cards, Forms).
- **`layout/`**: Große Layout-Bereiche (Hero, Sections, Footer).
- **`modules/`**: Spezifische Funktionalitäten (Nav, Toast, Carousel).

**Regel:** Neue Styles müssen in eine passende Partial-Datei und in `main.scss` importiert werden.

### JavaScript (`src/js/` & `src/main.js`)
- **`src/main.js`**: Zentraler Einstiegspunkt. Importiert Styles und JS-Module. Initialisiert Komponenten beim `DOMContentLoaded` Event.
- **`src/js/`**: Enthält ES6 Module.
    - Wiederverwendbare Klassen/Funktionen exportieren.
    - Logik in eigene Dateien auslagern (z.B. `theme.js`, `scroll.js`).

**Regel:** Keine `<script>` Tags in HTML für Logik. Alles über `src/main.js` und Module.

## 2. Coding Guidelines

### HTML
- Semantisches HTML5 verwenden (`<header>`, `<main>`, `<section>`, `<footer>`).
- Keine Inline-Styles (`style="..."` vermeiden -> Klassen nutzen).
- Keine Inline-Event-Handler (`onclick="..."` vermeiden -> `addEventListener` nutzen).

### CSS / SCSS
- **Methodik**: BEM (Block Element Modifier) für Klassennamen (z.B. `.card__title`, `.btn--primary`).
- **Variablen**: Nutze CSS-Variablen aus `_variables.scss` für Konsistenz (Farben, Spacing).
- **Verschachtelung**: SCSS-Nesting nutzen, aber nicht zu tief (max. 3 Ebenen empfohlen).

### JavaScript
- **ES6+**: `const`/`let` statt `var`. Arrow Functions wo sinnvoll.
- **Modularität**: Jede Komponente/Feature in eigener Datei.
- **Initialisierung**: Klassen/Module werden in `main.js` instanziiert.

## 3. Workflow
- `npm run dev`: Lokaler Entwicklungsserver.
- Änderungen an der Struktur müssen dokumentiert werden.