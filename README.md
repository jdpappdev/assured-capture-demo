# Assured Capture Demo

Explore five fictional field inspections, add your own evidence, and preview and download reports as PDF or DOCX. Reports and edits are stored in IndexedDB in this browser.

## Run locally

```powershell
bun install --frozen-lockfile
bun run dev --host 127.0.0.1 --port 4177
```

Open http://127.0.0.1:4177. To exercise offline support, use the production preview.

```powershell
bun run lint
bun run build
bun run start --host 127.0.0.1 --port 4178
```

## Walkthrough

1. Open the sample workspace and choose Riverside Commercial Building Inspection.
2. Open the issues register, select an issue, then open a photo. Try markup, a caption, or the controls for changing evidence order.
3. Return to the report to preview its pages or download an export.
4. Open Demo settings to manage samples. Reloading and reopening keeps saved reports and edits.

Authentication, administration, and cloud sync are disabled. Camera, microphone, and location features depend on browser support and permissions. The local Unsplash images are illustrative stock photography for the fictional projects.

Private / Proprietary. All rights reserved.
