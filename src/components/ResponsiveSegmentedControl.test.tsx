import { act, fireEvent, render, screen } from '@testing-library/react';
import { ResponsiveSegmentedControl } from './ResponsiveSegmentedControl';

const OPTIONS = [
  { value: 'first', label: 'First option' },
  { value: 'second', label: 'Second option' },
  { value: 'third', label: 'Third option' },
] as const;

let containerWidth = 600;
let optionWidth = 150;
let resizeCallback: ResizeObserverCallback;

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

const rectangle = (width: number) =>
  ({
    bottom: 0,
    height: 0,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);

describe('ResponsiveSegmentedControl', () => {
  beforeEach(() => {
    containerWidth = 600;
    optionWidth = 150;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains('segmented-control-group')) {
          return rectangle(containerWidth);
        }
        if (this.classList.contains('segmented-control__measure-option')) {
          return rectangle(optionWidth);
        }
        return rectangle(0);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps equal segments in one fully rounded row when all labels fit', () => {
    const { container } = render(
      <ResponsiveSegmentedControl
        options={OPTIONS}
        value="second"
        onChange={jest.fn()}
      />
    );

    const rows = container.querySelectorAll(
      '.segmented-control-group > .segmented-control'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveClass('segmented-control--single');
    expect(rows[0]).toHaveStyle({ width: '100%' });
    expect(screen.getByRole('button', { name: 'Second option' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('splits into linked rows without stretching a partial final row', () => {
    containerWidth = 320;

    const { container } = render(
      <ResponsiveSegmentedControl
        options={OPTIONS}
        value="first"
        onChange={jest.fn()}
      />
    );

    const rows = container.querySelectorAll(
      '.segmented-control-group > .segmented-control'
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveClass('segmented-control--first');
    expect(rows[0]).toHaveStyle({ width: '100%' });
    expect(rows[1]).toHaveClass('segmented-control--last');
    expect(rows[1]).toHaveStyle({ width: '50%' });
  });

  it('reflows after resizing and reports the selected option', () => {
    const onChange = jest.fn();
    const { container } = render(
      <ResponsiveSegmentedControl
        options={OPTIONS}
        value="first"
        onChange={onChange}
      />
    );

    containerWidth = 320;
    act(() => resizeCallback([], {} as ResizeObserver));

    expect(
      container.querySelectorAll('.segmented-control-group > .segmented-control')
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Third option' }));
    expect(onChange).toHaveBeenCalledWith('third');
  });
});
