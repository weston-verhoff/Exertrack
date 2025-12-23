import React, { useState } from 'react'

type ButtonState = 'idle' | 'saving' | 'success'

interface StatusButtonProps {
  onClick: () => Promise<void>
  idleLabel?: string
  successLabel?: string
  width?: string
  accentColor?: string
  successColor?: string
}

export default function StatusButton({
  onClick,
  idleLabel = 'Submit',
  successLabel = '✅ Saved!',
  width = '200px',
  accentColor = 'var(--neutral-100)',
  successColor = 'var(--success-strong)'
}: StatusButtonProps) {
  const [status, setStatus] = useState<ButtonState>('idle')

  const handleClick = async () => {
    if (status === 'saving') return
    setStatus('saving')
    try {
      await onClick()
      setStatus('success')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('StatusButton error:', err)
      setStatus('idle')
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.96)'
    e.currentTarget.style.backgroundColor =
      status === 'success' ? 'var(--success-deep)' : 'var(--neutral-150)'
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)'
    e.currentTarget.style.backgroundColor =
      status === 'success' ? successColor : accentColor
  }

  const handleMouseLeave = handleMouseUp

  return (
    <button
      onClick={handleClick}
      disabled={status === 'saving'}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
			style={{
			  width,
			  padding: '0.5rem 1rem',
			  fontSize: '1rem',
			  border: 'none',
			  borderRadius: '4px',
			  textAlign: 'center',
			  color: status === 'success' ? 'var(--text-inverse)' : 'var(--neutral-ink)',
			  backgroundColor: status === 'success' ? successColor : accentColor,
			  transition: 'transform 0.1s ease-in-out, background-color 0.2s ease-in-out',
			  opacity: status === 'success' ? 1 : 0.85,
			  transform: 'scale(1)',
			  cursor: 'pointer',
			  outline: 'none',
			  userSelect: 'none',
			  WebkitTapHighlightColor: 'transparent'
			}}
    >
      {status === 'success' ? successLabel : idleLabel}
    </button>
  )
}
