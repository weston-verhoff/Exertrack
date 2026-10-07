# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

### Generated themes

Edit `src/themes/definitions.ts`, then run `npm run themes:generate`. This is the
only hand-authored palette source: eight six-digit sRGB anchors per theme
(`canvas`, `surface`, `text`, `primary`, `secondary`, `info`, `success`, `danger`),
plus the ID, display name, light/dark mode and generator version. Add a definition
and regenerate to include a new theme in styles, settings, onboarding and the
sandbox. Keep existing IDs to preserve saved preferences (`blue-pink` still maps
to `baseball`). Never edit generated CSS or the generated registry by hand.

`compileTheme` in `src/themes/compiler.ts` is the same pure compiler used by build
tooling and the lazy-loaded sandbox. It returns `tokens`, `diagnostics`,
`provenance`, `pairings` and `valid`. Ordinary pages consume static generated CSS;
they do not compile palettes. `npm run themes:check` verifies valid definitions
and exact generated output; both `npm start` and `npm run build` reject stale
files. Changes to generation algorithms must be followed by regeneration and
all-theme review. The version field is an explicit compatibility gate, not a
promise to preserve old algorithm output after editing version 1.

The generator works in OKLCH and reduces chroma at fixed hue/lightness to fit
sRGB. It checks contrast on serialized output, not on OKLCH lightness. Light
surface anchors require OKLCH L >= 0.85 and dark surfaces L <= 0.45. Text anchors
must already reach 4.5:1 on the supplied canvas and surface. Derived foregrounds
are solved against all supported surfaces, action labels stay constant across
states, and essential boundaries meet 3:1. A lightness adjustment beyond 0.48 or
near-identical primary/secondary, primary/danger, or success/danger anchors is an
error. Adjustments exceeding 0.15 produce a review warning. Near-neutral colors
remain supported. These constraints deliberately reject unsuitable palettes
instead of silently flattening them into black and white.

For one theme's identity, adjust its seeds. For a problem shared across themes,
correct the compiler recipe or component pairing. For an intentional exception,
`overrides: { primary: { color: '#8238bd', reason: '...' } }` replaces the family
anchor and regenerates its dependent states, foregrounds, borders and aliases.
Supported families are primary, secondary, info, success and danger; overrides
cannot bypass validation. All eight shipped definitions currently need zero
overrides. Provenance records the seed/override and generation rule.

`src/styles/color-context.css` owns shared component recipes. `--_context-strong`
and its foreground/hover/pressed partners are for actions; `--_context-emphasis`
and `--_context-on-emphasis` are for non-interactive card headers. Never pair a
subtle background with a solid-accent foreground. Do not add theme-name selectors
to repair components. Functional surfaces are opaque. Optional atmosphere artwork
is restricted to canvas/hero backgrounds; every generated theme explicitly resets
all optional images and chooses brand assets for its mode. Chart labels/tooltips
use the same semantic contexts, with solid plot backgrounds to avoid overlapping
fills changing line contrast.

In the private sandbox, edit seeds, inspect adjustments/required pairings and
provenance, and export the valid definition as JSON to copy into the typed source.
Drafts persist only in this tab's session storage. Invalid edits retain the last
valid palette in memory (or the shipped baseline after reloading), mark the
preview stale, and disable export. Reset restores the shipped definition. Portals
and charts update with draft changes, without writing account preferences.

Validation: run `npm test -- --watchAll=false --runInBand`, `npm run build`, and
the browser verification below. Set `THEME_CAPTURE_DIR` to save desktop/mobile
screen and drawer PNGs, resolved tokens and reports; set `THEME_AUDIT=1` for
rendered text, hover/pressed/focus, portal, and live-draft checks. Optional
`THEME_REVIEW_THEMES=default,neon,sunset` narrows a pilot review; the default is all
eight. Generated token checks do not establish complete accessibility: inspect
artwork, canvas chart labels, color differentiation and hierarchy visually.
The rendered audit labels unsupported compositions instead of inventing a pass.

### Private theme sandbox

Visit `/theme-sandbox` or use the **Theme Sandbox** header link when signed in as
`westonverhoff@gmail.com`. Other accounts are redirected to the dashboard. The
page previews all eight themes in a same-origin iframe with its own theme root,
production styles, body background, and portal containers, without changing the saved
app theme. Both the parent route and `/theme-sandbox/preview` enforce the owner
guard. Preview auth does not synchronize account themes. The preview selection
is remembered for the browser tab. It shows shared
controls and surface recipes, real workout/template cards, an interactive Chart.js
chart, representative dashboard/builder layouts, inventories the loaded theme tokens, and includes
a semantic foreground/background contrast matrix. Translucent backgrounds and
artwork require visual inspection; the contrast explorer does not guess their
backdrop. This is a client-side inspection page using sample data, with no
privileged backend endpoints or account/workout writes. The real workout editor
uses local field state and intercepts its production button handlers.

After building, run `node scripts/verify-theme-sandbox.cjs` with Playwright
available (or set `SANDBOX_PLAYWRIGHT_PATH` to its package directory). This local
headless Edge regression mocks auth, blocks backend requests, and checks a Fall
parent against a Neon iframe, artwork resets, CSS isolation, drawer portals,
real card/editor actions, chart hover feedback, and a narrow viewport.

In the project directory, you can run:

### Environment variables

Create a `.env` file (you can copy `.env.example`) with your Supabase credentials:

These variables are automatically loaded by Create React App during `npm start` and `npm run build`.

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
