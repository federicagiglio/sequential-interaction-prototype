# sequential-interaction-prototype
Codebase for my sequential interaction project in IXD 107-03, working with claude code

## Live site

https://federicagiglio.github.io/sequential-interaction-prototype/

## Scan Lines — Signal You Can Touch

A picture becomes an analog video signal (Rutt/Etra style scan lines) that you tune like a monitor, bend by hand, set in motion and record as video art. One linear sequence on one persistent sheet:

1. **Capture**: choose a source. *Take a picture* opens the device camera (webcam on a computer, front camera on a phone) with a live preview on the sheet, then *Snap*. *Upload a picture* picks an image. *Upload a video* picks a video (MP4, WebM or MOV) that plays muted on a loop behind the lines in every step. *Live view* uses the running camera itself, so the lines keep following the camera through every later step. *next* appears once a source is in.
2. **Tune**: three sliders (how many lines, direction, density) redraw the lines live, and **ink** switches between b/w and the picture's own colours (colour travels with every warp). Tuning is optional; *next* is available straight away.
3. **Warp**: drag to pull lines, pinch or scroll to spread or squeeze them, double-tap to clear. *next* is available at any time.
4. **Play**: make the lines move. Pick a **motion** style (*still*, *flow*, *ripple*, *breathe*, *glitch*, *twist*, *jitter*, *wave*) and set its amount and speed; tap the sheet to move the centre of ripple and twist. **Magnet**: lines bend away from the cursor or finger (pull, size). **Sound** turns the microphone on so each stretch of line shakes with its own frequency band (strength). **● rec video** records the moving sheet, with microphone sound when it is on, and downloads it (MP4 or WebM, depending on the browser, up to 2 minutes). All optional.
5. **Done**: the finished sheet, still alive, with *save image* (PNG), *● rec video* and *start over*.

From Tune onward the lines answer the pointer (magnet); the motion you pick in Play keeps running into Done.

The site lives in [`docs/`](docs/) and is plain HTML, CSS and JavaScript with no build step:

| File | Role |
|---|---|
| `docs/index.html` | The page: sheet, step panels, progress |
| `docs/css/style.css` | Styles carried over from the studies |
| `docs/js/scan.js` | Shared scan-line core, extracted unchanged from the studies |
| `docs/js/paper.js` | Shared state and the persistent sheet (layout, drawing, idle motion, export) |
| `docs/js/settings.js` | Fixed look-and-feel values (colours, type, sizes, line rendering, motion, gestures, effects) |
| `docs/js/capture.js`, `tune.js`, `warp.js` | One file per step, adapted from studies 01–03 |
| `docs/js/play.js` | Play step: motion style, magnet and microphone controls |
| `docs/js/record.js` | Video recorder for the sheet (MediaRecorder) |
| `docs/js/app.js` | Linear step controller, ending and reset |

The original studies are in `scan-lines-studies.zip`.

**Publishing:** GitHub Pages must serve from branch `main`, folder `/docs` (Settings → Pages).
