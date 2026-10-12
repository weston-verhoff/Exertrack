import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { Drawer } from './Drawer';
import { WorkoutButton } from './WorkoutButton';
import { ImportedWorkout, IMPORT_MAX_BYTES, parseWorkoutText } from '../utils/workoutImport';
import { resolveImportedExercises, saveImportedWorkout } from '../services/workoutImportService';
import { Workout } from '../types/workout';
import '../styles/workout-import.css';

export function WorkoutImportDrawer({ isOpen, onClose, userId, onSaved, onComplete = () => window.location.reload() }: {
  isOpen: boolean; onClose: () => void; userId: string; onSaved: (workout: Workout) => void; onComplete?: () => void;
}) {
  const [workouts, setWorkouts] = useState<ImportedWorkout[]>([]);
  const [busy, setBusy] = useState<'parsing' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const browse = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);
  const operation = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => browse.current?.focus(), 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [isOpen]);
  useEffect(() => {
    const requests = generation;
    generation.current++; setWorkouts([]); setBusy(null); setError(''); setFilename(''); operation.current = false;
    return () => { requests.current++; };
  }, [isOpen, userId]);
  const read = async (files: FileList | null) => {
    if (!files || operation.current) return;
    setError('');
    if (files.length !== 1 || !/\.txt$/i.test(files[0].name)) { setError('Choose one .txt file.'); return; }
    if (files[0].size > IMPORT_MAX_BYTES) { setError('Choose a .txt file smaller than 1 MB.'); return; }
    operation.current = true;
    const token = ++generation.current;
    setBusy('parsing'); setWorkouts([]); setFilename(files[0].name);
    try {
      const text = await files[0].text();
      if (token !== generation.current) return;
      const parsed = parseWorkoutText(text);
      const resolved = await resolveImportedExercises(parsed, userId);
      if (token === generation.current) setWorkouts(resolved);
    } catch (err) {
      if (token === generation.current) setError(err instanceof Error ? err.message : 'Could not read file.');
    } finally {
      if (token === generation.current) { setBusy(null); operation.current = false; }
    }
  };
  const save = async () => {
    if (operation.current || !workouts.length) return;
    operation.current = true; setBusy('saving'); setError('');
    let count = 0;
    try {
      for (const workout of workouts) {
        const saved = await saveImportedWorkout(workout, userId);
        count++; onSaved(saved);
        setWorkouts(prev => prev.filter(item => item.id !== workout.id));
      }
      onClose();
      onComplete();
    } catch (err) {
      setError(`${count ? `${count} workout(s) saved. ` : ''}${err instanceof Error ? err.message : 'Save failed.'} Remaining workouts have not been saved.`);
    } finally { setBusy(null); operation.current = false; }
  };
  const close = () => { if (busy !== 'saving') onClose(); };
  const invalid = workouts.some(w => !w.date || w.exercises.some(e => !e.exercise_id));
  return <Drawer isOpen={isOpen} onClose={close} tone="selection" width={560}>
    <section className="workout-import" role="dialog" aria-modal="true" aria-labelledby="workout-import-title" aria-busy={Boolean(busy)}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const panel = event.currentTarget.closest('aside');
        const elements = panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden])');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === browse.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); browse.current?.focus(); }
      }}>
      <h2 id="workout-import-title">Import workouts</h2>
      <p>Review your schedule before saving. Imported workouts are scheduled with all sets marked incomplete.</p>
      <input ref={input} type="file" accept=".txt,text/plain" hidden aria-label="Drop your .txt file here" disabled={Boolean(busy)}
        onChange={event => { void read(event.target.files); event.target.value = ''; }} />
      <button ref={browse} type="button" className={`workout-import-drop ${dragging ? 'dragging' : ''}`} disabled={Boolean(busy)}
        onClick={() => input.current?.click()}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) void read(event.dataTransfer.files); }}>
        <Upload aria-hidden="true" />
        <strong>Drop your .txt file here</strong>
        <span>Or click to browse. One file, up to 1 MB.</span>
      </button>
      <p>Files are read locally and never uploaded. Saving adds new workouts; importing the same file again can create duplicates.</p>
      {filename && <p>{filename}</p>}
      {busy && <div role="status" className="workout-import-loading"><LoaderCircle className="workout-import-spinner" aria-hidden="true" />{busy === 'parsing' ? 'Parsing workouts…' : 'Saving workouts…'}</div>}
      {error && <p role="alert">{error}</p>}
      {workouts.length > 0 && <p>{workouts.length} suggested workout(s). Dates are taken from the file and may be edited below.</p>}
      {workouts.map(workout => <article className="workout-import-card" key={workout.id}>
        <label>Scheduled date<input type="date" aria-label={`Scheduled date for workout ${Number(workout.id.split('-')[1]) + 1}`} value={workout.date} disabled={Boolean(busy)}
          onChange={event => setWorkouts(prev => prev.map(w => w.id === workout.id ? { ...w, date: event.target.value } : w))} /></label>
        {workout.exercises.map(exercise => <div key={exercise.id}>
          <strong>{exercise.name}</strong>
          {!exercise.exercise_id && <p role="alert">Unknown or ambiguous exercise. Remove this workout or correct the name in your file.</p>}
          <ul>{exercise.sets.map(set => <li key={set.set_number}>{exercise.exercise_type === 'strength'
            ? `Set ${set.set_number}: ${set.weight} lbs for ${set.reps} reps`
            : `Segment ${set.set_number}: ${set.duration_seconds} seconds${set.distance_value != null ? ` | ${set.distance_value} ${set.distance_unit}` : ''}${set.calories != null ? ` | ${set.calories} cal` : ''}`}</li>)}</ul>
        </div>)}
        <WorkoutButton label="Remove workout" variant="secondary" disabled={Boolean(busy)} onClick={() => setWorkouts(prev => prev.filter(w => w.id !== workout.id))} />
      </article>)}
      <div className="workout-import-actions">
        <WorkoutButton label="Cancel" variant="secondary" disabled={busy === 'saving'} onClick={close} />
        <WorkoutButton label="Save workouts" disabled={Boolean(busy) || invalid || !workouts.length} onClick={() => void save()} />
      </div>
    </section>
  </Drawer>;
}
