import { CompiledTheme, SEED_NAMES, ThemeDefinition } from '../themes/types';
import { WorkoutButton } from './WorkoutButton';
import { ResponsiveSegmentedControl } from './ResponsiveSegmentedControl';
import { SandboxThemeDraft, draftGradientErrors, surfaceBackground, normalizeSurfaceBackground } from '../themes/sandboxGradients';

const generationModes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'mixed', label: 'Mixed' },
] as const;

export function ThemeDraftEditor({ draft, compilation, update, reset }: {
  draft: SandboxThemeDraft; compilation: CompiledTheme;
  update: (definition: SandboxThemeDraft) => void; reset: () => void;
}) {
  const gradientErrors = draftGradientErrors(draft);
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(normalizeSurfaceBackground(draft), null, 2) + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${draft.id}.theme.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return <section className="sandbox-panel color-context color-context--raised" aria-label="Theme authoring">
    <h2>Theme definition</h2>
    <p>Color anchors generate the palette. Changes stay in this tab; export the definition to review it for shipping.</p>
    <div role="group" aria-label="Color generation mode">
      <h3>Color generation mode</h3>
      <ResponsiveSegmentedControl<ThemeDefinition['mode']> options={generationModes} value={draft.mode}
        onChange={mode => update({ ...draft, mode })} />
    </div>
    <p>{draft.mode === 'mixed'
      ? 'Mixed generates canvas text independently; controls and surface variants follow the surface anchor. Seeds stay unchanged.'
      : 'Light requires light canvas and surface anchors; Dark requires dark anchors. Switching modes keeps your seeds unchanged.'}</p>
    <div className="sandbox-grid">{SEED_NAMES.map(name => <div key={name}><label>{name}
      <input aria-label={`${name} seed`} value={draft.seeds[name]} spellCheck={false}
        onChange={event => update({ ...draft, seeds: { ...draft.seeds, [name]: event.target.value } })} />
    </label>{draft.mode === 'mixed' && (name === 'canvas' || name === 'surface') && <label>
      {name === 'canvas' ? 'Canvas gradient' : 'Surface background'} (optional)
      <input aria-label={name === 'canvas' ? 'Canvas gradient' : 'Surface background'} value={(name === 'canvas' ? draft.gradients?.canvas : surfaceBackground(draft)) ?? ''}
        placeholder={name === 'canvas' ? 'linear-gradient(to bottom, #76b4ff, #fff0a0)' : '#1D2D40 or linear-gradient(to bottom, #C70000, #FF9841)'} spellCheck={false}
        aria-invalid={Boolean(gradientErrors[name])} aria-describedby={gradientErrors[name] ? `${name}-gradient-error` : 'gradient-readability'}
        onChange={event => update(name === 'canvas' ? { ...draft, gradients: { ...draft.gradients, canvas: event.target.value } } : normalizeSurfaceBackground({ ...draft, surfaceBackground: event.target.value }))} />
      {gradientErrors[name] && <span id={`${name}-gradient-error`} role="alert">{gradientErrors[name]} Showing the last valid background.</span>}
    </label>}</div>)}</div>
    {draft.mode === 'mixed' && <>
      <div className="sandbox-grid">{(['onCanvas', 'onSurface'] as const).map(name => <label key={name}>
        {name === 'onCanvas' ? 'on-canvas' : 'on-surface'} seed
        <input aria-label={`${name === 'onCanvas' ? 'on-canvas' : 'on-surface'} seed`}
          value={draft.seeds[name] ?? draft.seeds.text} spellCheck={false}
          onChange={event => update({ ...draft, seeds: { ...draft.seeds, [name]: event.target.value } })} />
      </label>)}</div>
      <p>Mixed text seeds are independent starting colors; the generator may adjust lightness to meet solid-background contrast requirements. Unset seeds use the text anchor.</p>
      <p id="gradient-readability">Gradient readability requires visual review; contrast checks use solid seed colors.</p>
    </>}
    <div className="sandbox-row"><WorkoutButton label="Reset draft" variant="secondary" onClick={reset} /><WorkoutButton label="Export theme definition" onClick={download} disabled={!compilation.valid || Boolean(gradientErrors.canvas || gradientErrors.surface)} /></div>
    <p role={compilation.valid ? 'status' : 'alert'}>{compilation.valid ? 'Draft compiled successfully.' : 'Invalid draft — showing the last valid palette for this theme.'}</p>
    <details open={!compilation.valid}><summary>Generation diagnostics ({compilation.diagnostics.length})</summary>
      <ul>{compilation.diagnostics.map((d, i) => <li key={i}>
        <strong>{d.severity}:</strong> {d.message}
        {d.seed && <div>Seed to adjust: <code>{d.seed}</code></div>}
        {d.colorChange && <div>Color change: <code>{d.colorChange.from}</code> → {d.colorChange.to ? <code>{d.colorChange.to}</code> : 'No valid adjustment found.'}
          {d.colorChange.input && <> (derived input: <code>{d.colorChange.input}</code>)</>}
        </div>}
      </li>)}</ul>
    </details>
    <details><summary>Family overrides ({Object.keys(draft.overrides ?? {}).length})</summary><pre>{JSON.stringify(draft.overrides ?? {}, null, 2)}</pre><p>Overrides replace a family anchor and regenerate every dependent role. Each override requires a reason and must pass the same checks.</p></details>
  </section>;
}
