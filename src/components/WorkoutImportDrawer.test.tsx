import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkoutImportDrawer } from './WorkoutImportDrawer';
import { resolveImportedExercises, saveImportedWorkout } from '../services/workoutImportService';

jest.mock('../services/workoutImportService', () => ({ resolveImportedExercises: jest.fn(), saveImportedWorkout: jest.fn() }));
const text = 'Monday (10/12/26) (Completed)\nBench\nSet 1: 100lbs for 8 reps | Completed';
const file = (content = text) => ({ name: 'workouts.txt', size: content.length, text: jest.fn().mockResolvedValue(content) });
const setup = () => {
  const onClose = jest.fn(), onSaved = jest.fn(), onComplete = jest.fn();
  render(<WorkoutImportDrawer isOpen onClose={onClose} onSaved={onSaved} onComplete={onComplete} userId="user" />);
  return { onClose, onSaved, onComplete };
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveImportedExercises).mockImplementation(async workouts => workouts.map(w => ({ ...w, exercises: w.exercises.map(e => ({ ...e, exercise_id: 'bench' })) })));
});
test('shows spinner, previews, edits dates, and saves only after review', async () => {
  let finish!: (value: string) => void;
  const upload = { ...file(), text: () => new Promise<string>(resolve => { finish = resolve; }) };
  const { onSaved, onClose, onComplete } = setup();
  fireEvent.change(screen.getByLabelText('Drop your .txt file here'), { target: { files: [upload] } });
  expect(screen.getByRole('status')).toHaveTextContent('Parsing workouts');
  expect(saveImportedWorkout).not.toHaveBeenCalled();
  await act(async () => finish(text));
  fireEvent.change(await screen.findByLabelText('Scheduled date for workout 1'), { target: { value: '2026-10-15' } });
  jest.mocked(saveImportedWorkout).mockResolvedValue({ id: 'saved', date: '2026-10-15', status: 'scheduled', workout_exercises: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Save workouts' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(saveImportedWorkout).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-15' }), 'user');
  expect(onClose).toHaveBeenCalled();
  expect(onComplete).toHaveBeenCalledTimes(1);
});
test('supports drop and removal without writing', async () => {
  setup();
  fireEvent.drop(screen.getByRole('button', { name: /Drop your .txt file here/ }), { dataTransfer: { files: [file()] } });
  fireEvent.click(await screen.findByRole('button', { name: 'Remove workout' }));
  expect(screen.getByRole('button', { name: 'Save workouts' })).toBeDisabled();
  expect(saveImportedWorkout).not.toHaveBeenCalled();
});
test('blocks unknown exercises and rejects malformed files', async () => {
  jest.mocked(resolveImportedExercises).mockImplementation(async workouts => workouts);
  setup();
  const input = screen.getByLabelText('Drop your .txt file here');
  fireEvent.change(input, { target: { files: [file()] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Unknown or ambiguous');
  expect(screen.getByRole('button', { name: 'Save workouts' })).toBeDisabled();
  fireEvent.change(input, { target: { files: [file('bad file')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid export format');
});
test('retains only unsaved previews after partial failure', async () => {
  const { onComplete } = setup();
  fireEvent.change(screen.getByLabelText('Drop your .txt file here'), { target: { files: [file(text + '\n\n' + text)] } });
  await screen.findByLabelText('Scheduled date for workout 2');
  jest.mocked(saveImportedWorkout).mockResolvedValueOnce({ id: 'saved', date: '2026-10-12', status: 'scheduled', workout_exercises: [] }).mockRejectedValueOnce(new Error('Network error'));
  fireEvent.click(screen.getByRole('button', { name: 'Save workouts' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('1 workout(s) saved');
  expect(screen.queryByLabelText('Scheduled date for workout 1')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Scheduled date for workout 2')).toBeInTheDocument();
  expect(onComplete).not.toHaveBeenCalled();
});
