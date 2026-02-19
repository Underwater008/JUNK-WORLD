# CLAUDE.md

## Project

JUNK GLOBAL — a 3D globe-based university design project explorer built with Next.js 16, React 19, react-globe.gl, and Three.js.

## Dev

- `npm run dev` — starts dev server on localhost:3000 (uses webpack, NOT Turbopack)
- `npm run build` — production build
- Uses `--webpack` flag because `three.js` and `react-globe.gl` cause ChunkLoadErrors with Turbopack's chunking, leading to infinite HMR refresh loops.

## Stack

- Next.js 16 + React 19 (App Router, "use client" components)
- react-globe.gl + Three.js for 3D globe
- Framer Motion for animations
- Tailwind CSS v4

## Key Files

- `app/page.tsx` — main page, holds selectedUniversity + hoveredProject state
- `components/Globe.tsx` — 3D globe with HTML markers (uses dynamic import, ssr: false)
- `components/ProjectPanel.tsx` — right panel showing projects
- `components/UniversityList.tsx` — left sidebar
- `data/mock.ts` — static university/project data
- `types/index.ts` — TypeScript interfaces
