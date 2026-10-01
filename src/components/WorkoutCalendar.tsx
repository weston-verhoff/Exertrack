import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWorkoutsInDateRange, WorkoutWithTemplate } from '../services/workoutService';
import { useAuth } from '../context/AuthContext';
import { Workout } from '../types/workout';
import { WorkoutDetailsDrawer } from './WorkoutDetailsDrawer';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { WorkoutButton } from './WorkoutButton';
import '../styles/workout-calendar.css';

interface Props {
  initialWorkouts: WorkoutWithTemplate[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onWorkoutUpdated: (workout: Workout) => void;
  onExportSelected: (ids: string[]) => Promise<void>;
  onDeleteSelected: (ids: string[]) => Promise<string[]>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const getCalendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay()));

  const days: Date[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
};

const getCalendarRange = (month: Date) => {
  const days = getCalendarDays(month);
  return {
    startDate: toDateKey(days[0]),
    endDate: toDateKey(days[days.length - 1]),
  };
};

const getWorkoutExerciseNames = (workout: WorkoutWithTemplate) =>
  workout.workout_exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(item => item.exercise?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3);

const getWorkoutLabel = (workout: WorkoutWithTemplate) => {
  const exerciseNames = getWorkoutExerciseNames(workout);
  if (exerciseNames.length > 0) return exerciseNames.join(', ');
  return workout.template?.name ?? 'Workout';
};

export function WorkoutCalendar({
  initialWorkouts,
  onDelete,
  onStatusChange,
  onWorkoutUpdated,
  onExportSelected,
  onDeleteSelected,
}: Props) {
  const { userId } = useAuth();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [workouts, setWorkouts] = useState<WorkoutWithTemplate[]>(initialWorkouts);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithTemplate | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const { startDate, endDate } = getCalendarRange(month);

    setLoading(true);
    setLoadError(false);
    void fetchWorkoutsInDateRange({ userId, startDate, endDate }).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        setLoadError(true);
      } else {
        setWorkouts(data);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [month, userId]);

  const days = useMemo(() => getCalendarDays(month), [month]);
  const workoutsByDate = useMemo(() => {
    const grouped = new Map<string, WorkoutWithTemplate[]>();
    workouts.forEach(workout => {
      const existing = grouped.get(workout.date) ?? [];
      grouped.set(workout.date, [...existing, workout]);
    });
    return grouped;
  }, [workouts]);

  const updateWorkout = (updatedWorkout: Workout) => {
    setWorkouts(current =>
      current.map(workout => workout.id === updatedWorkout.id ? { ...workout, ...updatedWorkout } : workout)
    );
    setSelectedWorkout(current =>
      current?.id === updatedWorkout.id ? { ...current, ...updatedWorkout } : current
    );
    onWorkoutUpdated(updatedWorkout);
  };

  const toggleWorkoutSelection = (id: string) => {
    setSelectedWorkoutIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedWorkoutIds(new Set());
  };

  const exportSelection = async () => {
    if (selectionBusy || selectedWorkoutIds.size === 0) return;
    setSelectionBusy(true);
    await onExportSelected(Array.from(selectedWorkoutIds));
    setSelectionBusy(false);
  };

  const deleteSelection = async () => {
    if (selectionBusy || selectedWorkoutIds.size === 0) return false;
    setSelectionBusy(true);
    const deletedIds = await onDeleteSelected(Array.from(selectedWorkoutIds));
    setSelectionBusy(false);
    if (deletedIds.length === 0) return false;
    const deletedSet = new Set(deletedIds);
    setWorkouts(current => current.filter(workout => !deletedSet.has(workout.id)));
    setSelectedWorkoutIds(current => new Set(Array.from(current).filter(id => !deletedSet.has(id))));
    setShowDeleteDialog(false);
    if (deletedIds.length === selectedWorkoutIds.size) cancelSelection();
    return true;
  };

  const changeMonth = (offset: number) => {
    setMonth(current => {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      setSelectedDate(toDateKey(nextMonth));
      return nextMonth;
    });
  };

  const todayKey = toDateKey(new Date());
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(month);
  const selectedDateWorkouts = workoutsByDate.get(selectedDate) ?? [];
  const selectedDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${selectedDate}T12:00:00`));

  return (
    <section className="workout-calendar" data-tone="workout" aria-labelledby="workout-calendar-title">
      <div className="workout-calendar__toolbar">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div>
          <h2 id="workout-calendar-title">{monthLabel}</h2>
          <button
            type="button"
            className="workout-calendar__today"
            onClick={() => {
              const today = new Date();
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDate(toDateKey(today));
            }}
          >
            Today
          </button>
          {!selectionMode ? (
            <button type="button" className="workout-calendar__select" onClick={() => setSelectionMode(true)}>Select</button>
          ) : (
            <div className="workout-calendar__selection-actions" aria-label="Selected workout actions" role="group">
              <span>{selectedWorkoutIds.size} selected</span>
              <WorkoutButton label="Export" loading={selectionBusy} loadingLabel="Working…" disabled={selectedWorkoutIds.size === 0} size="sm" onClick={() => void exportSelection()} />
              <WorkoutButton label="Cancel" variant="quiet" size="sm" onClick={cancelSelection} />
              <WorkoutButton label="Delete" variant="secondary" intent="danger" disabled={selectedWorkoutIds.size === 0 || selectionBusy} size="sm" onClick={() => setShowDeleteDialog(true)} />
            </div>
          )}
        </div>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </div>

      <div className="workout-calendar__scroll">
        <div className="workout-calendar__grid" aria-label={`${monthLabel} workout calendar`} role="group">
          {WEEKDAYS.map(day => (
            <div className="workout-calendar__weekday" key={day}>{day}</div>
          ))}
          {days.map(day => {
            const dateKey = toDateKey(day);
            const dayWorkouts = workoutsByDate.get(dateKey) ?? [];
            const isOutsideMonth = day.getMonth() !== month.getMonth();
            return (
              <div
                className={`workout-calendar__day${isOutsideMonth ? ' workout-calendar__day--outside' : ''}${dateKey === todayKey ? ' workout-calendar__day--today' : ''}${dateKey === selectedDate ? ' workout-calendar__day--selected' : ''}`}
                key={dateKey}
              >
                <button
                  type="button"
                  className="workout-calendar__date-trigger"
                  onClick={() => {
                    setSelectedDate(dateKey);
                    if (isOutsideMonth) {
                      setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    }
                  }}
                  aria-label={`Show workouts for ${dateKey}`}
                  aria-pressed={dateKey === selectedDate}
                >
                  <time dateTime={dateKey}>{day.getDate()}</time>
                  {dayWorkouts.length > 0 && (
                    <span className="workout-calendar__indicator" aria-hidden="true">
                      {dayWorkouts.length > 1 ? dayWorkouts.length : ''}
                    </span>
                  )}
                </button>
                <div className="workout-calendar__events">
                  {dayWorkouts.map(workout => {
                    const exerciseNames = getWorkoutExerciseNames(workout);
                    const isSelected = selectedWorkoutIds.has(workout.id);
                    return (
                      <button
                        type="button"
                        className={`workout-calendar__event workout-calendar__event--${workout.status ?? 'scheduled'}${selectionMode ? ' workout-calendar__event--selectable' : ''}${isSelected ? ' workout-calendar__event--selected' : ''}`}
                        key={workout.id}
                        onClick={() => selectionMode ? toggleWorkoutSelection(workout.id) : setSelectedWorkout(workout)}
                        aria-label={selectionMode ? `${isSelected ? 'Deselect' : 'Select'} ${getWorkoutLabel(workout)} on ${dateKey}` : `View ${getWorkoutLabel(workout)} on ${dateKey}`}
                        aria-pressed={selectionMode ? isSelected : undefined}
                      >
                        {selectionMode && (
                          <span className="workout-calendar__selection-mark" aria-hidden="true">
                            {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                          </span>
                        )}
                        {exerciseNames.length > 0 ? (
                          <ul>
                            {exerciseNames.map((name, index) => (
                              <li key={`${name}-${index}`}>{name}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>{getWorkoutLabel(workout)}</span>
                        )}
                        {!selectionMode && <strong>View</strong>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="workout-calendar__agenda" aria-live="polite">
        <h3>{selectedDateLabel}</h3>
        {selectedDateWorkouts.length === 0 ? (
          <p>No workouts scheduled.</p>
        ) : (
          <div className="workout-calendar__agenda-list">
            {selectedDateWorkouts.map(workout => {
              const exerciseNames = getWorkoutExerciseNames(workout);
              const isSelected = selectedWorkoutIds.has(workout.id);
              return (
                <article className={`workout-calendar__agenda-item${isSelected ? ' workout-calendar__agenda-item--selected' : ''}`} key={workout.id}>
                  <div>
                    <span className="workout-calendar__agenda-status">
                      {workout.status === 'completed' ? 'Completed' : 'Scheduled'}
                    </span>
                    {exerciseNames.length > 0 ? (
                      <ul>
                        {exerciseNames.map((name, index) => (
                          <li key={`${name}-${index}`}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{getWorkoutLabel(workout)}</p>
                    )}
                  </div>
                  <button type="button" aria-pressed={selectionMode ? isSelected : undefined} onClick={() => selectionMode ? toggleWorkoutSelection(workout.id) : setSelectedWorkout(workout)}>
                    {selectionMode ? (isSelected ? 'Selected' : 'Select') : 'View'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {loading && <p className="workout-calendar__message" role="status">Loading calendar…</p>}
      {loadError && <p className="workout-calendar__message" role="alert">Calendar workouts could not be loaded.</p>}

      {selectedWorkout && (
        <WorkoutDetailsDrawer
          workout={selectedWorkout}
          isOpen={true}
          onClose={() => setSelectedWorkout(null)}
          tone="workout"
          onDelete={id => {
            setWorkouts(current => current.filter(workout => workout.id !== id));
            setSelectedWorkout(null);
            onDelete(id);
          }}
          onStatusChange={(id, status) => {
            setWorkouts(current => current.map(workout => workout.id === id ? { ...workout, status } : workout));
            setSelectedWorkout(current => current?.id === id ? { ...current, status } : current);
            onStatusChange(id, status);
          }}
          onWorkoutUpdated={updateWorkout}
        />
      )}
      {showDeleteDialog && (
        <BulkDeleteDialog
          count={selectedWorkoutIds.size}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={deleteSelection}
        />
      )}
    </section>
  );
}
