import React, { useEffect, useMemo, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { Layout } from '../components/Layout';
import { ResponsiveSegmentedControl } from '../components/ResponsiveSegmentedControl';
import { TemplateCard } from '../components/TemplateCard';
import { useAuth } from '../context/AuthContext';
import { useSystemAlerts } from '../context/SystemAlertContext';
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
  template_exercises: TemplateExercise[];
}

type TemplateStatus = 'active' | 'archived';

const TEMPLATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active templates' },
  { value: 'archived', label: 'Archived Templates' },
] as const;

const SearchIcon = FaSearch as unknown as React.FC<{ 'aria-hidden'?: boolean }>;

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

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatus>('active');
  const [archivingAvailable, setArchivingAvailable] = useState(true);
  const { userId, loading: authLoading } = useAuth();
  const { showAlert } = useSystemAlerts();

  useEffect(() => {
    async function fetchTemplates() {
      if (!userId) return;

      const initialResult = await supabase
        .from('templates')
        .select(`
          id,
          name,
          archived_at,
          ${TEMPLATE_EXERCISE_SELECTION}
        `)
        .eq('user_id', userId)
        .order('name', { ascending: true });

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
      setLoading(false);
    }

    if (authLoading) return;

    if (!userId) {
      setTemplates([]);
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
    const statusTemplates =
      selectedStatus === 'archived'
        ? archivedTemplates
        : templates.filter(template => template.archived_at === null);

    if (!normalizedQuery) return statusTemplates;

    return statusTemplates.filter(template =>
      template.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [archivedTemplates, searchQuery, selectedStatus, templates]);

  useEffect(() => {
    if (!hasArchivedTemplates && selectedStatus === 'archived') {
      setSelectedStatus('active');
    }
  }, [hasArchivedTemplates, selectedStatus]);

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
          <div className="template-search-field">
            <span className="template-search-row">
              <SearchIcon aria-hidden={true} />
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
        <p>Loading templates...</p>
      ) : templates.length === 0 ? (
        <p className="templates-page__empty">No templates found.</p>
      ) : visibleTemplates.length === 0 ? (
        <p className="templates-page__empty">
          {searchQuery.trim()
            ? `No ${selectedStatus} templates match your search.`
            : `No ${selectedStatus} templates found.`}
        </p>
      ) : (
        <div className="past-workouts">
          {visibleTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={{
                id: template.id,
                name: template.name,
                exercises: template.template_exercises,
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
            />
          ))}
        </div>
      )}
    </Layout>
  );
}
