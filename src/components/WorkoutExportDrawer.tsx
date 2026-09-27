import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { WorkoutExportScope } from '../utils/workoutExport';
import { Drawer } from './Drawer';
import { WorkoutButton } from './WorkoutButton';
import '../styles/workout-export-drawer.css';

type DrawerScope = Exclude<WorkoutExportScope, 'selected'>;

const OPTIONS: Array<{ value: DrawerScope; label: string }> = [
  { value: 'this-week', label: 'This week' },
  { value: '2-weeks', label: 'Last 2 weeks' },
  { value: 'all', label: 'All workouts' },
  { value: 'planned', label: 'Future workouts' },
  { value: 'past', label: 'Past workouts' },
  { value: 'custom-range', label: 'Custom date range' },
];

export function WorkoutExportDrawer({
  isOpen,
  onClose,
  onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (scope: DrawerScope, range?: { startDate: string; endDate: string }) => Promise<boolean>;
}) {
  const [scope, setScope] = useState<DrawerScope | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setScope(null);
      setStartDate('');
      setEndDate('');
      setExporting(false);
    }
  }, [isOpen]);

  const rangeInvalid = scope === 'custom-range' && (!startDate || !endDate || startDate > endDate);
  const canExport = Boolean(scope) && !rangeInvalid && !exporting;

  const submit = async () => {
    if (!scope || !canExport) return;
    setExporting(true);
    const succeeded = await onExport(
      scope,
      scope === 'custom-range' ? { startDate, endDate } : undefined
    );
    setExporting(false);
    if (succeeded) onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} tone="selection" width={420}>
      <div className="workout-export-drawer">
        <header>
          <h2>Export workouts</h2>
          <p>Choose which workouts to include.</p>
        </header>
        <fieldset>
          <legend>Export range</legend>
          {OPTIONS.map(option => (
            <label className="workout-export-option" key={option.value}>
              <input
                checked={scope === option.value}
                disabled={exporting}
                name="workout-export-scope"
                onChange={() => setScope(option.value)}
                type="radio"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>

        {scope === 'custom-range' && (
          <div className="workout-export-dates">
            <label>Start date<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
            <label>End date<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
            {startDate && endDate && startDate > endDate && <p role="alert">Start date must be on or before end date.</p>}
          </div>
        )}

        <div className="workout-export-actions">
          <WorkoutButton label="Cancel" variant="secondary" disabled={exporting} onClick={onClose} />
          <WorkoutButton label="Export" icon={<Download size={18} />} disabled={!canExport} loading={exporting} loadingLabel="Exporting..." onClick={() => void submit()} />
        </div>
      </div>
    </Drawer>
  );
}
