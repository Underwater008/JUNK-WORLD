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

## Google Drive Integration

### Access Setup
1. Requires `gcloud` CLI: `brew install --cask google-cloud-sdk` (needs Python 3.13: `brew install python@3.13`)
2. Auth with Drive scope: `gcloud auth login --enable-gdrive-access`
3. Get access token: `gcloud auth print-access-token`

### Querying the Drive API
```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)
# List folder contents:
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://www.googleapis.com/drive/v3/files?q='FOLDER_ID'+in+parents&fields=files(id,name,mimeType,size)&pageSize=100"
# Export Google Doc as text:
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://www.googleapis.com/drive/v3/files/FILE_ID/export?mimeType=text/plain"
# Export Google Sheet as CSV:
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://www.googleapis.com/drive/v3/files/FILE_ID/export?mimeType=text/csv"
```

### Drive Folder Structure
Root folder: `1j3J4kt2Po99gT6NFo3HpRdJJIoHzO2hF`

```
JUNK WORLD (root)
├── Junk DATA (spreadsheet: 1NviCjznmbKYCfCimhqIXvB06BpF3F6FK7IAI8neFUjs)
│   └── University roster: country, city, status, school name, member, class sizes 2021-2025
├── World building Definition (doc: 1o65HChn0z_bmblnjEhMya76zllXTIrKEDaqGNMHl1Io)
├── References - database/ (1p0Y4g22LSTJrMRznQaXmYarp70clALwu)
│   └── References (APA 7).xlsx
├── USC/ (1OK9E-CIQExpEQSHNIQEJxV5Ulu-ZcMco)
│   ├── USC CONTENT (doc: 1Z-31ekTGp91fdT2f9aPjyviFnuw4EBFC9Sv4hWovOno, 25MB)
│   ├── USC IMAGE/ (1JNQ8N7yBwqAhnUmPMjSHA_017kUY-74W) — 11 images
│   ├── 2024-04-26 Final Presentations/ (1FiH3wTPPOkC3QU97yENVqEx9MFMYpbUc)
│   ├── 2023-12-11 Final Presentation/ (19P6LIt1uFGl8VQPjbjQKsTsdEkwHX-eS)
│   └── video1431047574.mp4 (1.4GB)
├── NFA-Netherlands/ (1g_7W2GdvTIUucJlQUoZH43y6IyvBR6qx)
│   ├── Nederlandse Film Academie TEXT (doc: 1GHzBGpeN-LlRhtUenrwpa9tYeAnMaPULl9DZEMKYZ3I, 21MB)
│   ├── Nederlandse Film Academie IMAGE/ (1gar86L6Nl6-CwXZYsASaoWwUmAyCo468) — 9 images
│   ├── 2021-duringLockdown/
│   ├── 2023/
│   └── 2024/ → 01.Feb-Mar, 02.Apr-Jun subfolders
├── Willem de Kooning Academy (RUAS)/ (1Gxhz1Dxwnb6bwTfKg8U0o4v933T7LcU7)
│   ├── TEXT (shortcut)
│   └── IMAGE/ (14xQI5zDvJJ6QqT2GgKrORhtVr_KChQbY)
├── Uc3m-SPA/ (1wben4unKk9-wfj9NY6bxxsKJWxp8S8pb)
│   ├── Junk Spain uc3m 2025/
│   ├── Junk Spain uc3m 2024/
│   └── UC3M IMAGE/ (1vRmYBW2vnIE6aGqDrl6vGJlcQYpapfzV)
└── Austral - ARG/ (1BIheU_aY3mtoRuP5ATLD95-LQO-RIlVS)
    ├── AUSTRAL 2024 - Content (doc: 1z6to_5DHqj7eKZ-zmHJa25cbW3UkNduvD_9exQaGo_I, 9.5MB)
    ├── AUSTRAL + IMAGE/ (1a1kkyoDYRI6GIRq8PCtUwcuNpKxGKlQI)
    ├── 2021 - Iguazu Falls/
    ├── 2022 - Tandil Island/
    ├── 2023 - Malvinas Islands / Falkland Islands/
    └── 2024 - Pilar/
        ├── Final outcome Link (doc)
        ├── 2024 - Group details (doc)
        └── WB-2024-ARG/ (media folder)
```

### Folder Pattern
Each university folder follows a consistent structure:
- **TEXT** doc — main content/description (Google Doc, often large with embedded images)
- **IMAGE/** folder — curated project images
- **Year folders** (e.g., `2024 - Pilar`) — semester-specific content, presentations, group details
