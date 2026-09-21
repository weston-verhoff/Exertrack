import { ComponentTone } from '../utils/componentTone';
import '../styles/loading-skeletons.css';

type WorkoutCardSkeletonProps = {
  tone?: ComponentTone;
};

type WorkoutCardSkeletonGridProps = WorkoutCardSkeletonProps & {
  rows: 1 | 2;
  label?: string;
};

export function WorkoutCardSkeleton({ tone = 'workout' }: WorkoutCardSkeletonProps) {
  return (
    <article
      className="workout-card workout-card-skeleton"
      data-tone={tone}
      aria-hidden="true"
    >
      <div className="workout-card-skeleton__header skeleton-pulse">
        <span className="skeleton-block skeleton-block--date" />
        <span className="skeleton-block skeleton-block--link" />
      </div>
      <div className="workout-card-skeleton__body">
        {[0, 1, 2].map(item => (
          <div className="workout-card-skeleton__exercise" key={item}>
            <span className="skeleton-block skeleton-block--name skeleton-pulse" />
            <span className="skeleton-block skeleton-block--detail skeleton-pulse" />
          </div>
        ))}
      </div>
      <div className="workout-card-skeleton__actions">
        <span className="skeleton-block skeleton-block--button skeleton-pulse" />
        <span className="skeleton-block skeleton-block--button skeleton-pulse" />
      </div>
    </article>
  );
}

export function WorkoutCardSkeletonGrid({
  rows,
  tone = 'workout',
  label = 'Loading workout cards',
}: WorkoutCardSkeletonGridProps) {
  return (
    <div
      className={`workout-skeleton-grid workout-skeleton-grid--rows-${rows}`}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <WorkoutCardSkeleton key={index} tone={tone} />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      className="chart-skeleton"
      role="status"
      aria-label="Loading strength volume chart"
      aria-busy="true"
    >
      <div className="chart-skeleton__legend">
        <span className="skeleton-block skeleton-block--legend skeleton-pulse" />
      </div>
      <div className="chart-skeleton__plot">
        <span className="chart-skeleton__grid-line" />
        <span className="chart-skeleton__grid-line" />
        <span className="chart-skeleton__grid-line" />
        <span className="chart-skeleton__grid-line" />
        <span className="chart-skeleton__series skeleton-pulse" />
      </div>
    </div>
  );
}
