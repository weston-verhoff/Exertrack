import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import '../styles/system-alerts.css';
import { X } from 'lucide-react';

export type SystemAlertTone = 'info' | 'success' | 'error';

type AlertOptions = {
  tone?: SystemAlertTone;
  replaceKey?: string;
  duration?: number;
};

type SystemAlert = {
  id: number;
  message: string;
  tone: SystemAlertTone;
  replaceKey?: string;
  expiresAt: number;
  exiting: boolean;
};

type SystemAlertContextValue = {
  showAlert: (message: string, options?: AlertOptions) => void;
  dismissAlert: (id: number) => void;
  dismissAlertGroup: (replaceKey: string) => void;
};

const DEFAULT_DURATION = 6000;
const EXIT_DURATION = 300;
const MAX_VISIBLE_ALERTS = 3;

const SystemAlertContext = createContext<SystemAlertContextValue>({
  showAlert: () => undefined,
  dismissAlert: () => undefined,
  dismissAlertGroup: () => undefined,
});

function AlertBanner({
  alert,
  onAutoDismiss,
  onImmediateDismiss,
}: {
  alert: SystemAlert;
  onAutoDismiss: (id: number) => void;
  onImmediateDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(
      () => onAutoDismiss(alert.id),
      Math.max(0, alert.expiresAt - Date.now())
    );

    return () => window.clearTimeout(timeout);
  }, [alert.expiresAt, alert.id, onAutoDismiss]);

  return (
    <div
      className={`system-alert system-alert--${alert.tone}${alert.exiting ? ' system-alert--exiting' : ''}`}
      role={alert.tone === 'error' ? 'alert' : 'status'}
    >
      <span className="system-alert__message">{alert.message}</span>
      <button
        type="button"
        className="system-alert__close"
        aria-label={`Dismiss: ${alert.message}`}
        onClick={() => onImmediateDismiss(alert.id)}
      >
        <X aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

export function SystemAlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const nextId = useRef(1);
  const exitTimeouts = useRef(new Map<number, number>());

  useEffect(() => {
    const timeouts = exitTimeouts.current;
    return () => {
      timeouts.forEach(timeout => window.clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const removeImmediately = useCallback((id: number) => {
    const timeout = exitTimeouts.current.get(id);
    if (timeout !== undefined) window.clearTimeout(timeout);
    exitTimeouts.current.delete(id);
    setAlerts(current => current.filter(alert => alert.id !== id));
  }, []);

  const dismissAlertGroup = useCallback((replaceKey: string) => {
    setAlerts(current => {
      current.forEach(alert => {
        if (alert.replaceKey !== replaceKey) return;
        const timeout = exitTimeouts.current.get(alert.id);
        if (timeout !== undefined) window.clearTimeout(timeout);
        exitTimeouts.current.delete(alert.id);
      });
      return current.filter(alert => alert.replaceKey !== replaceKey);
    });
  }, []);

  const dismissWithFade = useCallback((id: number) => {
    setAlerts(current =>
      current.map(alert =>
        alert.id === id && !alert.exiting ? { ...alert, exiting: true } : alert
      )
    );

    if (exitTimeouts.current.has(id)) return;
    const timeout = window.setTimeout(() => {
      exitTimeouts.current.delete(id);
      setAlerts(current => current.filter(alert => alert.id !== id));
    }, EXIT_DURATION);
    exitTimeouts.current.set(id, timeout);
  }, []);

  const showAlert = useCallback(
    (message: string, options: AlertOptions = {}) => {
      const tone = options.tone ?? 'info';
      const expiresAt = Date.now() + (options.duration ?? DEFAULT_DURATION);

      setAlerts(current => {
        const replacement = options.replaceKey
          ? current.find(alert => alert.replaceKey === options.replaceKey)
          : undefined;

        if (replacement) {
          const timeout = exitTimeouts.current.get(replacement.id);
          if (timeout !== undefined) window.clearTimeout(timeout);
          exitTimeouts.current.delete(replacement.id);
          return current.map(alert =>
            alert.id === replacement.id
              ? { ...alert, message, tone, expiresAt, exiting: false }
              : alert
          );
        }

        const id = nextId.current++;
        const nextAlert = {
          id,
          message,
          tone,
          replaceKey: options.replaceKey,
          expiresAt,
          exiting: false,
        };

        if (current.length < MAX_VISIBLE_ALERTS) return [...current, nextAlert];

        const oldestVisibleAlert = current.find(alert => !alert.exiting);
        if (!oldestVisibleAlert) return current;

        const timeout = window.setTimeout(() => {
          exitTimeouts.current.delete(oldestVisibleAlert.id);
          setAlerts(latest => [
            ...latest
              .filter(alert => alert.id !== oldestVisibleAlert.id)
              .slice(-(MAX_VISIBLE_ALERTS - 1)),
            { ...nextAlert, expiresAt: Date.now() + (options.duration ?? DEFAULT_DURATION) },
          ]);
        }, EXIT_DURATION);
        exitTimeouts.current.set(oldestVisibleAlert.id, timeout);

        return current.map(alert =>
          alert.id === oldestVisibleAlert.id ? { ...alert, exiting: true } : alert
        );
      });

    },
    []
  );

  const value = useMemo(
    () => ({ showAlert, dismissAlert: removeImmediately, dismissAlertGroup }),
    [dismissAlertGroup, removeImmediately, showAlert]
  );

  return (
    <SystemAlertContext.Provider value={value}>
      {children}
      <div className="system-alert-region" aria-label="System notifications">
        {alerts.map(alert => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onAutoDismiss={dismissWithFade}
            onImmediateDismiss={removeImmediately}
          />
        ))}
      </div>
    </SystemAlertContext.Provider>
  );
}

export const useSystemAlerts = () => useContext(SystemAlertContext);
