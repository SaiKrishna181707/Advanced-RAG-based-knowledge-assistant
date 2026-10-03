# ALBATROSS CAREER - UI Design System

## 1. Core Principles
- **Premium & Modern**: Interface feels high-end, uncluttered, and trustworthy.
- **Technical & Information-Dense**: Designed for developers and engineers, optimizing for scanning efficiency without sacrificing aesthetics.
- **Minimal & Confident**: No unnecessary decorative UI (e.g., generic gradients, excessive glassmorphism). Pure utility with elegant typography.

## 2. Color Palette (Dark Theme Default)
- **Background (`--canvas`)**: `15 15 17` (Graphite)
- **Primary Surface (`--surface`)**: `24 24 28` (Dark Charcoal)
- **Secondary Surface (`--raised`)**: `35 35 40` (Lighter Graphite)
- **Borders (`--line`)**: `55 55 60` (Muted Line)
- **Primary Text (`--ink`)**: `245 245 242` (Warm White)
- **Secondary Text (`--muted`)**: `155 155 160` (Muted Gray)
- **Accent (`--accent`)**: `0 230 255` (Electric Cyan)
- **Accent Contrast (`--accent-ink`)**: `0 40 50`
- **Accent Text (`--accent-fg`)**: `0 20 25` (Almost Black)
- **Status Colors**:
  - Positive: `46 160 67` (Subtle Green)
  - Warning/Caution: `217 119 6` (Amber)
  - Danger: `220 38 38` (Red)

## 3. Typography
- **Primary Font**: `Inter`, system-ui
- **Monospace Font**: `JetBrains Mono` (for code or technical stats)
- **Hierarchy**:
  - `Display / H1`: `font-bold tracking-tight text-ink`
  - `H2`: `font-semibold tracking-tight text-ink`
  - `Body`: `font-sans antialiased text-ink`
  - `Small`: `text-sm text-muted`
  - `Caption`: `text-xs font-medium text-muted`

## 4. Spacing & Radius
- **Border Radius**:
  - Cards: `14px` (`rounded-card`)
  - Inputs/Buttons: `10px` (`rounded-input`)
- **Spacing**: 
  - Standard padding in cards: `p-4` or `p-6`
  - Section gaps: `gap-6`

## 5. Shadows
- **Card Shadow (`shadow-card`)**: `0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.18)`
- Shadows are used minimally since the UI relies on solid background contrast.

## 6. Components
- **Buttons**: Use `.btn-primary`, `.btn-secondary`, `.btn-ghost`. Primary buttons use Electric Cyan.
- **Inputs**: Use `.input` with standard 10px rounding and Cyan focus ring.
- **Empty States**: High-quality, illustrative (using Lucide icons), guiding the user to action. No generic "No data" strings.
- **Icons**: `lucide-react`, standard sizing (`h-4 w-4` inline, `h-8 w-8` for prominent display).

## 7. Responsive Breakpoints
- **Mobile**: Single column, mobile navigation drawer.
- **Tablet (`sm`, `md`)**: Grid shifts to 2 columns where appropriate.
- **Desktop (`lg`)**: Persistent 64px/256px sidebar, 1fr/1.5fr grid layouts.

## 8. Animation Principles
- Fast, intentional Framer Motion transitions (`<Reveal>`).
- `<motion.path>` used only on the primary Albatross brand mark.
- Strict adherence to `prefers-reduced-motion` globally.

## 9. Accessibility
- All primary colors checked for WCAG AA contrast against their respective backgrounds (e.g. Electric Cyan button text is almost black).
- Visible focus rings `outline: 2px solid rgb(var(--accent))` on keyboard navigation.
- Semantic HTML (e.g. `<nav>`, `<main>`, `<header>`).
