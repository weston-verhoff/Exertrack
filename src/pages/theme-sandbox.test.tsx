import { render, screen } from '@testing-library/react';
import ThemeSandbox from './theme-sandbox';

test('loads the preview in a separate same-origin document without changing the parent theme', () => {
  document.documentElement.dataset.theme = 'fall';
  const { container } = render(<ThemeSandbox />);
  const frame = screen.getByTitle('Isolated theme sandbox') as HTMLIFrameElement;
  expect(frame).toHaveAttribute('src', '/theme-sandbox/preview');
  expect(frame.contentDocument).not.toBe(document);
  expect(frame.contentDocument?.documentElement?.dataset.theme).not.toBe('fall');
  expect(document.documentElement.dataset.theme).toBe('fall');
  expect(container.querySelector('.theme-sandbox')).toBeNull();
});
