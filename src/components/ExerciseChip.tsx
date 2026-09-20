import { ReactNode } from 'react';
import { ComponentTone } from '../utils/componentTone';
import '../styles/exercise-chip.css';

interface ExerciseChipProps {
  name: string;
  meta: ReactNode;
  icon: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  tone?: ComponentTone;
}

export function ExerciseChip({
  name,
  meta,
  icon,
  ariaLabel,
  onClick,
  tone,
}: ExerciseChipProps) {
  return (
    <button
      type="button"
      className="exercise-chip"
      data-tone={tone}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="exercise-chip__icon" aria-hidden="true">{icon}</span>
      <span className="exercise-chip__content">
        <strong>{name}</strong>
        <small>{meta}</small>
      </span>
    </button>
  );
}
