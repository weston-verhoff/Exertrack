// src/components/Layout.tsx
import React from 'react';

type LayoutProps = {
  children: React.ReactNode;
  padded?: boolean;
  scrollable?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
};

export function Layout({
  children,
  padded = true,
  scrollable = false,
  maxWidth = 'md',
}: LayoutProps) {
  const classNames = [
    'layout',
    padded ? 'layout--padded' : '',
    scrollable ? 'layout--scrollable' : '',
    maxWidth ? `layout--${maxWidth}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames}>{children}</div>;
}
