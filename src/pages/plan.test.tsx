import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PlanSession, { BuilderRow } from './plan';
import { BuilderExerciseConfig } from '../types/workoutBuilder';
import { useExercises } from '../hooks/useExercises';
import { useTemplates } from '../hooks/useTemplates';
import { useAuth } from '../context/AuthContext';
import { useSystemAlerts } from '../context/SystemAlertContext';
import { fetchTemplateBuilderExercises } from '../services/workoutService';

jest.mock(
  'react-router-dom',
  () => ({ useNavigate: jest.fn(), useSearchParams: jest.fn() }),
  { virtual: true }
);
jest.mock('../hooks/useExercises', () => ({ useExercises: jest.fn() }));
jest.mock('../hooks/useTemplates', () => ({ useTemplates: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../context/SystemAlertContext', () => ({ useSystemAlerts: jest.fn() }));
jest.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('../services/workoutService', () => ({
  createWorkoutFromBuilder: jest.fn(),
  fetchTemplateBuilderExercises: jest.fn(),
  fetchWorkoutBuilderExercises: jest.fn(),
  updateWorkoutFromBuilder: jest.fn(),
}));

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

describe('planner metric fields', () => {
  it('uses the shared control and below-field label styling', () => {
    const { container } = renderBuilderRow(cardioExercise(false));
    const fields = container.querySelectorAll('.metric-field');

    expect(fields).toHaveLength(2);
    fields.forEach(field => {
      expect(field.firstElementChild).toHaveClass('metric-field__control');
      expect(field.lastElementChild).toHaveClass('metric-field__label');
    });
  });

  it('uses spinner-free decimal inputs', () => {
    const { container } = renderBuilderRow(cardioExercise(false));
    const inputs = container.querySelectorAll('.metric-field__control');

    expect(inputs).toHaveLength(2);
    inputs.forEach(input => {
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('inputmode', 'decimal');
    });
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
});

describe('planner imports', () => {
  it('keeps the selected date when importing a template', async () => {
    let searchParams = new URLSearchParams();
    (useSearchParams as jest.Mock).mockImplementation(() => [searchParams]);
    (useNavigate as jest.Mock).mockReturnValue(jest.fn());
    (useExercises as jest.Mock).mockReturnValue({
      exercises: [],
      loading: false,
      refetch: jest.fn(),
      addExercise: jest.fn(),
    });
    (useTemplates as jest.Mock).mockReturnValue({ templates: [], loading: false });
    (useAuth as jest.Mock).mockReturnValue({
      user: { user_metadata: {} },
      userId: 'user-1',
      loading: false,
    });
    (useSystemAlerts as jest.Mock).mockReturnValue({
      dismissAlertGroup: jest.fn(),
      showAlert: jest.fn(),
    });
    (fetchTemplateBuilderExercises as jest.Mock).mockResolvedValue({
      data: [cardioExercise(false)],
      error: null,
    });

    const { container, rerender } = render(<PlanSession />);
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-11-18' } });

    searchParams = new URLSearchParams('importTemplate=template-1');
    rerender(<PlanSession />);

    await waitFor(() => expect(fetchTemplateBuilderExercises).toHaveBeenCalledWith('template-1'));
    expect(dateInput).toHaveValue('2026-11-18');
  });
});
