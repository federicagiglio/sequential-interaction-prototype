/* Settings — the prototype's fixed look-and-feel values.
   They were tuned with the (now removed) behavior controls panel; the drawing, layout and gesture code read T directly. */
const Settings = (() => {
  const T = {
    // Colors
    bg: '#000000',        // stage and sheet ground
    ink: '#e8e8e8',       // scan lines
    ui: '#e8e8e8',        // labels, buttons, slider thumbs
    rule: '#333333',      // sheet border and panel rules
    // Type
    font: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    fontSize: 11,         // px
    tracking: 0,          // em
    // Dimensions
    aspect: 4 / 3,        // sheet width : height (study 01 frame)
    margin: 4,            // % of sheet between picture and sheet edge
    bracket: 18,          // px, corner brackets
    dockW: 850,           // px, max control bar width
    // Lines
    depth: 0.08,          // × picture height that brightness lifts a line
    smooth: 0.3,          // signal smoothing along a line, 0–0.9
    res: 260,             // px, longest side of the sampled picture
    invert: false,        // dark areas lift instead of bright
    // Motion
    motion: 'none',       // idle motion: none | wave | bounce | breathe | jitter
    amp: 6,               // px
    speed: 0.5,           // Hz
    crossfade: 900,       // ms, photo → lines
    fade: 450,            // ms, panel transition
    // Warp gestures
    brush: 12,            // % of picture height
    wheel: 1,             // × scroll sensitivity
    dbl: 300,             // ms double-tap window
    ringA: 0.35,          // brush ring opacity
    ringHold: 400,        // ms the ring stays after scrolling
    // Effects
    glow: 0,              // px blur
    lineA: 1,             // line opacity
    underlay: 0,          // photo opacity kept under the lines
  };
  const s = document.documentElement.style;
  s.setProperty('--bg', T.bg); s.setProperty('--ink', T.ui); s.setProperty('--line', T.rule);
  s.setProperty('--mono', T.font); s.setProperty('--size', T.fontSize + 'px'); s.setProperty('--track', T.tracking + 'em');
  s.setProperty('--bracket', T.bracket + 'px'); s.setProperty('--dock-w', T.dockW + 'px'); s.setProperty('--fade', T.fade / 1000 + 's');
  return { T };
})();
