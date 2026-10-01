import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Drawer } from './Drawer';

describe('Drawer dismissal', () => {
  it.each(['mouse', 'touch'])('closes when a %s pointer presses the backdrop', (pointerType) => {
    const onClose = jest.fn();
    render(
      <Drawer isOpen onClose={onClose}>
        <button type="button">Inside action</button>
      </Drawer>
    );

    const backdrop = document.body.querySelector('.drawer-backdrop') as HTMLElement;
    fireEvent.pointerDown(backdrop, { pointerId: 1, pointerType });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close for pointer input inside the drawer panel', () => {
    const onClose = jest.fn();
    render(
      <Drawer isOpen onClose={onClose}>
        <button type="button">Inside action</button>
      </Drawer>
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Inside action' }), {
      pointerId: 1,
      pointerType: 'mouse',
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the panel mounted for the reverse close animation', () => {
    function DrawerHarness() {
      const [isOpen, setIsOpen] = useState(true);
      return (
        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          Drawer content
        </Drawer>
      );
    }

    render(<DrawerHarness />);
    const panel = document.body.querySelector('.drawer-panel') as HTMLElement;

    fireEvent.pointerDown(document.body.querySelector('.drawer-backdrop') as HTMLElement, {
      pointerId: 1,
      pointerType: 'mouse',
    });

    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('closed');

    fireEvent.animationEnd(panel);
    expect(document.body.querySelector('.drawer-panel')).not.toBeInTheDocument();
  });
});
