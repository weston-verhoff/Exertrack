import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom'; // ⭐ NEW: portal support
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

  // Close on Escape (unchanged)
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // ⭐ NEW: prevent body scroll while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ⭐ NEW: move JSX into a variable
  const drawerUI = (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <aside
        className="drawer-panel"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()} // ⭐ prevent bubbling
      >
        <button className="drawer-close" onClick={onClose}>
          ✕
        </button>

        <div className="drawer-content">
          {children}
        </div>
      </aside>
    </>
  );

  // ⭐ NEW: render drawer at document.body level
  return createPortal(drawerUI, document.body);
}
