# Assured Capture demo audit

## Findings addressed

| Impact | Finding | Change |
| --- | --- | --- |
| High | Reopening seeded samples over existing records. The initial report list could also hide visitor-created reports. | Seed the isolated IndexedDB once. Restoring samples fills in missing reports without replacing existing ones. |
| High | A failed parent issue save could still allow a photo to be written. Some writes returned success before the transaction committed. | Stop photo import when the issue cannot be saved. Wait for IndexedDB commits before confirming core changes. |
| High | Some stock image URLs failed. The production cache skipped the PDF worker and JPEG evidence. | Serve sample imagery locally, resolve old URLs to the local copies, and cache both the evidence and worker. |
| High | PDF image conversion could fail without completing its promise. | Resolve the placeholder on image conversion failure. Cancel and release preview processing when the dialog closes. |
| Medium | Report cards mixed keyboard activation for opening and exporting. Reordering relied on drag or shortcuts. | Give export its own native button. Issues and photos use drag handles and retain keyboard reordering. |
| Medium | Export, preview, and confirmation dialogs did not manage keyboard focus consistently. | Use native dialogs with Escape dismissal and put initial focus on Cancel for destructive actions. |
| Medium | The first page loaded PDF, DOCX, and preview libraries before they were needed. | Load the report tooling when selected. The main compressed JavaScript chunk dropped from about 718 kB to 344 kB in the Vite build output. |

## Browser coverage

- Edge at 360 px, 390 px, and 1280 px viewport widths.
- Five sample reports, report search, report creation, editing, deletion, and persistence after reload and demo exit.
- Issue and photo reordering, gallery import, drawing markup, and persistence of a photo caption and annotated image in IndexedDB.
- Keyboard activation of export, Escape dismissal, and focus on Cancel in the delete confirmation.
- PDF preview and both download formats with the production preview offline after the first online load.
- TypeScript and production bundle checks.

Physical camera capture, microphone input, geolocation, installed home screen behavior, and other browsers still need device coverage. The initial JavaScript bundle still triggers Vite’s chunk-size advisory.

## Design references

- [Fieldwire photo workflows](https://help.fieldwire.com/hc/en-us/articles/211358926-Introduction-to-the-Photos-Tab) informed the short path from issues to evidence and markup.
- [WCAG 2.2 focus visibility](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) informed the focus styling and space below content.

## Mobile layout and client palette

The welcome, register, settings, report, issue list, issue, evidence, markup, PDF preview, and export screens were checked in Edge with coarse-pointer emulation at 320, 390, and 414 CSS pixels wide, plus 667 × 375 landscape. The page itself fits those widths. PDF pages can scroll inside the preview when enlarged.

Palette values are Bondi Mint `#B9E6F5`, Ice White `#FFFFFF`, Sydney Sky `#6990FF`, Moss Green `#98C2B3`, Living Stone `#C4CBC4`, Black Steel `#152128`, and Brick Dust `#FCC3B6`. Ice White uses the RGB values on the reference because its hex caption duplicates Black Steel.
