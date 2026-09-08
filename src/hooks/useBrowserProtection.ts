import { useEffect } from 'react';

/**
 * useBrowserProtection
 * 
 * Front-end deterrent that disables:
 * 1. Default right-click context menu across all views (Home, Hunter Search, About, Admin, Submissions)
 * 2. Common browser inspection / DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, and macOS Command equivalents)
 * 
 * IMPORTANT ARCHITECTURAL & SECURITY NOTICE:
 * - This is strictly a client-side user deterrent against casual inspection.
 * - Real security is enforced at the database level by Cloud Firestore Security Rules.
 * - No sensitive secrets or admin credentials are exposed on the client.
 * - Standard user interactions (typing, search, copy/paste, navigation, Tab, Enter, mobile touch/scroll) remain completely intact.
 */
export function useBrowserProtection() {
  useEffect(() => {
    // 1. Intercept and prevent right-click context menu globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Intercept and prevent specific inspection / DevTools keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifier = isMac ? e.metaKey || e.ctrlKey : e.ctrlKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code || '';
      const keyCode = e.keyCode || e.which;

      // F12 key
      if (key === 'f12' || code === 'F12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl + Shift + I (Inspect) or Cmd + Option + I (macOS)
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'i' || code === 'KeyI' || keyCode === 73)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl + Shift + J (Console) or Cmd + Option + J (macOS)
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'j' || code === 'KeyJ' || keyCode === 74)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl + Shift + C (Element Inspector) or Cmd + Option + C (macOS)
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'c' || code === 'KeyC' || keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl + U (View Source) or Cmd + Option + U / Cmd + U (macOS)
      if (
        isModifier &&
        (key === 'u' || code === 'KeyU' || keyCode === 85)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // Attach listeners at document level with capture to guarantee interception across entire app
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Cleanup listeners on unmount
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
