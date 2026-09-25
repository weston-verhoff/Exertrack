import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WorkoutButton } from './WorkoutButton';
import '../styles/tag-name-dialog.css';

interface TagNameDialogProps {
  isOpen: boolean;
  initialValue?: string;
  title: string;
  saveLabel?: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
  deleteConfirmation?: string;
}

export function TagNameDialog({
  isOpen,
  initialValue = '',
  title,
  saveLabel = 'Save',
  onCancel,
  onSave,
  onDelete,
  deleteConfirmation,
}: TagNameDialogProps) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialValue);
    setError(null);
    setSaving(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, saving]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const saveError = await onSave(name);
    setSaving(false);
    if (saveError) setError(saveError);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (deleteConfirmation && !window.confirm(deleteConfirmation)) return;
    setSaving(true);
    setError(null);
    const deleteError = await onDelete();
    setSaving(false);
    if (deleteError) setError(deleteError);
  };

  return createPortal(
    <div className="tag-dialog-backdrop" onMouseDown={saving ? undefined : onCancel}>
      <form
        aria-labelledby="tag-dialog-title"
        aria-modal="true"
        className="tag-dialog color-context color-context--opaque"
        data-tone="library"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
      >
        <h2 id="tag-dialog-title">{title}</h2>
        <label>
          <span>Tag name</span>
          <input
            ref={inputRef}
            maxLength={30}
            onChange={event => setName(event.target.value)}
            value={name}
          />
        </label>
        <small>{name.trim().length}/30 characters</small>
        {error && <p className="tag-dialog__error" role="alert">{error}</p>}
        <div className="tag-dialog__actions">
          {onDelete && (
            <WorkoutButton
              label="Delete"
              variant="destructive"
              onClick={() => { void handleDelete(); }}
              disabled={saving}
            />
          )}
          <WorkoutButton
            label="Cancel"
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
          />
          <WorkoutButton
            label={saveLabel}
            type="submit"
            onClick={() => undefined}
            loading={saving}
          />
        </div>
      </form>
    </div>,
    document.body
  );
}
