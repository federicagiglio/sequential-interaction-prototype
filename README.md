# sequential-interaction-prototype
Codebase for my sequential interaction project in IXD 107-03, working with claude code

## Live site

https://federicagiglio.github.io/sequential-interaction-prototype/

## Scan Lines — Signal You Can Touch

A picture becomes an analog video signal (Rutt/Etra style scan lines) that you tune like a monitor and then bend by hand. One linear sequence on one persistent sheet:

1. **Capture**: take a picture with the device camera (webcam on a computer, front camera on a phone; live preview on the sheet, then *Snap*) or upload one. *next* appears once a picture is in.
2. **Tune**: three sliders (how many lines, direction, density) redraw the lines live. *next* appears once each slider has been moved.
3. **Warp**: drag to pull lines, pinch or scroll to spread or squeeze them, double-tap to clear. *finish* is available at any time.
4. **Done**: the finished sheet on its own, with *save image* (PNG) and *start over*.

The site lives in [`docs/`](docs/) and is plain HTML, CSS and JavaScript with no build step:

| File | Role |
|---|---|
| `docs/index.html` | The page: sheet, step panels, progress |
| `docs/css/style.css` | Styles carried over from the studies |
| `docs/js/scan.js` | Shared scan-line core, extracted unchanged from the studies |
| `docs/js/paper.js` | Shared state and the persistent sheet (layout, drawing, idle motion, export) |
| `docs/js/settings.js` | Fixed look-and-feel values (colours, type, sizes, line rendering, motion, gestures, effects) |
| `docs/js/capture.js`, `tune.js`, `warp.js` | One file per step, adapted from studies 01–03 |
| `docs/js/app.js` | Linear step controller, ending and reset |

The original studies are in `scan-lines-studies.zip`.

**Publishing:** GitHub Pages must serve from branch `main`, folder `/docs` (Settings → Pages).
