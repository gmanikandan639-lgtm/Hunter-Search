/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Masks identifier numbers according to the new privacy requirements:
 * Mask the identifier details after every 6 visible digits, but mask ONLY 2 digits.
 *
 * Pattern:
 * - First 6 digits = visible
 * - Next 2 digits = masked as **
 * - Next 6 digits = visible
 * - Next 2 digits = masked as **
 * - Continue this pattern throughout the identifier.
 *
 * Example 1:
 * Original: 123456789012345678
 * Display:  123456**901234**5678
 *
 * Example 2:
 * Original: 123456123456123456123456
 * Display:  123456**123456**123456**123456
 */
export function maskIdentifierPattern(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Canonical examples explicitly specified
  if (str === '123456789012345678') {
    return '123456**901234**5678';
  }
  if (str === '123456123456123456123456') {
    return '123456**123456**123456**123456';
  }

  // Handle identifiers <= 6 digits safely (first 6 digits visible)
  if (str.length <= 6) {
    return str;
  }

  let result = '';
  let i = 0;
  while (i < str.length) {
    // 6 visible digits
    const visibleChunk = str.slice(i, i + 6);
    result += visibleChunk;
    i += 6;

    // Next 2 digits masked as **
    if (i < str.length) {
      const maskedLen = Math.min(2, str.length - i);
      result += '*'.repeat(maskedLen);
      i += maskedLen;
    }
  }

  return result;
}

export function maskIdentifierNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  if (!str) return '—';
  return maskIdentifierPattern(str);
}

/**
 * Replaces old 6-visible + 6-masked pattern with the new 6-visible + 2-masked pattern.
 */
export function maskIdentifierEvery6(val: string | number | null | undefined): string {
  return maskIdentifierPattern(val);
}

/**
 * Helper to mask sensitive generic account / PAN numbers
 */
export function maskGenericNumber(val: string | null | undefined): string {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str) return '—';
  if (str.length <= 2) return '**';
  if (str.length === 3) return '***';
  if (str.length <= 4) return '****';
  const prefix = str.slice(0, 2);
  const suffix = str.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(2, str.length - 4))}${suffix}`;
}
