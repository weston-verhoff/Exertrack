import React, { useState } from 'react'
import { useSystemAlerts } from '../context/SystemAlertContext'
import { CheckCircle2 } from 'lucide-react'

type ButtonState = 'idle' | 'saving' | 'success'

interface StatusButtonProps {
  onClick: () => Promise<void>
  idleLabel?: string
  successLabel?: string
  width?: string
  accentColor?: string
  successColor?: string
  alertKey?: string
}

export default function StatusButton({
  onClick,
  idleLabel = 'Submit',
  successLabel = 'Saved!',
  width = '200px',
  accentColor = 'var(--color-interactive-secondary)',
  successColor = 'var(--color-interactive-positive)',
  alertKey = 'status-button-save'
}: StatusButtonProps) {
  const [status, setStatus] = useState<ButtonState>('idle')
  const { dismissAlertGroup, showAlert } = useSystemAlerts()

  const handleClick = async () => {
    if (status === 'saving') return
    setStatus('saving')
    showAlert('Saving...', { replaceKey: alertKey })
    try {
      await onClick()
      setStatus('success')
      showAlert(successLabel, { tone: 'success', replaceKey: alertKey })
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('StatusButton error:', err)
      dismissAlertGroup(alertKey)
      showAlert(err instanceof Error ? err.message : 'Unable to save. Please try again.', { tone: 'error' })
      setStatus('idle')
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.96)'
    e.currentTarget.style.backgroundColor =
      status === 'success' ? 'var(--color-interactive-positive-hover)' : 'var(--color-border-subtle)'
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
			  display: 'inline-flex',
			  alignItems: 'center',
			  justifyContent: 'center',
			  gap: '0.4rem',
			  color: status === 'success' ? 'var(--color-on-interactive-positive)' : 'var(--color-on-interactive-secondary)',
			  backgroundColor: status === 'success' ? successColor : accentColor,
			  transition: 'transform 0.1s ease-in-out, background-color 0.2s ease-in-out',
			  opacity: status === 'success' ? 1 : 0.85,
			  transform: 'scale(1)',
			  cursor: 'pointer',
			  outline: 'none',
			  userSelect: 'none',
			  WebkitTapHighlightColor: 'var(--color-transparent)'
			}}
    >
      {status === 'success' && <CheckCircle2 aria-hidden="true" size={18} />}
      <span>{status === 'success' ? successLabel : idleLabel}</span>
    </button>
  )
}
