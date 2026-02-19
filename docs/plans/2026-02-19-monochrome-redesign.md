# JUNK Global — Monochrome Redesign

## Summary

Redesign JUNK Global from dark/purple glassmorphism to a clean white + black monochrome aesthetic. OpenAI-inspired, high-end, bold contrast. Dotted/stippled globe. Single sidebar that swaps between university list and project list.

## Visual Foundation

### Colors
- Background: `#FFFFFF`
- Primary text: `#171717`
- Secondary text: `#6B6B6B`
- Borders/lines: `#000000` (2px for structural, 1px for subtle)
- Globe dots (land): `#000000`
- Globe dots (ocean/grid): `#D4D4D4`
- Hover states: `#000000` fill with `#FFFFFF` text (inverted)
- No university-specific colors — everything monochrome

### Typography
- Font: Inter (Google Fonts)
- Logo: `Inter 700`, all-caps, letter-spacing `0.12em`
- Headings: `Inter 600`, 18-24px
- Body: `Inter 500`, 14px
- Captions: `Inter 400`, 12px, `#6B6B6B`

### Spacing
- Generous whitespace: 32-48px padding on panels
- Content breathes — no cramming

### Borders
- 2px `#000000` for card borders and structural dividers
- 1px `#000000` for subtle separators
- No shadows, no gradients, no glassmorphism

## Layout

### Header
- Left: "JUNK GLOBAL" in bold caps
- Right: "University Design Projects" in lighter weight
- 2px black line below header

### Left Sidebar (~280px)
Two states with animated transition:

**State 1 — University List (default)**
- List of 6 university names in semibold
- Small black dot next to each
- Project count ("3 projects") in gray below name
- Thin black dividers between items
- Hover: subtle right-shift animation
- Click: transitions to State 2

**State 2 — Project List (selected university)**
- Back arrow + "Back" at top
- University name as heading
- Location + total projects as metadata
- Project cards below:
  - 2px black border rectangles
  - Title (semibold), year, participant count
  - Click to expand: full description + tags
  - Tags as small bordered pills (black border, black text)
  - Smooth expand/collapse animation

### Globe (center, fills remaining space)
- Stippled/dotted style — black dots for landmasses, gray dots for grid
- Auto-rotates slowly when idle
- Default: shows small black dot markers at each university location

**On university select:**
- Globe rotates to university's location
- Other university markers disappear
- Project markers appear near the university
- Selected project gets highlighted marker (larger/pulsing)

**On back:**
- Globe zooms out to default view
- All university markers reappear

## Interaction Flow

1. User lands on page → sees globe rotating with 6 university markers + sidebar list
2. Clicks "RCA" in sidebar → sidebar slides to RCA's 3 projects, globe zooms to London
3. Clicks "Tepui Islands" → card expands showing description + tags, globe highlights marker
4. Clicks back arrow → returns to university list, globe zooms out

## Components to Modify

1. `globals.css` — New monochrome color scheme, remove dark theme
2. `Globe.tsx` — Stippled dot rendering, monochrome markers, white background
3. `page.tsx` — Remove ProjectPanel, single sidebar state management
4. `UniversityList.tsx` — Redesign as dual-state sidebar (uni list + project list)
5. `ProjectPanel.tsx` — Remove (absorbed into sidebar)
6. `ProjectCard.tsx` — Monochrome card style with bold borders
7. `layout.tsx` — Update metadata if needed
