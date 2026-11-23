import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

// While the overlay is mounted (and `active`), keep Tab / Shift+Tab inside the
// container and move focus into it on mount. Escape is handled by each overlay.
export function useFocusTrap(containerRef: RefObject<HTMLElement>, active = true): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) {
      return;
    }

    if (!container.hasAttribute('tabindex')) {
      // Lets the container itself take focus when it has no focusable children.
      container.setAttribute('tabindex', '-1');
    }

    const initial = focusableIn(container);
    (initial[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') {
        return;
      }
      const items = focusableIn(container);
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const focused = document.activeElement;
      if (e.shiftKey) {
        if (focused === first || !container.contains(focused)) {
          e.preventDefault();
          last.focus();
        }
      } else if (focused === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [containerRef, active]);
}
