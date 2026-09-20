import React, {
  CSSProperties,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import '../styles/segmented-control.css';

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
}

interface ResponsiveSegmentedControlProps<T extends string | number> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

interface SegmentedControlRowStyle extends CSSProperties {
  '--segmented-columns': number;
}

export function ResponsiveSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: ResponsiveSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(Math.max(options.length, 1));

  const calculateColumnCount = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || options.length === 0) return;

    const availableWidth = container.getBoundingClientRect().width;
    const optionWidths = Array.from(measure.children).map(
      child => child.getBoundingClientRect().width
    );
    const widestOption = Math.max(...optionWidths, 44);

    if (availableWidth <= 0 || widestOption <= 0) return;

    // Two pixels account for the row's outer border. Each row then uses the
    // widest label as its minimum equal-width segment size.
    const nextColumnCount = Math.max(
      1,
      Math.min(options.length, Math.floor((availableWidth - 2) / widestOption))
    );
    setColumnCount(current =>
      current === nextColumnCount ? current : nextColumnCount
    );
  }, [options]);

  useLayoutEffect(() => {
    calculateColumnCount();

    const resizeObserver = new ResizeObserver(calculateColumnCount);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (measureRef.current) resizeObserver.observe(measureRef.current);

    void document.fonts?.ready.then(calculateColumnCount);

    return () => resizeObserver.disconnect();
  }, [calculateColumnCount]);

  const rows: Array<ReadonlyArray<SegmentedControlOption<T>>> = [];
  for (let index = 0; index < options.length; index += columnCount) {
    rows.push(options.slice(index, index + columnCount));
  }

  return (
    <div className="segmented-control-group" ref={containerRef}>
      <div
        aria-hidden="true"
        className="segmented-control__measure"
        ref={measureRef}
      >
        {options.map(option => (
          <span className="segmented-control__measure-option" key={String(option.value)}>
            {option.label}
          </span>
        ))}
      </div>

      {rows.map((row, rowIndex) => {
        const isOnlyRow = rows.length === 1;
        const positionClass = isOnlyRow
          ? 'segmented-control--single'
          : rowIndex === 0
          ? 'segmented-control--first'
          : rowIndex === rows.length - 1
          ? 'segmented-control--last'
          : 'segmented-control--middle';
        const rowStyle: SegmentedControlRowStyle = {
          '--segmented-columns': row.length,
          width: `${(row.length / columnCount) * 100}%`,
        };

        return (
          <div
            className={`segmented-control ${positionClass}`}
            key={rowIndex}
            style={rowStyle}
          >
            {row.map(option => (
              <button
                aria-pressed={value === option.value}
                key={String(option.value)}
                onClick={() => onChange(option.value)}
                title={option.label}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
