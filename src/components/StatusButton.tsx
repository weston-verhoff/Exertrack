import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSystemAlerts } from '../context/SystemAlertContext';
import { WorkoutButton } from './WorkoutButton';

type ButtonState = 'idle' | 'saving' | 'success';

interface StatusButtonProps {
  onClick: () => Promise<void>;
  idleLabel?: string;
  successLabel?: string;
  width?: string;
  alertKey?: string;
}

export default function StatusButton({
  onClick,
  idleLabel = 'Submit',
  successLabel = 'Saved!',
  width = '200px',
  alertKey = 'status-button-save',
}: StatusButtonProps) {
  const [status, setStatus] = useState<ButtonState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { dismissAlertGroup, showAlert } = useSystemAlerts();

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleClick = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    showAlert('Saving...', { replaceKey: alertKey });
    try {
      await onClick();
      setStatus('success');
      showAlert(successLabel, { tone: 'success', replaceKey: alertKey });
      resetTimer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('StatusButton error:', error);
      dismissAlertGroup(alertKey);
      showAlert(error instanceof Error ? error.message : 'Unable to save. Please try again.', { tone: 'error' });
      setStatus('idle');
    }
  };

  return (
    <span className="status-button" style={{ display: 'inline-flex', width }}>
      <WorkoutButton
        label={status === 'success' ? successLabel : idleLabel}
        icon={status === 'success' ? <CheckCircle2 size={18} /> : undefined}
        intent={status === 'success' ? 'positive' : 'neutral'}
        loading={status === 'saving'}
        loadingLabel="Saving..."
        onClick={() => void handleClick()}
      />
    </span>
  );
}
