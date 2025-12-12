import { useNavigate } from 'react-router-dom';
import { WorkoutButton } from './WorkoutButton';
import '../styles/WorkoutCard.css';

interface TemplateExercise {
  sets: number;
  reps: number;
  order: number;
  exercise: {
    name: string;
    target_muscle: string;
  };
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

interface Props {
  template: Template;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onUse: (id: string) => void; // new prop for "Use Template"
}

export function TemplateCard({ template, onRename, onDelete, onUse }: Props) {
  const navigate = useNavigate();

  return (
    <div className="workout-card template-workout">
      <div className="workout-head">
        <span>{template.name}</span>
				<WorkoutButton
          label="Rename"
          icon=""
          variant="blackText"
          onClick={() => onRename(template.id)}
        />
      </div>

      <div className="lifts">
        {template.exercises
          .sort((a, b) => a.order - b.order)
          .map((ex, i) => (
            <div className="lift" key={i}>
              <span className="lift-name">{ex.exercise?.name ?? 'Unknown'}</span>
              <br />
              <span>
                {ex.sets} sets | {ex.reps} reps
              </span>
            </div>
          ))}
      </div>

      <div className="workout-btns">
        <WorkoutButton
          label="Use Template"
          icon=""
          variant="info"
          onClick={() => navigate(`/plan?importTemplate=${template.id}`)}
        />
				<WorkoutButton
				  label="Edit Template"
				  icon=""
				  variant="info"
				  onClick={() => navigate(`/plan?editTemplate=${template.id}`)}
				/>
        <WorkoutButton
          label="Delete"
          icon=""
          variant="accent"
          onClick={() => onDelete(template.id)}
        />
      </div>
    </div>
  );
}
