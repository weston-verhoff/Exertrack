import React, { useState } from 'react'

interface WorkoutButtonProps {
  label: string
  icon?: string
  onClick: () => void
  variant?: 'accent' | 'info' | 'blackText' | 'whiteText'
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
	}
}

export function WorkoutButton({ label, icon, onClick, variant = 'accent' }: WorkoutButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
    border: 'none',
    borderRadius: '4px',
    boxShadow: variant==='whiteText'||variant==='blackText'? 'none' : (isPressed ? 'inset 0 0px 8px rgba(0, 0, 0, 0.8)' : 'inset -2px -2px rgba(0,0,0,0.25)'),
    transition: 'box-shadow 0.1s ease'
  }

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={baseStyle}
    >
      {icon ? `${icon} ` : ''}{label}
    </button>
  )
}
