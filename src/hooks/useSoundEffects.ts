import { useEffect, useRef } from 'react';
import { playClickSound, playHoverSound } from '../lib/audio';

export function useSoundEffects() {
  const lastHoverTarget = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactiveEl = target.closest('button, a, [role="button"]') as HTMLElement;
      
      if (interactiveEl && interactiveEl !== lastHoverTarget.current) {
        if (!(interactiveEl as any).disabled) {
          playHoverSound();
        }
        lastHoverTarget.current = interactiveEl;
      } else if (!interactiveEl) {
        lastHoverTarget.current = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactiveEl = target.closest('button, a, [role="button"]') as HTMLElement;
      
      if (interactiveEl && !(interactiveEl as HTMLButtonElement).disabled) {
        playClickSound();
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick);
    };
  }, []);
}

