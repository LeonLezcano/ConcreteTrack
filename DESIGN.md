# ConcreteTrack - Design System Specification

## Product Mode & Visual World
- **Mode:** `Operate` (operational plant dispatch, mixer hydration telemetry, CIRSOC 201 lab certification, and field water-addition legal waivers).
- **Use Scene:** Ready-mix concrete plant dispatch desks, laboratory compression press benches, and mixer truck cabin windshield mounts operating across day/night shifts and low-connectivity construction sites.
- **Dial:** `ENERGY 3 / RHYTHM 4 / MOTION 2`
  - **Energy 3:** High-clarity industrial cockpit surfaces with disciplined contrast and zero decorative gradients or neon halos.
  - **Rhythm 4:** Dense, scannable operational telemetry grids (`tabular-nums`) separated by clean horizontal dividers and consistent 12px/16px spacing steps.
  - **Motion 2:** Snappy state transitions only; zero endless pulse/bounce loops and full support for `prefers-reduced-motion: reduce`.

## Theme Strategy (Single-Theme Dark Cockpit + Print Paper Override)
ConcreteTrack intentionally ships a **single dark industrial cockpit theme** (`#020617` / `#0f172a`) to prevent windshield glare in truck cabins and eye strain in plant control rooms. `darkMode: 'class'` is intentionally omitted so no partial light-mode surface mismatch can occur.

For legal remitos, water-addition waivers, and CIRSOC lab certificates printed from the browser, `@media print` overrides all surfaces to crisp white paper (`#ffffff`) and dark ink (`#0f172a` / `#334155`) while hiding `.no-print` chrome.

## Color Tokens & Semantic Discipline
- **Neutrals (Surfaces & Ink):**
  - Canvas background: `#020617` (`slate-950`)
  - Primary card / header / modal surface: `#0f172a` (`slate-900`)
  - Elevated control / divider border: `#1e293b` (`slate-800`) and `#334155` (`slate-700`)
  - Primary text: `#f8fafc` (`slate-50`) / `#ffffff`
  - Secondary text & labels: `#cbd5e1` (`slate-300`) and `#94a3b8` (`slate-400`)
- **Primary Action Accent (Single Hue):**
  - Primary CTA fill: `#0369a1` (`sky-700`, hover `#0284c7` `sky-600`) with `#ffffff` text (>= 4.5:1 WCAG AA contrast).
  - Active navigation / focus-visible ring: `#38bdf8` (`sky-400`).
- **Strict Semantic Status Tokens (Reserved for CIRSOC / IRAM States Only):**
  - **Optimal / Conforme (<90 min, >=100% f'c):** `emerald-950` surface, `emerald-300` text, `emerald-700` border.
  - **Warning / Marginal / Water Caution (90-119 min, 90-99% f'c, water addition):** `amber-950` surface, `amber-300` text, `amber-700` border.
  - **Expired / Rejected (>=120 min, <90% f'c, destructive action):** `rose-950` surface, `rose-300` text, `rose-700` border.

## Typography Scale & Hierarchy
- **Font Family:** Native system UI sans stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) for instant zero-latency offline rendering; monospace (`ui-monospace, SFMono-Regular, monospace`) strictly for plate numbers, remito codes, and SHA-256 seals.
- **Strict Descending Heading Scale:**
  - `h1` (App title): `1.25rem` (`20px`, `text-xl font-bold tracking-tight`)
  - `h2` (Section headings): `1.125rem` (`18px`, `text-lg font-semibold`)
  - `h3` (Modal titles): `1rem` (`16px`, `text-base font-semibold`)
  - `body` / inputs: `0.875rem` (`14px`, `text-sm`)
  - Metadata / table captions: `0.75rem` (`12px`, `text-xs`)
- **Numeric Precision:** Telemetry counters, elapsed minutes, MPa, and m3 values use `tabular-nums`.

## Layout, Surfaces & Accessibility
- **Flat Card Architecture:** Data cards (`<article>`) use a single `1px` border (`border-slate-800`) and `rounded-xl`. Internal metadata blocks use `border-t border-slate-800` dividers instead of nested bordered sub-cards.
- **No Blur / No Colored Glows:** Sticky header/nav and modal overlays use solid/opaque dark fills without `backdrop-blur` or `shadow-*-950` halos.
- **Iconography:** Crisp `2px`-stroke inline `<svg aria-hidden="true">` icons; zero decorative emojis in UI chrome.
- **Touch Targets & A11y:** All interactive controls enforce `min-height: 44px` (`48px` for cab WakeLock and modal actions), matching `<label for="...">` bindings, `role="tablist"` / `role="tab"` / `aria-selected`, Escape-key and backdrop-click modal dismissal, focus trapping, and `:focus-visible` `2px` `#38bdf8` rings.
