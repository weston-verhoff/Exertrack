import { BuilderExerciseConfig } from '../types/workoutBuilder';

export interface ImportedWorkout { id: string; date: string; exercises: BuilderExerciseConfig[] }
export const IMPORT_MAX_BYTES = 1024 * 1024;
export function parseWorkoutText(text: string): ImportedWorkout[] {
  if (text.length > IMPORT_MAX_BYTES) throw new Error('File is too large.');
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (code <= 8 || (code >= 14 && code <= 31)) throw new Error('File contains invalid text.');
  }
  const workouts: ImportedWorkout[] = [];
  let workout: ImportedWorkout | undefined;
  let exercise: BuilderExerciseConfig | undefined;
  const fail = (line: number): never => { throw new Error(`Invalid export format at line ${line + 1}.`); };
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, line) => {
    const value = raw.trim();
    if (!value) return;
    const header = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \((\d{1,2})\/(\d{1,2})\/(\d{2})\)(?: \((Scheduled|Completed|Skipped)\))?$/i.exec(value);
    if (header) {
      const year = 2000 + Number(header[4]), month = Number(header[2]), day = Number(header[3]);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) fail(line);
      workout = { id: `import-${workouts.length}`, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, exercises: [] };
      workouts.push(workout); exercise = undefined;
      if (workouts.length > 100) throw new Error('Import up to 100 workouts at a time.');
      return;
    }
    if (!workout) fail(line);
    const strength = /^Set (\d+): (\d+(?:\.\d+)?)lbs for (\d+) reps(?: \| (?:Completed|Not completed))?$/.exec(value);
    const cardio = /^Segment (\d+): (\d+:\d{2}(?::\d{2})?)(.*)$/.exec(value);
    if (strength || cardio) {
      if (!exercise) fail(line);
      const type = strength ? 'strength' : 'cardio';
      if (exercise!.sets.length && exercise!.exercise_type !== type) fail(line);
      exercise!.exercise_type = type;
      const set_number = Number((strength || cardio)![1]);
      if (!Number.isSafeInteger(set_number) || set_number < 1 || exercise!.sets.some(s => s.set_number === set_number) || exercise!.sets.length >= 100) fail(line);
      if (strength) {
        const weight = Number(strength[2]), reps = Number(strength[3]);
        if (!Number.isFinite(weight) || !Number.isSafeInteger(reps)) fail(line);
        exercise!.sets.push({ set_number, weight, reps });
      } else {
        const clock = cardio![2].split(':').map(Number);
        if (clock.slice(1).some(n => n > 59)) fail(line);
        const duration_seconds = clock.reduce((sum, n) => sum * 60 + n, 0);
        const set: BuilderExerciseConfig['sets'][number] = { set_number, duration_seconds };
        cardio![3].split('|').map(p => p.trim()).filter(Boolean).forEach(part => {
          const distance = /^(\d+(?:\.\d+)?) (mi|km|m|yd)$/.exec(part);
          const calories = /^(\d+(?:\.\d+)?) cal$/.exec(part);
          if (distance) { set.distance_value = Number(distance[1]); set.distance_unit = distance[2] as 'mi' | 'km' | 'm' | 'yd'; }
          else if (calories) set.calories = Number(calories[1]);
          else if (!/^(Completed|Not completed|\d+:\d{2}(?::\d{2})?\/(mi|km|m|yd)|\d+(?:\.\d+)? (mi|km|m|yd)\/h)$/.test(part)) fail(line);
        });
        if (Object.values(set).some(n => typeof n === 'number' && !Number.isFinite(n))) fail(line);
        exercise!.sets.push(set);
      }
      return;
    }
    if (/^(Set |Segment )/.test(value) || value.length > 200) fail(line);
    exercise = { id: `${workout!.id}-${workout!.exercises.length}`, exercise_id: '', name: value, exercise_type: 'strength', sets: [], order: workout!.exercises.length };
    workout!.exercises.push(exercise);
    if (workout!.exercises.length > 100) fail(line);
  });
  if (!workouts.length || workouts.some(w => !w.exercises.length || w.exercises.some(e => !e.sets.length))) throw new Error('Each workout must have exercises and sets.');
  return workouts;
}
