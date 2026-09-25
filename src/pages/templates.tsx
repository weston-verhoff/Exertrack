import React, { HTMLAttributes, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ResponsiveSegmentedControl } from '../components/ResponsiveSegmentedControl';
import { TemplateCard } from '../components/TemplateCard';
import { WorkoutCardSkeletonGrid } from '../components/LoadingSkeletons';
import { WorkoutButton } from '../components/WorkoutButton';
import { useAuth } from '../context/AuthContext';
import { useSystemAlerts } from '../context/SystemAlertContext';
import {
  createTemplateTag,
  fetchTemplateTags,
  saveTemplateOrder,
  saveTemplateTags,
  TemplateTag,
} from '../services/templateTagService';
import { supabase } from '../supabase/client';
import '../styles/templates.css';

interface TemplateExercise {
  id: string;
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
  archived_at: string | null;
  sort_order: number;
  template_exercises: TemplateExercise[];
  tags: TemplateTag[];
}

type TemplateStatus = 'active' | 'archived';

const TEMPLATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active templates' },
  { value: 'archived', label: 'Archived Templates' },
] as const;

const TEMPLATE_EXERCISE_SELECTION = `
  template_exercises (
    id,
    sets,
    reps,
    duration_seconds,
    distance_value,
    distance_unit,
    order,
    exercise:exercise_id(id, name, target_muscle, exercise_type)
  )
`;

const TEMPLATE_TAG_SELECTION = `
  template_tag_links (
    tag:tag_id (id, name)
  )
`;

function SortableTemplateItem({
  children,
  disabled,
  id,
}: {
  children: (dragHandleProps: HTMLAttributes<HTMLButtonElement>) => ReactNode;
  disabled: boolean;
  id: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      className="template-sortable-item"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatus>('active');
  const [archivingAvailable, setArchivingAvailable] = useState(true);
  const [availableTags, setAvailableTags] = useState<TemplateTag[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const { userId, loading: authLoading } = useAuth();
  const { showAlert } = useSystemAlerts();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    async function fetchTemplates() {
      if (!userId) return;

      const [initialResult, tagsResult] = await Promise.all([
        supabase
        .from('templates')
        .select(`
          id,
          name,
          archived_at,
          sort_order,
          ${TEMPLATE_TAG_SELECTION},
          ${TEMPLATE_EXERCISE_SELECTION}
        `)
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
        fetchTemplateTags(userId),
      ]);

      let templateData: any[] | null = initialResult.data;
      let templateError = initialResult.error;

      if (
        templateError?.code === '42703' &&
        templateError.message.includes('archived_at')
      ) {
        const fallbackResult = await supabase
          .from('templates')
          .select(`
            id,
            name,
            ${TEMPLATE_EXERCISE_SELECTION}
          `)
          .eq('user_id', userId)
          .order('name', { ascending: true });
        templateData = fallbackResult.data;
        templateError = fallbackResult.error;
        setArchivingAvailable(false);
      } else if (!templateError) {
        setArchivingAvailable(true);
      }

      if (templateError) {
        console.error('Error fetching templates:', templateError);
        showAlert('Could not load templates.', { tone: 'error' });
      } else {
        const cleaned = (templateData ?? []).map((template: any) => ({
          ...template,
          archived_at: template.archived_at ?? null,
          sort_order: template.sort_order ?? Number.MAX_SAFE_INTEGER,
          tags: (template.template_tag_links ?? [])
            .map((link: any) => Array.isArray(link.tag) ? link.tag[0] : link.tag)
            .filter(Boolean)
            .sort((a: TemplateTag, b: TemplateTag) => a.name.localeCompare(b.name)),
          template_exercises: template.template_exercises.map((templateExercise: any) => ({
            id: templateExercise.id,
            sets: templateExercise.sets,
            reps: templateExercise.reps,
            duration_seconds: templateExercise.duration_seconds,
            distance_value: templateExercise.distance_value,
            distance_unit: templateExercise.distance_unit,
            order: templateExercise.order,
            exercise: Array.isArray(templateExercise.exercise)
              ? templateExercise.exercise[0]
              : templateExercise.exercise,
          })),
        }));
        setTemplates(cleaned);
      }
      if (tagsResult.error) {
        showAlert(tagsResult.error, { tone: 'error' });
      } else {
        setAvailableTags(tagsResult.data ?? []);
      }
      setLoading(false);
    }

    if (authLoading) return;

    if (!userId) {
      setTemplates([]);
      setAvailableTags([]);
      setLoading(false);
      return;
    }

    fetchTemplates();
  }, [authLoading, showAlert, userId]);

  const archivedTemplates = useMemo(
    () => templates.filter(template => template.archived_at !== null),
    [templates]
  );
  const hasArchivedTemplates = archivedTemplates.length > 0;
  const visibleTemplates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const statusTemplates = (
      selectedStatus === 'archived'
        ? archivedTemplates
        : templates.filter(template => template.archived_at === null)
    ).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

    if (!normalizedQuery) return statusTemplates;

    return statusTemplates.filter(template =>
      template.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [archivedTemplates, searchQuery, selectedStatus, templates]);

  const activeTemplates = useMemo(
    () => templates
      .filter(template => template.archived_at === null)
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)),
    [templates]
  );

  useEffect(() => {
    if (!hasArchivedTemplates && selectedStatus === 'archived') {
      setSelectedStatus('active');
    }
  }, [hasArchivedTemplates, selectedStatus]);

  useEffect(() => {
    if (selectedStatus !== 'active' || searchQuery.trim()) setReorderMode(false);
  }, [searchQuery, selectedStatus]);

  const persistActiveOrder = async (orderedTemplates: Template[]) => {
    if (savingOrder) return;
    const previousTemplates = templates;
    const activeSlots = activeTemplates.map(template => template.sort_order);
    const nextOrderById = new Map(
      orderedTemplates.map((template, index) => [template.id, activeSlots[index]])
    );
    setTemplates(current => current.map(template =>
      nextOrderById.has(template.id)
        ? { ...template, sort_order: nextOrderById.get(template.id)! }
        : template
    ));
    setSavingOrder(true);
    const { error } = await saveTemplateOrder(orderedTemplates.map(template => template.id));
    setSavingOrder(false);
    if (error) {
      setTemplates(previousTemplates);
      showAlert(error, { tone: 'error' });
    }
  };

  const moveTemplate = (templateId: string, offset: -1 | 1) => {
    const oldIndex = activeTemplates.findIndex(template => template.id === templateId);
    const newIndex = oldIndex + offset;
    if (oldIndex < 0 || newIndex < 0 || newIndex >= activeTemplates.length) return;
    void persistActiveOrder(arrayMove(activeTemplates, oldIndex, newIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeTemplates.findIndex(template => template.id === active.id);
    const newIndex = activeTemplates.findIndex(template => template.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void persistActiveOrder(arrayMove(activeTemplates, oldIndex, newIndex));
  };

  const handleCreateTag = async (name: string) => {
    if (!userId) return { data: null, error: 'You must be signed in to create tags.' };
    const result = await createTemplateTag({ name, userId });
    if (result.data) {
      setAvailableTags(current => [...current, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return result;
  };

  const handleSaveTags = async (templateId: string, tagIds: string[]) => {
    const result = await saveTemplateTags({ templateId, tagIds });
    if (result.error) return result.error;
    const selectedTagIds = new Set(tagIds);
    setTemplates(current => current.map(template =>
      template.id === templateId
        ? { ...template, tags: availableTags.filter(tag => selectedTagIds.has(tag.id)) }
        : template
    ));
    showAlert('Template tags saved.', { tone: 'success' });
    return null;
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Permanently delete this template? This cannot be undone.')) return;
    if (!userId) return;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting template:', error);
      showAlert('Could not delete template.', { tone: 'error' });
    } else {
      setTemplates(previous => previous.filter(template => template.id !== id));
    }
  };

  const setTemplateArchivedState = async (id: string, archived: boolean) => {
    if (!userId) return;

    const archivedAt = archived ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('templates')
      .update({ archived_at: archivedAt })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error ${archived ? 'archiving' : 'de-archiving'} template:`, error);
      showAlert(`Could not ${archived ? 'archive' : 'de-archive'} template.`, {
        tone: 'error',
      });
      return;
    }

    setTemplates(previous =>
      previous.map(template =>
        template.id === id ? { ...template, archived_at: archivedAt } : template
      )
    );
  };

  const renameTemplate = (id: string) => {
    const currentTemplate = templates.find(template => template.id === id);
    if (!currentTemplate) return;
    const newName = window.prompt('Enter new template name:', currentTemplate.name)?.trim();
    if (!newName || !userId) return;

    supabase
      .from('templates')
      .update({ name: newName })
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          showAlert('Failed to rename template.', { tone: 'error' });
        } else {
          setTemplates(previous =>
            previous.map(template =>
              template.id === id ? { ...template, name: newName } : template
            )
          );
        }
      });
  };

  return (
    <Layout>
      <h1 style={{ fontFamily: 'var(--font-headline)' }}>Saved Templates</h1>

      {!loading && templates.length > 0 && (
        <div className="templates-page__controls" data-tone="library">
          <div className="templates-page__primary-controls">
          <div className="template-search-field">
            <span className="template-search-row">
              <Search aria-hidden="true" size={18} />
              <input
                aria-label="Search templates"
                className="template-search"
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Filter templates..."
                type="search"
                value={searchQuery}
              />
            </span>
          </div>
          {selectedStatus === 'active' && activeTemplates.length > 1 && (
            <WorkoutButton
              label={reorderMode ? 'Done' : 'Reorder'}
              icon={reorderMode ? <Check size={18} /> : <GripVertical size={18} />}
              variant={reorderMode ? 'primary' : 'secondary'}
              disabled={Boolean(searchQuery.trim()) || savingOrder}
              onClick={() => setReorderMode(current => !current)}
            />
          )}
          </div>
          {hasArchivedTemplates && (
            <ResponsiveSegmentedControl
              options={TEMPLATE_STATUS_OPTIONS}
              value={selectedStatus}
              onChange={setSelectedStatus}
            />
          )}
        </div>
      )}

      {!loading && !archivingAvailable && (
        <p className="templates-page__notice" role="status">
          Template archiving will be available after the pending database update is applied.
        </p>
      )}

      {loading ? (
        <WorkoutCardSkeletonGrid
          rows={2}
          tone="library"
          label="Loading workout templates"
        />
      ) : templates.length === 0 ? (
        <p className="templates-page__empty">No templates found.</p>
      ) : visibleTemplates.length === 0 ? (
        <p className="templates-page__empty">
          {searchQuery.trim()
            ? `No ${selectedStatus} templates match your search.`
            : `No ${selectedStatus} templates found.`}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleTemplates.map(template => template.id)} strategy={rectSortingStrategy}>
            <div className="past-workouts">
              {visibleTemplates.map((template, index) => (
                <SortableTemplateItem
                  disabled={!reorderMode || savingOrder}
                  id={template.id}
                  key={template.id}
                >
                  {dragHandleProps => (
                    <TemplateCard
                      template={{
                        id: template.id,
                        name: template.name,
                        exercises: template.template_exercises,
                        tags: template.tags,
                      }}
                      status={selectedStatus}
                      onRename={selectedStatus === 'active' ? renameTemplate : undefined}
                      onArchive={
                        archivingAvailable
                          ? id => setTemplateArchivedState(id, true)
                          : undefined
                      }
                      onRestore={id => setTemplateArchivedState(id, false)}
                      tone="library"
                      onDelete={deleteTemplate}
                      availableTags={availableTags}
                      onCreateTag={handleCreateTag}
                      onSaveTags={handleSaveTags}
                      reorderMode={reorderMode}
                      dragHandleProps={dragHandleProps}
                      moveUpDisabled={savingOrder || index === 0}
                      moveDownDisabled={savingOrder || index === visibleTemplates.length - 1}
                      onMoveUp={() => moveTemplate(template.id, -1)}
                      onMoveDown={() => moveTemplate(template.id, 1)}
                    />
                  )}
                </SortableTemplateItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </Layout>
  );
}
