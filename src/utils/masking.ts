/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Masks identifier numbers according to privacy rules:
 * - If identifier is 2 digits/chars: show as '**'
 * - If identifier is 3 digits/chars: show as '***'
 * - If identifier is 4 digits/chars: show as '****'
 * - For longer identifiers (e.g. 2024061800299, REF-9901):
 *   Never show complete number; mask all middle characters so the complete number is never exposed.
 *   e.g. "2024061800212" -> "2024*******12"
 */
export function maskIdentifierNumber(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  if (!str) return '—';

  const len = str.length;

  if (len === 1) return '*';
  if (len === 2) return '**';
  if (len === 3) return '***';
  if (len === 4) return '****';

  if (len === 5) {
    return `${str[0]}***${str[4]}`;
  }

  if (len === 6) {
    return `${str[0]}****${str[5]}`;
  }

  // 7 or more characters (e.g. 2024061800212, REF-9901)
  const prefix = str.slice(0, 2);
  const suffix = str.slice(-2);
  const maskCount = Math.max(3, len - 4);
  return `${prefix}${'*'.repeat(maskCount)}${suffix}`;
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
