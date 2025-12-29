import { useEffect, useCallback } from 'react';

export interface ShortcutHandlers {
  onPlayPause?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onSpeedUp?: () => void;
  onSlowDown?: () => void;
  onToggleGrid?: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          handlers.onPlayPause?.();
          break;

        case '.':
        case '>':
          event.preventDefault();
          handlers.onStep?.();
          break;

        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            handlers.onReset?.();
          }
          break;

        case '=':
        case '+':
          event.preventDefault();
          handlers.onSpeedUp?.();
          break;

        case '-':
        case '_':
          event.preventDefault();
          handlers.onSlowDown?.();
          break;

        case 'g':
          event.preventDefault();
          handlers.onToggleGrid?.();
          break;

        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlers.onSave?.();
          }
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause' },
  { key: '.', action: 'Step forward' },
  { key: 'R', action: 'Reset simulation' },
  { key: '+', action: 'Speed up' },
  { key: '-', action: 'Slow down' },
  { key: 'G', action: 'Toggle grid' },
  { key: 'Ctrl+S', action: 'Save simulation' },
];
