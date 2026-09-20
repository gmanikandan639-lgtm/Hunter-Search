/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Masks identifier numbers according to privacy requirements:
 * Mask the displayed identifier details after every 6 digits/characters.
 *
 * Example 1:
 * Original: 123456789012345678
 * Display:  123456******345678
 *
 * Example 2:
 * Original: 123456789012
 * Display:  123456******
 *
 * Chunk 0 (0..6): Unmasked (first 6 characters)
 * Chunk 1 (6..12): Masked with '*'
 * Chunk 2 (12..18): Unmasked
 * Chunk 3 (18..24): Masked with '*'
 * ... alternating every 6 characters
 */
export function maskIdentifierEvery6(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  let result = '';
  for (let i = 0; i < str.length; i += 6) {
    const chunk = str.slice(i, i + 6);
    const chunkIndex = Math.floor(i / 6);
    if (chunkIndex % 2 === 0) {
      result += chunk;
    } else {
      result += '*'.repeat(chunk.length);
    }
  }
  return result;
}

export function maskIdentifierNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  if (!str) return '—';
  return maskIdentifierEvery6(str);
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
