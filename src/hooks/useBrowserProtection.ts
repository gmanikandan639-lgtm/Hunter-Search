/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

/**
 * Checks if the event target is an interactive form element
 * (input, textarea, or contentEditable element) where text typing,
 * selection, and clipboard operations should be preserved.
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
    return true;
  }

  // Also check if nested within an input or textarea
  if (target.closest('input, textarea, [contenteditable="true"]')) {
    return true;
  }

  return false;
}

/**
 * useBrowserProtection
 * 
 * Best-effort front-end protection against:
 * 1. Text selection and dragging of application content
 * 2. Right-click context menu across the application
 * 3. Copy / Cut events on protected webpage content
 * 4. Common copy / save / print shortcuts:
 *    - Ctrl+C, Cmd+C (Copy)
 *    - Ctrl+X, Cmd+X (Cut)
 *    - Ctrl+A, Cmd+A (Select All outside inputs)
 *    - Ctrl+U, Cmd+U (View Source)
 *    - Ctrl+S, Cmd+S (Save Page)
 *    - Ctrl+P, Cmd+P (Print Page)
 *    - DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
 * 5. Dragging visible text and images
 * 
 * Usability Preservation:
 * Form inputs, search boxes, login fields, password fields, buttons,
 * and standard typing interactions remain fully functional and accessible.
 */
export function useBrowserProtection() {
  useEffect(() => {
    // 1. Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable text selection start on non-editable elements
    const handleSelectStart = (e: Event) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
      }
    };

    // 3. Disable copy events when triggered outside editable form fields
    const handleCopy = (e: ClipboardEvent) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
      }
    };

    // 4. Disable cut events when triggered outside editable form fields
    const handleCut = (e: ClipboardEvent) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
      }
    };

    // 5. Disable dragging text and images
    const handleDragStart = (e: DragEvent) => {
      if (!isEditableElement(e.target)) {
        e.preventDefault();
      }
    };

    // 6. Keyboard shortcuts interceptor (handles Windows/Linux Ctrl and macOS Cmd)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTargetEditable = isEditableElement(e.target);
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';
      const keyCode = e.keyCode || e.which;

      // 6a. Developer Tools & Inspection shortcuts (always block)
      // F12 key
      if (key === 'f12' || code === 'f12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + Shift + I (Inspect) or Option + Cmd + I
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'i' || code === 'keyi' || keyCode === 73)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + Shift + J (Console) or Option + Cmd + J
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'j' || code === 'keyj' || keyCode === 74)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + Shift + C (Element Inspector) or Option + Cmd + C
      if (
        isModifier &&
        (e.shiftKey || e.altKey) &&
        (key === 'c' || code === 'keyc' || keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 6b. View Source (Ctrl+U / Cmd+U)
      if (isModifier && (key === 'u' || code === 'keyu' || keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 6c. Save Page (Ctrl+S / Cmd+S)
      if (isModifier && (key === 's' || code === 'keys' || keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 6d. Print Page (Ctrl+P / Cmd+P)
      if (isModifier && (key === 'p' || code === 'keyp' || keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 6e. Copy / Cut / Select-All shortcuts:
      // Prevent on webpage content, but allow user to edit text inside input/textarea
      if (!isTargetEditable) {
        // Ctrl/Cmd + C (Copy)
        if (isModifier && (key === 'c' || code === 'keyc' || keyCode === 67)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Ctrl/Cmd + X (Cut)
        if (isModifier && (key === 'x' || code === 'keyx' || keyCode === 88)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Ctrl/Cmd + A (Select All)
        if (isModifier && (key === 'a' || code === 'keya' || keyCode === 65)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    };

    // Attach capture listeners for complete frontend coverage
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('selectstart', handleSelectStart, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    document.addEventListener('cut', handleCut, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      document.removeEventListener('cut', handleCut, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
