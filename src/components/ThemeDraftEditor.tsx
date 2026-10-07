import { CompiledTheme, SEED_NAMES, ThemeDefinition } from '../themes/types';
import { WorkoutButton } from './WorkoutButton';

export function ThemeDraftEditor({ draft, compilation, update, reset }: {
  draft: ThemeDefinition; compilation: CompiledTheme;
  update: (definition: ThemeDefinition) => void; reset: () => void;
}) {
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2) + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${draft.id}.theme.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return <section className="sandbox-panel color-context color-context--raised" aria-label="Theme authoring">
    <h2>Theme definition</h2>
    <p>Eight anchors generate the palette. Changes stay in this tab; export the definition to review it for shipping.</p>
    <div className="sandbox-grid">{SEED_NAMES.map(name => <label key={name}>{name}
      <input aria-label={`${name} seed`} value={draft.seeds[name]} spellCheck={false}
        onChange={event => update({ ...draft, seeds: { ...draft.seeds, [name]: event.target.value } })} />
    </label>)}</div>
    <div className="sandbox-row"><WorkoutButton label="Reset draft" variant="secondary" onClick={reset} /><WorkoutButton label="Export theme definition" onClick={download} disabled={!compilation.valid} /></div>
    <p role={compilation.valid ? 'status' : 'alert'}>{compilation.valid ? 'Draft compiled successfully.' : 'Invalid draft — showing the last valid palette for this theme.'}</p>
    <details open={!compilation.valid}><summary>Generation diagnostics ({compilation.diagnostics.length})</summary>
      <ul>{compilation.diagnostics.map((d, i) => <li key={i}><strong>{d.severity}:</strong> {d.message}</li>)}</ul>
    </details>
    <details><summary>Family overrides ({Object.keys(draft.overrides ?? {}).length})</summary><pre>{JSON.stringify(draft.overrides ?? {}, null, 2)}</pre><p>Overrides replace a family anchor and regenerate every dependent role. Each override requires a reason and must pass the same checks.</p></details>
  </section>;
}
