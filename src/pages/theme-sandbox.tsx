import { useLayoutEffect, useRef, useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { APP_THEMES, AppTheme, normalizeAppTheme } from '../utils/theme';
import { COMPONENT_TONES } from '../utils/componentTone';
import { contrastRatio } from '../utils/themeContrast';
import { Drawer } from '../components/Drawer';
import { ExerciseChip } from '../components/ExerciseChip';
import { ResponsiveSegmentedControl } from '../components/ResponsiveSegmentedControl';
import { WorkoutButton, WorkoutButtonIntent, WorkoutButtonVariant } from '../components/WorkoutButton';
import '../styles/WorkoutCard.css';
import { ChartSkeleton, WorkoutCardSkeleton } from '../components/LoadingSkeletons';
import { SwitchField } from '../components/SwitchField';
import '../styles/account.css';
import '../styles/theme-sandbox.css';

const contexts = ['canvas', 'default', 'raised', 'inverse', 'selected', 'info', 'success', 'danger'];
const variants: WorkoutButtonVariant[] = ['primary', 'secondary', 'quiet'];
const intents: WorkoutButtonIntent[] = ['neutral', 'positive', 'danger'];
type Token = { name: string; value: string };

function readTokens(element: HTMLElement): Token[] {
  const names = new Set<string>();
  function visit(rules: CSSRuleList) {
    Array.from(rules).forEach(rule => {
      if (rule instanceof CSSStyleRule) {
        Array.from(rule.style).forEach(name => {
          if (/^--(color-|ref-|shadow-|image-|sunset-)/.test(name)) names.add(name);
        });
      } else if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
      else if (rule instanceof CSSImportRule && rule.styleSheet) visit(rule.styleSheet.cssRules);
    });
  }
  Array.from(document.styleSheets).forEach(sheet => {
    try { visit(sheet.cssRules); } catch { /* Cross-origin styles aren't app tokens. */ }
  });
  const computed = getComputedStyle(element);
  return Array.from(names).sort().map(name => ({ name, value: computed.getPropertyValue(name).trim() })).filter(token => token.value);
}

function Rating({ ratio }: { ratio: number | null }) {
  return <span>{ratio === null ? 'Backdrop dependent / inspect visually' : `${ratio.toFixed(2)}:1 · ${ratio >= 7 ? 'AAA text' : ratio >= 4.5 ? 'AA text' : ratio >= 3 ? 'Large text / UI only' : 'Fails AA'}`}</span>;
}

export default function ThemeSandbox() {
  const [theme, setTheme] = useState<AppTheme>(() =>
    normalizeAppTheme(sessionStorage.getItem('iwyn-sandbox-theme')) ??
    normalizeAppTheme(document.documentElement.dataset.theme) ?? 'default'
  );
  const [tokens, setTokens] = useState<Token[]>([]);
  const [query, setQuery] = useState('');
  const [foreground, setForeground] = useState('--color-on-surface');
  const [background, setBackground] = useState('--color-surface-default');
  const [checked, setChecked] = useState(true);
  const [segment, setSegment] = useState('week');
  const [drawer, setDrawer] = useState(false);
  const [message, setMessage] = useState('Interact with the controls to inspect hover, focus, and active states.');
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    sessionStorage.setItem('iwyn-sandbox-theme', theme);
    if (root.current) setTokens(readTokens(root.current));
  }, [theme]);

  const colors = tokens.filter(token => token.name.startsWith('--color-'));
  const lookup = (name: string) => tokens.find(token => token.name === name)?.value ?? '';
  const backgrounds = colors.filter(token => /surface|interactive|accent/.test(token.name) && !/--color-on-|border|hover-on/.test(token.name));
  const foregrounds = colors.filter(token => /--color-on-|--color-content-|--color-chart-series-\d$/.test(token.name));
  const notify = () => setMessage('Demo action completed. No workout or account data was changed.');

  return <div ref={root} data-theme={theme} className="theme-sandbox global-header-offset color-context--canvas">
    <header className="sandbox-intro color-context color-context--raised">
      <p>PRIVATE WORKSPACE · THEME INSPECTION</p>
      <h1>Theme sandbox</h1>
      <p>Eight themes. Real controls. Every color in one place.</p>
      <label>Preview theme <select value={theme} onChange={event => setTheme(event.target.value as AppTheme)}>
        {APP_THEMES.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <p>Your preview is remembered in this tab. Your saved app theme stays unchanged.</p>
      <nav aria-label="Sandbox sections">{['Surfaces', 'Components', 'Contrast', 'Tokens'].map(label => <a key={label} href={`#sandbox-${label.toLowerCase()}`}>{label}</a>)}</nav>
    </header>

    <section id="sandbox-surfaces"><h2>Surfaces & typography</h2>
      <div className="sandbox-grid">{contexts.map(context => <article key={context} className={`sandbox-panel color-context color-context--${context}`}>
        <h3>{context}</h3><p>Body text on this surface.</p><p className="sandbox-muted">Muted text and supporting details.</p>
        <a href="#sandbox-contrast">Inspect color contrast</a><hr />
        <WorkoutButton label="Action" onClick={notify} /><WorkoutButton label="Secondary" variant="secondary" onClick={notify} />
      </article>)}</div>
      <div className="page-hero-surface sandbox-panel"><h3>Hero & theme artwork</h3><div className="auth-logo" /><p>Inverse text, brand artwork, and decorative background.</p></div>
    </section>

    <section id="sandbox-components"><h2>Components & states</h2><p role="status">{message}</p>
      <div className="sandbox-grid">{[undefined, ...COMPONENT_TONES].map(tone => <article key={tone ?? 'neutral'} data-tone={tone} className="sandbox-panel color-context color-context--default">
        <h3>{tone ?? 'Neutral'} component context</h3>
        {variants.map(variant => <div key={variant} className="sandbox-row">{intents.map(intent => <WorkoutButton key={intent} label={`${variant} ${intent}`} variant={variant} intent={intent} onClick={notify} />)}</div>)}
        <div className="sandbox-row"><WorkoutButton label="Disabled" disabled /><WorkoutButton label="Saving" loading /><WorkoutButton label="Add" icon={<Plus size={18} />} iconOnly onClick={notify} />
        {(['sm', 'md', 'lg'] as const).map(size => <WorkoutButton key={size} label={size} size={size} rounded="full" onClick={notify} />)}</div>
        <ExerciseChip name="Bench press" meta="3 sets · 8 reps · 135 lb" icon={<Dumbbell size={18} />} ariaLabel={`Inspect ${tone ?? 'neutral'} exercise`} onClick={notify} />
        <div className="auth-form">
          <label className="account-settings">Text input<input placeholder="Workout name" /></label>
          <label className="account-settings">Number input<input type="number" defaultValue={135} /></label>
          <label className="account-settings">Date input<input type="date" defaultValue="2026-10-06" /></label>
          <label>Select<select defaultValue="strength"><option value="strength">Strength</option><option value="cardio">Cardio</option></select></label>
          <label>Notes<textarea placeholder="Add a note…" /></label>
          <label className="account-settings">Disabled<input disabled value="Unavailable" readOnly /></label>
          <label className="account-settings">Invalid input<input aria-invalid="true" defaultValue="Invalid value" /></label>
          <label><input type="checkbox" defaultChecked /> Checkbox</label>
          <label><input type="radio" name={`sandbox-radio-${tone}`} defaultChecked /> First choice</label>
          <label><input type="radio" name={`sandbox-radio-${tone}`} /> Second choice</label>
          <label>Range<input type="range" defaultValue={60} /></label>
        </div>
        <SwitchField label="Reminders enabled" checked={checked} onChange={setChecked} />
        <ResponsiveSegmentedControl options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} value={segment} onChange={setSegment} />
        <WorkoutButton label="Preview drawer" variant="secondary" onClick={() => setDrawer(true)} />
      </article>)}</div>
      <div className="sandbox-grid">{['future-workout', 'past-workout', 'highlighted', 'template-workout', 'empty-workout-card', 'plan-workout-card'].map(variant => <article key={variant} className={`workout-card sandbox-panel ${variant}`}>
        <div className="workout-head">{variant}</div><h3>Upper body session</h3><p>Bench press · 3 sets · 8 reps</p><p className="sandbox-muted">Sample workout summary</p><div className="sandbox-row"><WorkoutButton label="Details" variant="secondary" onClick={notify} /><WorkoutButton label="Complete" intent="positive" onClick={notify} /></div>
      </article>)}</div>
      <div className="sandbox-grid"><WorkoutCardSkeleton /><ChartSkeleton />
        <article className="sandbox-panel color-context color-context--raised"><h3>Chart colors</h3><svg viewBox="0 0 300 120" role="img" aria-label="Three theme chart series">
          {[1, 2, 3].map((series, index) => <g key={series}><rect x="0" y={index * 40} width="300" height="36" fill={`var(--color-chart-series-${series}-fill)`} /><path d={`M 5 ${index * 40 + 30} L 70 ${index * 40 + 12} L 150 ${index * 40 + 24} L 295 ${index * 40 + 5}`} fill="none" stroke={`var(--color-chart-series-${series})`} strokeWidth="3" /></g>)}
        </svg></article>
      </div>
    </section>

    <section id="sandbox-contrast" className="sandbox-panel color-context color-context--raised"><h2>Contrast explorer</h2>
      <p>Solid color text: AA ≥ 4.5:1, AAA ≥ 7:1. Large text and non-text UI: ≥ 3:1. Artwork, opacity, focus visibility, and disabled controls need visual inspection.</p>
      <div className="sandbox-row">{[{ label: 'Foreground', value: foreground, change: setForeground }, { label: 'Background', value: background, change: setBackground }].map(control => <label key={control.label}>{control.label}<select value={control.value} onChange={event => control.change(event.target.value)}>{colors.map(token => <option key={token.name} value={token.name}>{token.name}</option>)}</select></label>)}</div>
      <div className="sandbox-pair" style={{ color: `var(${foreground})`, backgroundColor: `var(${background})` }}><h3>The quick brown fox</h3><p>Normal text · 0123456789 · Aa Bb Cc</p></div>
      <p><Rating ratio={contrastRatio(lookup(foreground), lookup(background))} /></p>
      <details><summary>All semantic foreground / surface combinations ({foregrounds.length * backgrounds.length})</summary>
        <div className="sandbox-table-scroll"><table><caption>Each cell shows contrast and a live text sample. These include exploratory combinations, not just pairs used by the app.</caption><thead><tr><th scope="col">Foreground / background</th>{backgrounds.map(token => <th scope="col" key={token.name}>{token.name}</th>)}</tr></thead><tbody>{foregrounds.map(fg => <tr key={fg.name}><th scope="row">{fg.name}</th>{backgrounds.map(bg => <td key={bg.name}><div className="sandbox-pair" style={{ color: `var(${fg.name})`, backgroundColor: `var(${bg.name})` }}>Aa 123</div><Rating ratio={contrastRatio(fg.value, bg.value)} /></td>)}</tr>)}</tbody></table></div>
      </details>
    </section>

    <section id="sandbox-tokens"><h2>Complete theme token inventory</h2><label>Filter tokens <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search surface, border, chart…" /></label>
      <div className="sandbox-token-grid">{tokens.filter(token => `${token.name} ${token.value}`.toLowerCase().includes(query.toLowerCase())).map(token => <article key={token.name} className="sandbox-token color-context color-context--raised">
        <div className="sandbox-swatch" style={token.name.startsWith('--image-') ? { backgroundImage: `var(${token.name})` } : { backgroundColor: `var(${token.name})` }} />
        <code>{token.name}</code><small>{token.value}</small>
      </article>)}</div>
    </section>
    <Drawer theme={theme} isOpen={drawer} onClose={() => setDrawer(false)}><h2>Preview drawer</h2><p>Overlay, backdrop, close control, and opaque surface.</p><div className="auth-form"><label>Drawer input<input placeholder="Sample value" /></label></div><WorkoutButton label="Close preview" onClick={() => setDrawer(false)} /></Drawer>
  </div>;
}
