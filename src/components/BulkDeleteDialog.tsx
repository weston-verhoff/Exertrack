import { KeyboardEvent, PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { WorkoutButton } from './WorkoutButton';
import '../styles/bulk-delete-dialog.css';

const CONFIRMATION_PHRASE = 'Delete Workouts';
const MODE_STORAGE_KEY = 'iwyn-delete-confirmation-mode';
const HOLD_DURATION = 3000;

const prefersTypedConfirmation = () => {
  if (typeof window === 'undefined') return false;
  const savedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
  if (savedMode === 'type') return true;
  if (savedMode === 'hold') return false;
  return [
    '(prefers-reduced-motion: reduce)',
    '(forced-colors: active)',
    '(prefers-contrast: more)',
  ].some(query => window.matchMedia?.(query).matches);
};

export function BulkDeleteDialog({
  count,
  onCancel,
  onConfirm,
}: {
  count: number;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'hold' | 'type'>(() => prefersTypedConfirmation() ? 'type' : 'hold');
  const [phrase, setPhrase] = useState('');
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
  }, []);

  const confirm = async () => {
    if (busy) return;
    stopHold();
    setBusy(true);
    const completed = await onConfirm();
    if (!completed) setBusy(false);
  };

  const startHold = () => {
    if (busy || timerRef.current) return;
    setHolding(true);
    timerRef.current = setTimeout(() => void confirm(), HOLD_DURATION);
  };

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      stopHold();
      onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [busy, onCancel, stopHold]);

  const useTypedMode = () => {
    stopHold();
    window.localStorage.setItem(MODE_STORAGE_KEY, 'type');
    setMode('type');
  };

  const useHoldMode = () => {
    setPhrase('');
    window.localStorage.setItem(MODE_STORAGE_KEY, 'hold');
    setMode('hold');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      startHold();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') stopHold();
  };

  return (
    <div className="bulk-delete-backdrop" role="presentation">
      <section aria-describedby="bulk-delete-description" aria-labelledby="bulk-delete-title" aria-modal="true" className="bulk-delete-dialog color-context" role="dialog">
        <h2 id="bulk-delete-title">Delete {count} {count === 1 ? 'workout' : 'workouts'}?</h2>
        <p id="bulk-delete-description">This action cannot be undone.</p>

        {mode === 'hold' ? (
          <>
            <button
              className={`bulk-delete-hold${holding ? ' bulk-delete-hold--active' : ''}`}
              disabled={busy}
              onBlur={stopHold}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onPointerCancel={stopHold}
              onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                startHold();
              }}
              onPointerLeave={stopHold}
              onPointerUp={stopHold}
              type="button"
            >
              <span aria-hidden="true" className="bulk-delete-hold__progress" />
              <span className="bulk-delete-hold__label"><Trash2 aria-hidden="true" size={18} />{busy ? 'Deleting...' : 'Press & Hold to Delete'}</span>
            </button>
            <button className="bulk-delete-type-link" disabled={busy} onClick={useTypedMode} type="button">Type instead</button>
          </>
        ) : (
          <>
            <label className="bulk-delete-type">
              <span>Type <strong>{CONFIRMATION_PHRASE}</strong> to delete.</span>
              <input autoFocus disabled={busy} value={phrase} onChange={event => setPhrase(event.target.value)} />
            </label>
            <button className="bulk-delete-type-link" disabled={busy} onClick={useHoldMode} type="button">Use press &amp; hold instead</button>
          </>
        )}

        <div className="bulk-delete-actions">
          <WorkoutButton label="Cancel" variant="secondary" disabled={busy} onClick={onCancel} />
          {mode === 'type' && (
            <WorkoutButton
              label={`Delete ${count} ${count === 1 ? 'workout' : 'workouts'}`}
              intent="danger"
              loading={busy}
              loadingLabel="Deleting..."
              disabled={phrase.trim().toLocaleLowerCase() !== CONFIRMATION_PHRASE.toLocaleLowerCase()}
              onClick={() => void confirm()}
            />
          )}
        </div>
      </section>
    </div>
  );
}
