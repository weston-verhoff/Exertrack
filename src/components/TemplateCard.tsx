import { useNavigate } from 'react-router-dom';
import { WorkoutButton } from './WorkoutButton';
import '../styles/WorkoutCard.css';
import { ComponentTone } from '../utils/componentTone';

interface TemplateExercise {
  sets: number;
  reps: number;
  duration_seconds?: number | null;
  distance_value?: number | null;
  distance_unit?: string | null;
  order: number;
  exercise: {
    name: string;
    target_muscle: string;
    exercise_type: 'strength' | 'cardio';
  };
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

interface Props {
  template: Template;
  status: 'active' | 'archived';
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete: (id: string) => void;
  tone?: ComponentTone;
}

export function TemplateCard({
  template,
  status,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  tone,
}: Props) {
  const navigate = useNavigate();
  const isArchived = status === 'archived';

  return (
    <div className="workout-card template-workout" data-tone={tone}>
      <div className="workout-head">
        <span>{template.name}</span>
        {!isArchived && onRename && (
          <WorkoutButton
            label="Rename"
            icon=""
            variant="blackText"
            onClick={() => onRename(template.id)}
          />
        )}
      </div>

      <div className="lifts">
        {[...template.exercises]
          .sort((a, b) => a.order - b.order)
          .map((ex, i) => (
            <div className="lift" key={i}>
              <span className="lift-name">{ex.exercise?.name ?? 'Unknown'}</span>
              <br />
              <span>
                {ex.exercise?.exercise_type === 'cardio'
                  ? `${ex.sets} segment${ex.sets === 1 ? '' : 's'} | ${Math.round((ex.duration_seconds ?? 0) / 60)} min${ex.distance_value != null ? ` | ${ex.distance_value} ${ex.distance_unit ?? ''}` : ''}`
                  : `${ex.sets} sets | ${ex.reps} reps`}
              </span>
            </div>
          ))}
      </div>

      <div className="workout-btns">
        {isArchived ? (
          <>
            <WorkoutButton
              label="De-archive"
              icon=""
              variant="primary"
              onClick={() => onRestore?.(template.id)}
            />
            <WorkoutButton
              label="Delete"
              icon=""
              variant="destructive"
              onClick={() => onDelete(template.id)}
            />
          </>
        ) : (
          <>
            <WorkoutButton
              label="Import"
              icon=""
              variant="primary"
              onClick={() => navigate(`/plan?importTemplate=${template.id}`)}
            />
            <WorkoutButton
              label="Edit"
              icon=""
              variant="secondary"
              onClick={() => navigate(`/plan?editTemplate=${template.id}`)}
            />
            {onArchive && (
              <WorkoutButton
                label="Archive"
                icon=""
                variant="destructive"
                onClick={() => onArchive(template.id)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
