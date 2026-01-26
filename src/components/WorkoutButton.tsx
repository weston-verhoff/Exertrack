import React, { useState } from 'react'

interface WorkoutButtonProps {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'accent' | 'info' | 'blackText' | 'whiteText' | 'unsetText'
  disabled?: boolean
  loading?: boolean
  loadingLabel?: string
  type?: 'button' | 'submit' | 'reset'
	size?: 'sm' | 'md' | 'lg'
	rounded?: 'default' | 'full'
}

const variantStyles: Record<string, React.CSSProperties> = {
  accent: {
    backgroundColor: 'var(--accent-color)',
    color: 'white'
  },
  info: {
    backgroundColor: 'var(--info-color)',
    color: 'white'
  },
	blackText: {
		backgroundColor: 'transparent',
		color:'black',
		textDecoration: 'underline',
	},
	whiteText: {
		backgroundColor: 'transparent',
		color:'white',
		textDecoration: 'underline',
	},
	unsetText: {
		backgroundColor: 'transparent',
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
  variant = 'accent',
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
    boxShadow: variant==='whiteText'||variant==='blackText'||variant==='unsetText'? 'none' : (isPressed ? 'inset 0 0px 8px rgba(0, 0, 0, 0.8)' : 'inset -2px -2px rgba(0,0,0,0.25)'),
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
        if (variant === 'whiteText' || variant === 'blackText') return;
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
