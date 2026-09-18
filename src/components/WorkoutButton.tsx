import React, { useState } from 'react'

interface WorkoutButtonProps {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'destructive' | 'blackText' | 'whiteText' | 'completedSectionLink' | 'unsetText'
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  type?: 'button' | 'submit' | 'reset'
	size?: 'sm' | 'md' | 'lg'
	rounded?: 'default' | 'full'
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-action-primary)',
    color: 'var(--color-action-primary-text)'
  },
  secondary: {
    backgroundColor: 'var(--color-action-secondary)',
    color: 'var(--color-action-secondary-text)'
  },
  destructive: {
    backgroundColor: 'var(--color-action-destructive)',
    color: 'var(--color-action-destructive-text)'
  },
	blackText: {
		backgroundColor: 'var(--color-action-secondary-bg)',
		color:'var(--color-action-secondary-text-on-light)',
		textDecoration: 'underline',
	},
	whiteText: {
		backgroundColor: 'var(--color-action-secondary-bg)',
		color:'var(--color-action-secondary-text-on-dark)',
		textDecoration: 'underline',
	},
	completedSectionLink: {
		backgroundColor: 'var(--color-action-secondary-bg)',
		color:'var(--color-action-completed-section-link)',
		textDecoration: 'underline',
	},
	unsetText: {
		backgroundColor: 'var(--color-action-secondary-bg)',
		color:'inherit',
		textDecoration: 'underline',
	}
}

const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
  sm: {
    padding: '0.25rem 0.6rem',
    fontSize: '0.8rem',
  },
  md: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
  },
  lg: {
    padding: '0.8rem 1.1rem',
    fontSize: '1rem',
		fontWeight:'bold',
  },
}

export function WorkoutButton({
  label,
  icon,
  onClick,
	variant = 'primary',
  disabled = false,
  loading = false,
	size = 'md',
  loadingLabel,
  type = 'button',
	rounded = 'default',
}: WorkoutButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
		...sizeStyles[size],
    border: 'none',
    borderRadius: rounded==='full'?'999px':'8px',
		fontFamily: 'var(--font-body)',
		fontWeight: 700,
    boxShadow: variant==='whiteText'||variant==='completedSectionLink'||variant==='blackText'||variant==='unsetText'? 'none' : (isPressed ? 'inset 0 0px 8px var(--shadow-button-pressed)' : 'inset -2px -2px var(--shadow-button-inset)'),
    transition: 'box-shadow 0.1s ease',
    opacity: disabled || loading ? 0.6 : isPressed ? 0.85 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer'
  }

  const isDisabled = disabled || loading;
  const displayLabel = loading ? loadingLabel ?? label : label;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      onMouseDown={() => {
        if (isDisabled) return;
        if (variant === 'whiteText' || variant === 'completedSectionLink' || variant === 'blackText') return;
        setIsPressed(true);
      }}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={baseStyle}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
    >
      {icon ? `${icon} ` : ''}{displayLabel}
    </button>
  )
}
