import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Drawer } from './Drawer';
import { ChartSkeleton } from './LoadingSkeletons';
import { useSystemAlerts } from '../context/SystemAlertContext';
import { WeightSystem } from '../services/accountService';
import {
  createWeightEntry,
  deleteWeightEntry,
  fetchWeightEntries,
  updateWeightEntry,
  WeightEntry,
} from '../services/weightService';
import {
  formatWeightValue,
  getLocalDateKey,
  getWeightUnit,
  toStoredKilograms,
} from '../utils/weightTracking';

type DrawerMode = 'closed' | 'add' | 'history' | 'edit';

const timelineSort = (a: WeightEntry, b: WeightEntry) =>
  a.weighed_on.localeCompare(b.weighed_on) ||
  a.created_at.localeCompare(b.created_at) ||
  a.id.localeCompare(b.id);

const historySort = (a: WeightEntry, b: WeightEntry) => -timelineSort(a, b);

function WeightNumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label="Weight"
      className="workout-details__numeric-input metric-field__control"
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        if (next === '' || /^\d*(?:\.\d*)?$/.test(next)) onChange(next);
      }}
      onBlur={() => {
        const number = Number(value);
        if (value && Number.isFinite(number)) onChange(String(number));
      }}
    />
  );
}

export function WeightTrackingSection({
  userId,
  weightSystem,
  theme,
}: {
  userId: string;
  weightSystem: WeightSystem;
  theme: string;
}) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('closed');
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [weightValue, setWeightValue] = useState('');
  const [weighedOn, setWeighedOn] = useState(getLocalDateKey());
  const [saving, setSaving] = useState(false);
  const { showAlert } = useSystemAlerts();
  const unit = getWeightUnit(weightSystem);
  const today = getLocalDateKey();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchWeightEntries({ userId }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setLoadError(error);
        showAlert(error, { tone: 'error' });
      }
      setEntries((data ?? []).slice().sort(timelineSort));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [showAlert, userId]);

  const chartData = useMemo(() => {
    void theme;
    const styles = getComputedStyle(document.documentElement);
    const lineColor =
      styles.getPropertyValue('--color-chart-series-2').trim() ||
      styles.getPropertyValue('--color-chart-series-1').trim();
    const fillColor =
      styles.getPropertyValue('--color-chart-series-2-fill').trim() ||
      styles.getPropertyValue('--color-chart-series-1-fill').trim();

    return {
      labels: entries.map((entry) =>
        new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(`${entry.weighed_on}T00:00:00`))
      ),
      datasets: [
        {
          label: `Body Weight (${unit})`,
          data: entries.map((entry) =>
            formatWeightValue(entry.weight_kg, weightSystem)
          ),
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [entries, theme, unit, weightSystem]);

  const closeDrawer = () => {
    setDrawerMode('closed');
    setEditingEntry(null);
    setWeightValue('');
    setWeighedOn(today);
  };

  const openAdd = () => {
    setEditingEntry(null);
    setWeightValue('');
    setWeighedOn(today);
    setDrawerMode('add');
  };

  const openEdit = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setWeightValue(String(formatWeightValue(entry.weight_kg, weightSystem)));
    setWeighedOn(entry.weighed_on);
    setDrawerMode('edit');
  };

  const validate = () => {
    const numericWeight = Number(weightValue);
    if (!weightValue || !Number.isFinite(numericWeight) || numericWeight <= 0) {
      return 'Enter a weight greater than zero.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weighedOn) || weighedOn > today) {
      return 'Choose today or an earlier date.';
    }
    return null;
  };

  const saveEntry = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      showAlert(validationError, { tone: 'error' });
      return;
    }

    setSaving(true);
    const weightKg = toStoredKilograms(Number(weightValue), weightSystem);
    const result = editingEntry
      ? await updateWeightEntry({
          id: editingEntry.id,
          userId,
          weightKg,
          weighedOn,
        })
      : await createWeightEntry({ userId, weightKg, weighedOn });
    setSaving(false);

    if (result.error || !result.data) {
      showAlert(result.error ?? 'Failed to save weigh-in.', { tone: 'error' });
      return;
    }

    setEntries((current) =>
      [
        ...current.filter((entry) => entry.id !== result.data?.id),
        result.data as WeightEntry,
      ].sort(timelineSort)
    );
    showAlert(editingEntry ? 'Weigh-in updated.' : 'Weigh-in added.', {
      tone: 'success',
    });
    if (editingEntry) {
      setEditingEntry(null);
      setDrawerMode('history');
    } else {
      closeDrawer();
    }
  };

  const removeEntry = async () => {
    if (!editingEntry) return;
    if (!window.confirm('Delete this weigh-in permanently?')) return;

    setSaving(true);
    const { error } = await deleteWeightEntry({
      id: editingEntry.id,
      userId,
    });
    setSaving(false);
    if (error) {
      showAlert(error, { tone: 'error' });
      return;
    }

    setEntries((current) =>
      current.filter((entry) => entry.id !== editingEntry.id)
    );
    setEditingEntry(null);
    setDrawerMode('history');
    showAlert('Weigh-in deleted.', { tone: 'success' });
  };

  return (
    <section id="weight-tracking" className="account-section weight-tracking">
      <div className="account-section__heading">
        <div>
          <h2>Weight Tracking</h2>
          <p className="weight-tracking__intro">
            Track body weight over time in your preferred unit.
          </p>
        </div>
      </div>
      <div
        className="account-chart color-context color-context--raised"
        data-tone="workout"
        aria-label="Body weight chart"
      >
        {loading ? (
          <ChartSkeleton />
        ) : loadError ? (
          <p>{loadError}</p>
        ) : entries.length ? (
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true } },
              scales: {
                y: {
                  beginAtZero: false,
                  title: { display: true, text: unit },
                },
              },
            }}
          />
        ) : (
          <p>No weigh-ins yet.</p>
        )}
      </div>
      <div className="weight-tracking__actions">
        <button type="button" onClick={openAdd}>
          Add Weigh-in
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => setDrawerMode('history')}
        >
          Edit Weigh-ins
        </button>
      </div>

      <Drawer
        isOpen={drawerMode !== 'closed'}
        onClose={closeDrawer}
        width={440}
        tone="workout"
      >
        {drawerMode === 'history' ? (
          <div className="weight-history" data-tone="workout">
            <div className="weight-drawer__header">
              <h2>Edit weigh-ins</h2>
              <p>Select an entry to update or delete it.</p>
            </div>
            {entries.length ? (
              <div className="weight-history__list">
                {[...entries].sort(historySort).map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => openEdit(entry)}
                  >
                    <span>
                      {new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }).format(new Date(`${entry.weighed_on}T00:00:00`))}
                    </span>
                    <strong>
                      {formatWeightValue(entry.weight_kg, weightSystem)} {unit}
                    </strong>
                  </button>
                ))}
              </div>
            ) : (
              <p>No weigh-ins to edit.</p>
            )}
          </div>
        ) : (
          <form
            className="weight-editor"
            data-tone="workout"
            onSubmit={saveEntry}
          >
            <div className="weight-drawer__header">
              <h2>{editingEntry ? 'Edit weigh-in' : 'Add weigh-in'}</h2>
              <p>Weights are stored securely and shown in your preferred unit.</p>
            </div>
            <label className="weight-editor__weight">
              <span>Weight</span>
              <span className="metric-field">
                <WeightNumberInput
                  value={weightValue}
                  onChange={setWeightValue}
                />
                <span className="metric-field__label">{unit}</span>
              </span>
            </label>
            <label>
              <span>Date</span>
              <div className="weight-editor__date-row">
                <input
                  aria-label="Date"
                  type="date"
                  max={today}
                  value={weighedOn}
                  onChange={(event) => setWeighedOn(event.target.value)}
                />
                <button type="button" onClick={() => setWeighedOn(today)}>
                  Today
                </button>
              </div>
            </label>
            <div className="weight-editor__actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  editingEntry ? setDrawerMode('history') : closeDrawer()
                }
              >
                Cancel
              </button>
              {editingEntry && (
                <button
                  type="button"
                  className="danger"
                  disabled={saving}
                  onClick={removeEntry}
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        )}
      </Drawer>
    </section>
  );
}
