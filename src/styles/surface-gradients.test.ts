import { readFileSync } from 'fs';
import { join } from 'path';

test.each([
  ['color-context.css', '--image-surface-default'],
  ['theme-sandbox.css', '--sandbox-surface-gradient'],
])('%s paints gradients on containers rather than descendants', (file, token) => {
  const css = readFileSync(join(process.cwd(), 'src/styles', file), 'utf8');
  const rule = css.match(new RegExp(`([^{}]+)\\{[^{}]*background-image: var\\(${token.replace(/-/g, '\\-')}`))!;
  const selector = rule[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
  document.documentElement.setAttribute('data-sandbox-gradient-mode', 'mixed');
  document.body.innerHTML = `<section class="sandbox-panel color-context--raised"><h2>Heading</h2><p>Text</p><label>Field<input /></label><button class="workout-button">Action</button></section>
    <header class="global-header"><a class="logo"><span>Logo</span></a><nav>Navigation</nav></header>
    <article class="workout-card"><div class="workout-head">Card header</div><p>Card text</p></article>
    <aside class="drawer-panel"><p>Drawer text</p></aside>`;
  for (const element of Array.from(document.querySelectorAll('section, header, article, aside'))) expect(element.matches(selector)).toBe(true);
  for (const element of Array.from(document.querySelectorAll('h2, p, label, input, button, a, span, nav, .workout-head'))) expect(element.matches(selector)).toBe(false);
  document.documentElement.removeAttribute('data-sandbox-gradient-mode');
  document.body.innerHTML = '';
});
