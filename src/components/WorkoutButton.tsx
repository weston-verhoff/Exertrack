import React, { ReactNode } from 'react';
import { ComponentTone } from '../utils/componentTone';
import '../styles/workout-button.css';

export type WorkoutButtonVariant = 'primary' | 'secondary' | 'quiet';
export type WorkoutButtonIntent = 'neutral' | 'positive' | 'danger';

interface WorkoutButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: WorkoutButtonVariant;
  intent?: WorkoutButtonIntent;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'default' | 'full';
  tone?: ComponentTone;
  iconOnly?: boolean;
}

export function WorkoutButton({
  label,
  icon,
  onClick,
  variant = 'primary',
  intent = 'neutral',
  disabled = false,
  loading = false,
  size = 'md',
  loadingLabel,
  type = 'button',
  rounded = 'default',
  tone,
  iconOnly = false,
}: WorkoutButtonProps) {
  const isDisabled = disabled || loading;
  const displayLabel = loading ? loadingLabel ?? label : label;
  const widestLabelLength = Math.max(label.length, loadingLabel?.length ?? 0);

  return (
    <button
      className={`workout-button workout-button--${variant} workout-button--${intent} workout-button--${size}${iconOnly ? ' workout-button--icon-only' : ''}${rounded === 'full' ? ' workout-button--rounded' : ''}`}
      data-tone={tone}
      type={type}
      onClick={isDisabled ? undefined : onClick}
      style={{ minWidth: iconOnly ? '44px' : `${Math.max(7, widestLabelLength + (icon ? 5 : 3))}ch` }}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={iconOnly ? displayLabel : undefined}
    >
      {icon ? <span aria-hidden="true" className="workout-button__icon">{icon}</span> : null}
      {!iconOnly && <span>{displayLabel}</span>}
    </button>
  );
}
