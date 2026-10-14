# sequential-interaction-prototype
Codebase for my sequential interaction project in IXD 107-03, working with claude code

## Live site

https://federicagiglio.github.io/sequential-interaction-prototype/

## Scan Lines — Signal You Can Touch

A picture becomes an analog video signal (Rutt/Etra style scan lines) that you tune like a monitor and then bend by hand. One linear sequence on one persistent sheet:

1. **Capture**: take or upload a picture. *next* appears once it has loaded.
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
| `docs/js/behavior.js` | Behavior controls panel: parameter schema, defaults, persistence, copy-as-prompt |
| `docs/js/capture.js`, `tune.js`, `warp.js` | One file per step, adapted from studies 01–03 |
| `docs/js/app.js` | Linear step controller, ending and reset |

### Behavior controls

The **behavior controls** button (top right) opens a collapsible panel bound to the prototype's real parameters. Each control shows its unit, range and default, and a • marks values changed from the default.

- **Colors:** background, line ink, interface text, frame and rules
- **Type:** font, text size (px), letter spacing (em)
- **Dimensions:** sheet shape, sheet margin (%), corner brackets (px), control bar width (px)
- **Lines:** lift depth (× picture height), signal smoothing, signal resolution (px), invert signal
- **Motion:** idle motion (none, wave, bounce, breathe, jitter), amplitude (px), speed (Hz), photo-to-lines fade (ms), panel transition (ms)
- **Warp gestures:** brush radius (% picture height), scroll sensitivity (×), double-tap window (ms), ring opacity, ring hold (ms)
- **Effects:** line glow (px blur), line opacity, photo underlay (opacity)

**Reset state** restarts the sequence and keeps the controls. **Restore defaults** puts every control back. **Copy as prompt** copies all values, changed ones first, as text you can paste into Claude to make them the new defaults. Values are remembered in this browser.

The original studies are in `scan-lines-studies.zip`.

**Publishing:** GitHub Pages must serve from branch `main`, folder `/docs` (Settings → Pages).
