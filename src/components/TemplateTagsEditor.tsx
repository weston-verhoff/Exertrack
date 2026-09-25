import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Search } from 'lucide-react';
import { Drawer } from './Drawer';
import { TagNameDialog } from './TagNameDialog';
import { WorkoutButton } from './WorkoutButton';
import { TemplateTag } from '../services/templateTagService';
import '../styles/template-tags.css';

interface TemplateTagsEditorProps {
  isOpen: boolean;
  tags: TemplateTag[];
  selectedTagIds: string[];
  templateName: string;
  onClose: () => void;
  onCreateTag: (name: string) => Promise<{ data: TemplateTag | null; error: string | null }>;
  onSave: (tagIds: string[]) => Promise<string | null>;
}

export function TemplateTagsEditor({
  isOpen,
  tags,
  selectedTagIds,
  templateName,
  onClose,
  onCreateTag,
  onSave,
}: TemplateTagsEditorProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTagIds));
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTagSignature = selectedTagIds.join('\u0000');

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelected(new Set(selectedTagSignature ? selectedTagSignature.split('\u0000') : []));
    setError(null);
    setSaving(false);
  }, [isOpen, selectedTagSignature]);

  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? tags.filter(tag => tag.name.toLocaleLowerCase().includes(normalizedQuery))
      : tags;
  }, [query, tags]);

  const toggleTag = (tagId: string) => {
    setSelected(current => {
      const next = new Set(current);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const saveError = await onSave(Array.from(selected));
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    onClose();
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={saving ? () => undefined : onClose} width={440} tone="library">
        <div className="template-tag-editor">
          <header>
            <h2>Edit template tags</h2>
            <p>Choose the tags shown on “{templateName}”.</p>
          </header>
          <label className="template-tag-editor__search">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only"></span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search tags"
            />
          </label>
          <div className="template-tag-editor__list">
            {filteredTags.map(tag => (
              <label className="template-tag-choice" key={tag.id}>
                <input
                  checked={selected.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  type="checkbox"
                />
                <span>{tag.name}</span>
              </label>
            ))}
            {filteredTags.length === 0 && (
              <p>{query.trim() ? 'No tags match your search.' : 'No tags yet.'}</p>
            )}
          </div>
          {error && <p className="template-tag-editor__error" role="alert">{error}</p>}
          <div className="template-tag-editor__actions">
            <WorkoutButton
              label="New Tag"
              icon={<Plus size={18} />}
              variant="secondary"
              onClick={() => setNewTagDialogOpen(true)}
            />
            <div className="workout-details__save template-tag-editor__save">
              <WorkoutButton
                label="Save Changes"
                icon={<Save size={18} />}
                onClick={() => { void save(); }}
                loading={saving}
              />
            </div>
          </div>
        </div>
      </Drawer>
      <TagNameDialog
        isOpen={newTagDialogOpen}
        title="Create a new tag"
        onCancel={() => setNewTagDialogOpen(false)}
        onSave={async name => {
          const result = await onCreateTag(name);
          if (result.error || !result.data) return result.error ?? 'Failed to create tag.';
          setSelected(current => new Set(current).add(result.data!.id));
          setNewTagDialogOpen(false);
          return null;
        }}
      />
    </>
  );
}
