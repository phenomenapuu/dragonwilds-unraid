---
name: Dragonwilds Server Dashboard
description: A dark operate board that answers "is the server fine?" in one glance, phone first.
colors:
  bg: "#0b0d10"
  surface: "#14181d"
  surface-2: "#1a1f25"
  line: "#242a31"
  line-strong: "#323a44"
  fg: "#e9ecef"
  fg-mid: "#a8b1bc"
  fg-dim: "#77818d"
  ember: "#f2803c"
  ember-ink: "#1a0c04"
  ok: "#56c68a"
  warn: "#e3b341"
  bad: "#f06a6a"
  ok-wash: "color-mix(in srgb, #56c68a 12%, #14181d)"
  warn-wash: "color-mix(in srgb, #e3b341 13%, #14181d)"
  bad-wash: "color-mix(in srgb, #f06a6a 13%, #14181d)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  wordmark:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "0.08em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  log:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
rounded:
  hairline: "2px"
  focus: "4px"
  field: "8px"
  control: "9px"
  surface: "12px"
  pill: "999px"
  dot: "50%"
spacing:
  "2xs": "0.35rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "0.9rem"
  lg: "1rem"
  xl: "1.25rem"
  "2xl": "1.5rem"
  "3xl": "2rem"
  "4xl": "2.5rem"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.6rem 0.95rem"
    height: "2.5rem"
  button-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.ember-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.6rem 0.95rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, #f2803c 88%, #000)"
    textColor: "{colors.ember-ink}"
  button-risk:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.bad}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.6rem 0.95rem"
    height: "2.5rem"
  button-risk-hover:
    backgroundColor: "{colors.bad-wash}"
    textColor: "{colors.bad}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.fg-mid}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.6rem 0.95rem"
    height: "2.5rem"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.45rem 0.6rem"
    height: "2.25rem"
  alert-bad:
    backgroundColor: "{colors.bad-wash}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "0.75rem 0.9rem"
  alert-warn:
    backgroundColor: "{colors.warn-wash}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "0.75rem 0.9rem"
  player-chip:
    backgroundColor: "{colors.ok-wash}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.7rem"
  tally:
    backgroundColor: "transparent"
    textColor: "{colors.fg-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.05rem 0.5rem"
  fact-cell:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    typography: "{typography.title}"
    padding: "0.7rem 0.85rem 0.75rem"
  log-pane:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.log}"
    rounded: "{rounded.surface}"
    padding: "0.75rem 0.9rem"
    height: "min(60vh, 26rem)"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.surface}"
    padding: "1.25rem"
    width: "min(24rem, calc(100vw - 2rem))"
---

# Design System: Dragonwilds Server Dashboard

## Overview

**Creative North Star: "The Watchfire Board"**

A dark board hung on a wall in a room where nothing usually happens. It is read from the doorway, at arm's length, in one glance, and most of the time the correct response to it is to walk away. The board is ink and hairlines; the only warm thing on it is a single ember — the drawn scale-shingle mark, the primary action, and the live data bar. When the server is fine, the board is monochrome plus one small green dot. When something breaks, color and position arrive together at the top of the page and there is no mistaking it.

Density is high and ornament is zero. There are no cards floating over a background, no gradients, no illustration, no photography. Six facts sit in a hairline-ruled grid like a ledger; players, activity, backups, and errors are plain rules-between-rows lists; the log is a raw monospace pane. Everything that can be a line instead of a box is a line. The whole surface is built from three surface tones and two line weights, which is what lets a single 4px halo around one dot read as an event.

The type is a single system sans at a compressed ramp — 0.8125rem to 1.75rem covers every role except the one headline that grows to 2.5rem on a desktop width — with a monospace face reserved strictly for machine text. Numbers are tabular everywhere, because the page repaints every five seconds and digits must not jitter. Respecting the viewer's light/dark preference is structural, not a toggle: the same tokens flip to warm paper (#f4f2ef) and darkened state hues at the OS level.

**Key Characteristics:**
- Dark-first, with a paper-warm light theme driven by `prefers-color-scheme`
- One ember accent; all other color is state
- Flat: 1px hairlines and three surface tones, no drop shadows
- Ledger density — ruled grids and rules-between-rows, not cards
- Tabular numerals on every polled value
- A drawn mark and drawn indicators; no glyph icons, no emoji
- Phone-first single column, widening 2 → 3 → 6 columns

## Colors

An ink-and-ash neutral field with exactly one warm accent and a three-state signal set that appears only when it means something.

### Primary
- **Ember** (`{colors.ember}`): The one warm color. It belongs to the drawn mark, the primary action (Back up now), the live gauge fills, the focus ring, the caret and checkbox accent, and the spinner's leading arc. It never labels a state and never decorates a heading. In light mode it deepens to a burnt rust (`#a8460f`) to hold contrast on paper.
- **Ember Ink** (`{colors.ember-ink}`): The near-black brown that sits on Ember; the only text color paired with the accent fill.

### Secondary
- **Signal Green / Amber / Coral** (`{colors.ok}` / `{colors.warn}` / `{colors.bad}`): The three-state vocabulary. Green marks a live player, a join, a healthy build, and the calm beacon; amber marks "starting", "may not be reachable", a gauge past 75%, and a stalled backup; coral marks stopped, missing, out-of-memory, an error line, and a gauge past 90%. In light mode all three darken sharply (`#18794e`, `#855a06`, `#a8291c`) so they stay legible on a phone outdoors.
- **Status washes** (`{colors.ok-wash}` / `{colors.warn-wash}` / `{colors.bad-wash}`): The 12–13% mixes of each signal into the surface. This is how state enters a container.

### Neutral
- **Board** (`{colors.bg}`): The page field behind everything, and the color the fact grid shows between its rules.
- **Surface** (`{colors.surface}`) and **Surface Raised** (`{colors.surface-2}`): The only two container tones — panes, dialogs, buttons at rest; the raised tone is hover and the skeleton sheen highlight.
- **Line** (`{colors.line}`) and **Line Strong** (`{colors.line-strong}`): The hairline that rules the fact grid, list rows, and section headings; the stronger weight outlines interactive things (buttons, fields, dialog, scrollbar thumb).
- **Ink / Muted / Dim** (`{colors.fg}` / `{colors.fg-mid}` / `{colors.fg-dim}`): Primary reading text; supporting prose and secondary labels; timestamps, units, column headers, and stale values.

### Named Rules
**The State-Only Color Rule.** Hue means something or it is not there. Green, amber and coral are reserved for the health of the server; Ember is reserved for the accent role above. Nothing on this board is colored to look nice.

**The Wash-Not-Fill Rule.** State enters a container as a 12–13% wash of the signal into the surface, with the border mixed 30–45% toward the signal — never as a saturated fill behind reading text. The only saturated state surface allowed is the beacon dot itself.

**The Words-With-The-Color Rule.** Every colored state is also written in words within the same element. The beacon never carries meaning alone; the verdict line beside it always names the state, and a screen-reader status line repeats label, line and note.

## Typography

**Display / Body Font:** the platform's own UI sans (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`) — one family for every text role.
**Mono Font:** the platform's own monospace (`ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`), for the log pane, error text, and the owner ID.

**Character:** Utilitarian and unbranded on purpose — it is the operating system's voice, not a personality, which keeps the page feeling like an instrument panel rather than a product page. The pairing's only expressive moves are the tight negative tracking on large text and the heavy-but-not-black 650 weight of the verdict.

### Hierarchy
- **Display** (650, 1.75rem → 2.125rem at 40rem → 2.5rem at 60rem, 1.15, −0.02em): The verdict line only. One per page, balanced with `text-wrap: balance`.
- **Title** (600, 1.375rem, 1.2, −0.01em, tabular): The six fact values in the metrics band.
- **Headline** (600, 1rem, −0.01em): Section headings, underlined by a single hairline with 0.5rem of clearance.
- **Body** (400, 0.875rem, 1.55): All reading text — the verdict note (capped at 60ch), alerts, list rows, dialog copy, buttons at weight 600.
- **Label** (400, 0.8125rem): Fact names, sub-values, timestamps, column headers, the section note, the colophon.
- **Wordmark** (600, 0.8125rem, 0.08em, uppercase): The masthead word beside the mark. This is the identity lockup, and it is the only uppercase letterspaced text on the surface.
- **Mono** (0.8125rem/1.4) and **Log** (0.75rem/1.6): Machine text — grouped error strings and the owner ID at the larger size, the live log at the smaller.

### Named Rules
**The One Headline Rule.** Exactly one element on the page gets display size: the verdict. Section headings never exceed 1rem. Anything that wants to be bigger is competing with the answer the owner came for.

**The Tabular Rule.** Any value that can change between five-second polls is set in `font-variant-numeric: tabular-nums` — fact values, playtimes, visit counts, file sizes, tallies, timestamps. Digits may not shift the layout on refresh.

**The Machine-Voice Rule.** Monospace is evidence, not emphasis. It is used only for text the server produced verbatim (log lines, error strings, the owner ID) and never for headings, labels or UI copy.

## Layout

A single centered column, `max-width: 68rem`, with inline padding that respects the notch (`max(1rem, env(safe-area-inset-left))`) and block padding of 1.25rem/3rem that opens to 2rem/4rem on wider screens. The reading order is fixed and is the priority order: masthead, verdict, fact band, controls, then the detail sections, then the log, then the colophon.

Two breakpoints, both in rem so they track text size: **40rem** turns the fact band from 2 to 3 columns and steps the verdict up; **60rem** takes the fact band to 6 columns (one row, all six facts visible at once) and splits the detail sections into an asymmetric 1.25fr / 1fr pair with a 2.5rem gutter. Below 40rem everything is one column and every control is at least a 2.5rem tap target.

The spacing rhythm is coarse and small-numbered: 0.35/0.5/0.75/0.9rem inside components, 1/1.25/1.5rem between blocks, 2/2.5rem between sections. Sections within a stack are separated by 2rem of space plus their own ruled heading; nothing is separated by a shadow or a box.

### Named Rules
**The Ruled-Grid Rule.** The fact band is a grid of cells sharing 1px hairlines — top and left borders on the container, right and bottom on each cell — with no gap and no background of its own. Facts are cells in a ledger, not a row of cards.

**The Glance Budget Rule.** Everything needed to answer "is the server fine?" — beacon, verdict, note, alerts, and the six facts — lands above the controls, in one phone screen. Anything that requires reading rather than glancing goes below.

## Elevation & Depth

This system is flat. There are no drop shadows anywhere on the page. Depth is built from exactly three ingredients: three surface tones (board, surface, raised surface), two hairline weights, and the fact that interactive things carry the stronger line while static panes carry the weaker one. Hover does not lift anything — it changes fill and border color; the active button moves half a pixel down (`translateY(0.5px)`) and that is the entire tactile vocabulary. The one modal in the system dims the page with a plain 60% black backdrop rather than casting light.

### Shadow Vocabulary
- **Beacon halo** (`box-shadow: 0 0 0 4px color-mix(in srgb, <signal> 20–22%, transparent)`): A spread-only ring, no blur and no offset, around the single state dot in the verdict line. It is a signal, not a shadow: it exists so a 0.5em dot reads from a phone at arm's length.
- **Scrollbar thumb inset** (`border: 3px solid var(--surface)`): The log's WebKit thumb is inset by a border in the pane color, not floated above it.

### Named Rules
**The No-Shadow Rule.** Surfaces never cast. If an element needs to separate from its neighbor, use a hairline, a surface tone, or space — in that order. The beacon halo is the only `box-shadow` on the surface and it is a spread ring with zero blur and zero offset.

## Shapes

Soft-rectangular and quietly consistent. Containers that hold content — alerts, the log pane, dialogs — use a 12px radius; controls use 9px; fields use 8px; the focus ring rounds at 4px; gauges at 2px. Anything that counts or names a thing is a full pill (999px): player chips and the error tally. Round (50%) is reserved for indicators that report live state: the beacon, the online dot before a roster name, and the spinner.

Borders are the primary form-giver: 1px, no exceptions, in `line` for static structure and `line-strong` for anything you can touch. The identity mark is a five-sided scale shingle — `polygon(50% 0%, 100% 28%, 82% 100%, 18% 100%, 0% 28%)` as a CSS clip-path at 22px in the masthead, and the same silhouette drawn as a stroked path with a filled inner shingle in the 32px favicon. It is the only non-rectilinear shape in the system.

### Named Rules
**The Drawn-Mark Rule.** Every symbol on this surface is drawn in CSS or SVG — the shingle mark, the beacon, the roster dot, the gauge bar, the spinner. No emoji, no icon font, no icon package, no raster images.

**The Radius-By-Role Rule.** Radius encodes what a thing is: 12px content containers, 9px controls, 8px fields, pill for counts and names, circle for live state. Don't pick a radius for looks; pick it from the role.

## Components

### Buttons
- **Shape:** Gently rounded rectangle (9px), minimum 2.5rem tall, 0.6rem/0.95rem padding, body size at weight 600, set on a single line.
- **Default:** Surface fill, strong hairline border, primary ink. Used for Start and Restart.
- **Primary:** Ember fill, ember border, ember-ink text. Exactly one per view — the safe forward action (Back up now, Log in inside the dialog).
- **Risk:** Surface fill with coral text and a border mixed 40% toward coral; on hover the coral wash fills it and the border goes full coral. Used for Stop and for the confirm-dialog's OK.
- **Quiet:** Transparent, strong border, muted text that goes to full ink on hover. Used for the masthead auth toggle and dialog Cancel.
- **Hover / Focus / Disabled:** Hover shifts background and border only (150ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`); active nudges 0.5px down; disabled drops to 0.4 opacity with `not-allowed`. Focus-visible is a global 2px ember outline at 2px offset, never removed.

### Chips
- **Player chip:** Pill with the green wash and a border mixed 30% toward green, name at weight 600 with the session duration as muted small text on the same baseline. Green here means "online now".
- **Tally:** Pill outline only, label size, tabular, dim by default; flips to coral text and a coral-mixed border the moment the count is non-zero.

### Cards / Containers
- **Alerts** are the only true cards: 12px radius, 1px border, surface fill by default, wash fill and signal-mixed border when leveled. Title in weight 650, body in muted text tinted 45% toward the signal. They stack at 0.5rem directly under the verdict note.
- **Detail sections** are not cards at all — a ruled heading and content directly on the board.
- **Log pane and dialogs** share the 12px radius, surface fill, and a hairline (strong on the dialog).

### Inputs / Fields
- **Style:** Surface fill, 1px strong hairline, 8px radius, 0.45rem/0.6rem padding, 2.25rem minimum height, body type, dim placeholder, ember caret.
- **Focus:** Global ember focus-visible outline; no glow, no border animation.
- **Switch:** Inline label at label size in muted text, native checkbox at 1rem with `accent-color` set to ember. Native controls are tinted, not replaced.

### Navigation
There is none. The page is a single scroll with a masthead that carries only the mark, the wordmark, and the auth toggle.

### The Verdict Block
The signature component. A beacon dot (0.5em, circular, state-colored, haloed, nudged −0.15em to sit on the cap line) followed by one balanced headline in display type, an optional muted note capped at 60ch, and a stack of alerts. The beacon has four levels (`idle`, `ok`, `warn`, `bad`); idle is dim grey with no halo. A visually hidden `role="status"` paragraph mirrors the whole block as one sentence, and the document title is rewritten to `<label> · <server name>` so the answer survives into the tab strip.

### The Fact Band
Six ledger cells: label at label size in dim, value at title size tabular with ellipsis overflow, optional sub-line in dim. Memory and CPU carry a 3px gauge — a hairline-colored track with an ember bar scaled by `transform: scaleX()` over 450ms, switching to amber at 75% and coral at 90%. A fact with no data takes `.is-stale` and drops its value to dim. Before the first poll, values and sub-lines are masked by a 1.4s linear sheen sweeping the surface/raised gradient; every animation on the page collapses to 0.01ms under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** answer the question in the first screen: beacon, plain-language verdict, note, alerts, six facts — in that order, above the controls.
- **Do** write the state in words next to any color that carries it, and mirror the verdict into a visually hidden `role="status"` line.
- **Do** use `font-variant-numeric: tabular-nums` on every value that repolls.
- **Do** separate with hairlines (1px `line`), surface tone, or space — in that order — before reaching for any other device.
- **Do** give interactive elements the stronger hairline (`line-strong`) and static panes the lighter one.
- **Do** keep exactly one primary (ember) button per view, on the safest forward action.
- **Do** put destructive actions in the risk style and confirm them in a dialog that says how many players will be disconnected.
- **Do** keep tap targets at 2.5rem minimum and let the whole layout work in one phone-width column.
- **Do** define new colors as `color-mix()` against the existing tokens so they follow the light-mode flip automatically.
- **Do** honor `prefers-color-scheme` and `prefers-reduced-motion` in anything new.

### Don't:
- **Don't** add a `box-shadow` other than the beacon's zero-blur spread ring. Nothing on this board floats.
- **Don't** color anything decoratively. Green, amber and coral mean server state; ember means accent, action or live data.
- **Don't** fill a container with a saturated state color behind reading text — use the 12–13% wash with a signal-mixed border.
- **Don't** give any element display size except the verdict, and don't let a section heading exceed 1rem.
- **Don't** use emoji, an icon font, an icon package, or a raster image. Symbols are drawn in CSS or SVG.
- **Don't** reuse the uppercase letterspaced treatment anywhere but the masthead wordmark — it is identity, not a heading device, and this surface has no eyebrows or kickers above its headings.
- **Don't** wrap the fact band's cells in individual cards, gaps, or backgrounds; they share hairlines.
- **Don't** use monospace for anything the server did not emit verbatim.
- **Don't** add a webfont, a CSS framework, an icon library, or any npm dependency — the page is hand-written HTML, CSS and JS served from the container, and any visual addition must survive that.
- **Don't** remove or restyle the focus ring; it is a 2px ember outline at 2px offset, page-wide.
