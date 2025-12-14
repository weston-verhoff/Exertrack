import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/drawer.css';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number | string;
  children: ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  width = 420,
  children,
}: DrawerProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Mount when opened
  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  // Unmount AFTER close animation
  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Scroll lock
	useEffect(() => {
	  if (!isOpen) return;

	  const scrollbarWidth =
	    window.innerWidth - document.documentElement.clientWidth;

	  const prevOverflow = document.body.style.overflow;
	  const prevPaddingRight = document.body.style.paddingRight;

	  document.body.style.overflow = 'hidden';
	  document.body.style.paddingRight = `${scrollbarWidth}px`;

	  return () => {
	    document.body.style.overflow = prevOverflow;
	    document.body.style.paddingRight = prevPaddingRight;
	  };
	}, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <>
      <div
        className="drawer-backdrop"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      <aside
        className={`drawer-panel ${isOpen ? 'open' : 'closed'}`}
        style={{ width }}
        onAnimationEnd={handleAnimationEnd}
        onClick={e => e.stopPropagation()}
      >
        <button className="drawer-close" onClick={onClose}>✕</button>
        <div className="drawer-content">{children}</div>
      </aside>
    </>,
    document.body
  );
}
