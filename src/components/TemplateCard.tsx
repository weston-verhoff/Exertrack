import { HTMLAttributes, PointerEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, GripVertical, Pencil } from 'lucide-react';
import { WorkoutButton } from './WorkoutButton';
import { TemplateTagsEditor } from './TemplateTagsEditor';
import '../styles/WorkoutCard.css';
import { ComponentTone } from '../utils/componentTone';
import { TemplateTag } from '../services/templateTagService';

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
  tags: TemplateTag[];
}

interface Props {
  template: Template;
  status: 'active' | 'archived';
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete: (id: string) => void;
  tone?: ComponentTone;
  availableTags: TemplateTag[];
  onCreateTag: (name: string) => Promise<{ data: TemplateTag | null; error: string | null }>;
  onSaveTags: (templateId: string, tagIds: string[]) => Promise<string | null>;
  reorderMode?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function TemplateCard({
  template,
  status,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  tone,
  availableTags,
  onCreateTag,
  onSaveTags,
  reorderMode = false,
  dragHandleProps,
  moveUpDisabled = false,
  moveDownDisabled = false,
  onMoveUp,
  onMoveDown,
}: Props) {
  const navigate = useNavigate();
  const isArchived = status === 'archived';
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const tagScrollerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerX: number; scrollLeft: number } | null>(null);

  const startTagScroll = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = tagScrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    dragStateRef.current = { pointerX: event.clientX, scrollLeft: scroller.scrollLeft };
    scroller.setPointerCapture(event.pointerId);
  };

  const moveTagScroll = (event: PointerEvent<HTMLDivElement>) => {
    const scroller = tagScrollerRef.current;
    const dragState = dragStateRef.current;
    if (!scroller || !dragState) return;
    scroller.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.pointerX);
  };

  const stopTagScroll = () => {
    dragStateRef.current = null;
  };

  return (
    <div className={`workout-card template-workout${reorderMode ? ' template-workout--reordering' : ''}`} data-tone={tone}>
      <div className="workout-head">
        <span>{template.name}</span>
        <span className="template-card__header-actions">
          {reorderMode ? (
            <>
              <button
                aria-label={`Drag ${template.name}`}
                className="template-card__drag-handle"
                type="button"
                {...dragHandleProps}
              >
                <GripVertical aria-hidden="true" size={22} />
              </button>
              <span className="template-card__mobile-order-actions">
                <button aria-label={`Move ${template.name} up`} disabled={moveUpDisabled} onClick={onMoveUp} type="button">
                  <ArrowUp aria-hidden="true" size={20} />
                </button>
                <button aria-label={`Move ${template.name} down`} disabled={moveDownDisabled} onClick={onMoveDown} type="button">
                  <ArrowDown aria-hidden="true" size={20} />
                </button>
              </span>
            </>
          ) : !isArchived && onRename ? (
            <WorkoutButton
              label="Rename"
              icon=""
              variant="blackText"
              onClick={() => onRename(template.id)}
            />
          ) : null}
        </span>
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

      <div className="template-card__tags">
        <button
          aria-label={`Edit tags for ${template.name}`}
          className="template-card__tag-edit"
          onClick={() => setTagEditorOpen(true)}
          type="button"
        >
          <Pencil aria-hidden="true" size={18} />
        </button>
        {template.tags.length > 0 ? (
          <div
            className="template-card__tag-scroller"
            onPointerDown={startTagScroll}
            onPointerMove={moveTagScroll}
            onPointerUp={stopTagScroll}
            onPointerCancel={stopTagScroll}
            ref={tagScrollerRef}
          >
            {template.tags.map(tag => <span className="template-card__tag" key={tag.id}>{tag.name}</span>)}
          </div>
        ) : (
          <p>This template’s tags will be shown here.</p>
        )}
      </div>
      <TemplateTagsEditor
        isOpen={tagEditorOpen}
        tags={availableTags}
        selectedTagIds={template.tags.map(tag => tag.id)}
        templateName={template.name}
        onClose={() => setTagEditorOpen(false)}
        onCreateTag={onCreateTag}
        onSave={tagIds => onSaveTags(template.id, tagIds)}
      />
    </div>
  );
}
