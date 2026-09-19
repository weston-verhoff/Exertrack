import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { BuilderRow } from './plan';
import { BuilderExerciseConfig } from '../types/workoutBuilder';

jest.mock(
  'react-router-dom',
  () => ({ useNavigate: jest.fn(), useSearchParams: jest.fn() }),
  { virtual: true }
);

const cardioExercise = (trackLaps: boolean): BuilderExerciseConfig => ({
  id: 'builder-row-1',
  exercise_id: 'exercise-1',
  name: 'Trail Run',
  target_muscle: 'Full Body',
  exercise_type: 'cardio',
  track_laps: trackLaps,
  order: 0,
  sets: [
    {
      set_number: 1,
      duration_seconds: 1800,
      distance_value: 5,
      distance_unit: 'km',
    },
  ],
});

const renderBuilderRow = (exercise: BuilderExerciseConfig) =>
  render(
    <DndContext>
      <SortableContext items={[exercise.id]}>
        <BuilderRow
          exercise={exercise}
          weightUnitLabel="KG"
          onChange={jest.fn()}
          onRemove={jest.fn()}
        />
      </SortableContext>
    </DndContext>
  );

describe('cardio planning card', () => {
  it('shows the saved distance unit without a selector and hides laps when disabled', () => {
    renderBuilderRow(cardioExercise(false));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('DIST (KM)')).toBeInTheDocument();
    expect(screen.queryByText('LAPS')).not.toBeInTheDocument();
  });

  it('shows the laps field when the exercise tracks laps', () => {
    renderBuilderRow(cardioExercise(true));

    expect(screen.getByText('LAPS')).toBeInTheDocument();
  });
});
