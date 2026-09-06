/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const VISITOR_ID_STORAGE_KEY = 'hunter_unique_visitor_id';

/**
 * Retrieves the persistent unique visitor ID from localStorage,
 * or generates and stores a new privacy-conscious cryptographically random ID
 * if one does not already exist.
 */
export function getOrCreateVisitorId(): { visitorId: string; isNew: boolean } {
  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && typeof existing === 'string' && existing.trim().length >= 10) {
      return { visitorId: existing.trim(), isNew: false };
    }

    // Generate high-entropy, privacy-conscious unique identifier
    let entropy = '';
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      entropy = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      entropy = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    const newVisitorId = `vid_${Date.now()}_${entropy}`;
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, newVisitorId);
    return { visitorId: newVisitorId, isNew: true };
  } catch (e) {
    // Graceful fallback for sandboxed environments where localStorage is restricted
    const fallbackId = `vid_temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return { visitorId: fallbackId, isNew: true };
  }
}
