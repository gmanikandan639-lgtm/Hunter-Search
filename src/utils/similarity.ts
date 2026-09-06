/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecordItem, SearchResultItem, SearchFilters, MatchConfidence } from '../types';

/**
 * Normalizes text for robust financial and entity verification search:
 * - Converts to lower-case
 * - Strips extra spaces & punctuation
 * - Translates common obfuscation symbols (*, @, $, ^, !, _)
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  let normalized = text.toLowerCase();

  // Normalize common bank/entity masking symbols (e.g. KOTA* -> kotak, B@NK -> bank, YE$ -> yes, FIN^CORP -> fincorp)
  normalized = normalized
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\^/g, '')
    .replace(/\*/g, '')
    .replace(/[_\-\/\\]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Calculate Levenshtein Distance
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Calculate N-Gram (Trigram) character similarity between two strings
 */
export function trigramSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) {
    return str1.includes(str2) || str2.includes(str1) ? 0.85 : 0;
  }

  const getTrigrams = (str: string): Set<string> => {
    const s = `  ${str} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) {
      trigrams.add(s.substring(i, i + 3));
    }
    return trigrams;
  };

  const set1 = getTrigrams(str1);
  const set2 = getTrigrams(str2);

  let intersection = 0;
  set1.forEach((gram) => {
    if (set2.has(gram)) intersection++;
  });

  return (2.0 * intersection) / (set1.size + set2.size);
}

/**
 * Calculate Jaro-Winkler similarity
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const l1 = s1.length;
  const l2 = s2.length;
  if (l1 === 0 || l2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(l1, l2) / 2) - 1;
  const s1Matches = Array(l1).fill(false);
  const s2Matches = Array(l2).fill(false);

  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, l2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < l1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / l1 + matches / l2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scaling
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(l1, l2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculates a composite similarity score between search query and target field (0 to 100).
 * Handles:
 * 1. Exact match (100%)
 * 2. Word subset / token containment ("DSA25BL" in "DSA25BL14994624BL" -> 95%)
 * 3. Spelling variation ("KOTA* MAH*NDRA" vs "KOTAK MAHINDRA" -> 90%)
 * 4. Typo tolerance ("SHR*RAM FIN@NCE" vs "SHRIRAM FINANCE" -> 96%)
 * 5. Prefix/initials match ("TAT@ CAP*TAL" vs "TATA CAPITAL" -> 88%)
 */
export function calculateFieldScore(query: string, targetText: string): number {
  const qNorm = normalizeText(query);
  const tNorm = normalizeText(targetText);

  if (!qNorm || !tNorm) return 0;

  // 1. Exact normalized match
  if (qNorm === tNorm) {
    return 100;
  }

  // 1b. Hunter Identifier & Numerical Pattern Matching (Prefix, Last 3, Last 5, Middle digits)
  const qDigits = qNorm.replace(/\D/g, '');
  const tDigits = tNorm.replace(/\D/g, '');
  if (qDigits.length >= 3 && tDigits.length >= 3) {
    // Exact digits match
    if (qDigits === tDigits) {
      return 98;
    }
    // Matching last 5 digits
    if (qDigits.length >= 5 && tDigits.length >= 5) {
      const qLast5 = qDigits.slice(-5);
      const tLast5 = tDigits.slice(-5);
      if (qLast5 === tLast5) {
        return 95;
      }
    }
    // Matching last 3 digits
    const qLast3 = qDigits.slice(-3);
    const tLast3 = tDigits.slice(-3);
    if (qLast3 === tLast3) {
      const baseScore = qDigits.length <= 4 || tDigits.length <= 4 ? 90 : 85;
      // If prefix also matches or high overlap, increase
      if (qDigits.slice(0, 3) === tDigits.slice(0, 3)) {
        return 95;
      }
      return baseScore;
    }
    // Same starting number / prefix
    if (qDigits.length >= 4 && tDigits.length >= 4) {
      if (qDigits.slice(0, 4) === tDigits.slice(0, 4)) {
        return 92;
      }
    }
    // Middle digits / substring containment of at least 4 digits
    if (qDigits.length >= 4 && tDigits.includes(qDigits)) {
      return 90;
    }
    if (tDigits.length >= 4 && qDigits.includes(tDigits)) {
      return 90;
    }
  }

  // 2. Substring & Whole Token Inclusions
  const qTokens = qNorm.split(' ').filter(Boolean);
  const tTokens = tNorm.split(' ').filter(Boolean);

  // Exact substring containment
  if (tNorm.includes(qNorm)) {
    // If the query is an exact full word or phrase in target
    const ratio = qNorm.length / tNorm.length;
    return Math.round(92 + ratio * 8); // 92% to 100%
  }

  if (qNorm.includes(tNorm)) {
    const ratio = tNorm.length / qNorm.length;
    return Math.round(90 + ratio * 8);
  }

  // Check token-level containment and fuzzy token matches
  let tokenMatchSum = 0;
  for (const qTok of qTokens) {
    let bestTokScore = 0;
    for (const tTok of tTokens) {
      if (qTok === tTok) {
        bestTokScore = Math.max(bestTokScore, 1.0);
      } else if (tTok.startsWith(qTok) || qTok.startsWith(tTok)) {
        bestTokScore = Math.max(bestTokScore, 0.90);
      } else {
        const jw = jaroWinklerSimilarity(qTok, tTok);
        const lev = 1 - levenshteinDistance(qTok, tTok) / Math.max(qTok.length, tTok.length);
        const score = Math.max(jw, lev);
        bestTokScore = Math.max(bestTokScore, score);
      }
    }
    tokenMatchSum += bestTokScore;
  }

  const tokenAverage = tokenMatchSum / qTokens.length;

  // Character-level N-gram similarity
  const trigram = trigramSimilarity(qNorm, tNorm);
  const jwFull = jaroWinklerSimilarity(qNorm, tNorm);

  const maxLev = Math.max(qNorm.length, tNorm.length);
  const levDist = levenshteinDistance(qNorm, tNorm);
  const levSimilarity = Math.max(0, 1 - levDist / maxLev);

  // Composite weighted score
  const composite =
    tokenAverage * 0.45 +
    trigram * 0.25 +
    jwFull * 0.20 +
    levSimilarity * 0.10;

  const finalScore = Math.round(composite * 100);
  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Determine match confidence category based on standard financial RCU/FCU standards:
 * - 90-100%: Very High Match
 * - 80-89%: High Match
 * - 70-79%: Possible Match
 * - <70%: Low / Below Threshold
 */
export function getMatchConfidence(score: number): MatchConfidence {
  if (score >= 90) return 'VERY_HIGH';
  if (score >= 80) return 'HIGH';
  if (score >= 70) return 'POSSIBLE';
  return 'LOW';
}

/**
 * Search the reference database using intelligent fuzzy matching
 */
export function searchDatabase(
  records: RecordItem[],
  query: string,
  filters: SearchFilters
): SearchResultItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const results: SearchResultItem[] = [];

  for (const record of records) {
    // If bankFilter is specified, check exact or normalized bank match
    if (filters.bankFilter) {
      const recBankNorm = normalizeText(record.bankName);
      const filterBankNorm = normalizeText(filters.bankFilter);
      if (!recBankNorm.includes(filterBankNorm) && !filterBankNorm.includes(recBankNorm)) {
        continue;
      }
    }

    const matchedFields: { field: string; value: string; score: number }[] = [];

    let maxFieldScore = 0;
    let primaryField = 'Record ID';

    // Helper to evaluate a field
    const testField = (fieldName: string, value: string | undefined, weight = 1.0) => {
      if (!value) return;
      const rawScore = calculateFieldScore(trimmedQuery, value);
      const score = Math.round(rawScore * weight);
      if (score >= 40) {
        matchedFields.push({
          field: fieldName,
          value,
          score,
        });
      }
      if (score > maxFieldScore) {
        maxFieldScore = score;
        primaryField = fieldName;
      }
    };

    // Filter type routing
    if (filters.searchType === 'NAME') {
      testField('Name / Applicant', record.name);
      testField('Uploaded By', record.uploadedBy);
      testField('Hunter ID', record.hunterId);
    } else if (filters.searchType === 'BANK_NAME') {
      testField('Bank/NBFC Name', record.bankName);
    } else if (filters.searchType === 'ACCOUNT_NUMBER') {
      testField('Account Number', record.accountNumber);
      testField('Record ID', record.id);
    } else if (filters.searchType === 'COMPANY_NAME') {
      testField('Company / Segment', record.company);
      testField('Notes', record.notes);
    } else if (filters.searchType === 'MOBILE_NUMBER') {
      testField('Mobile', record.mobile);
    } else if (filters.searchType === 'PAN') {
      testField('PAN', record.pan);
    } else if (filters.searchType === 'IDENTIFIER') {
      testField('Hunter ID', record.hunterId);
      testField('Record ID', record.id);
    } else {
      // 'ALL' or 'OTHER': evaluate all prominent columns + dynamic raw columns
      testField('Name', record.name);
      testField('Bank/NBFC Name', record.bankName, 1.0);
      testField('Hunter Identification Number', record.hunterId, 0.98);
      testField('Record ID', record.id, 0.95);
      testField('Account Number', record.accountNumber, 0.95);
      testField('Company', record.company, 0.90);
      testField('Uploaded By', record.uploadedBy, 0.90);
      testField('Status', record.status, 0.80);
      testField('Notes', record.notes, 0.85);
      testField('Mobile', record.mobile, 0.95);
      testField('PAN', record.pan, 0.95);

      // Check all other dynamic raw CSV columns
      if (record.rawColumns) {
        for (const [colName, colVal] of Object.entries(record.rawColumns)) {
          if (
            colVal &&
            !['name', 'bankName', 'hunterId', 'id', 'accountNumber', 'notes', 'status'].includes(colName)
          ) {
            testField(colName, colVal, 0.88);
          }
        }
      }
    }

    // Apply match threshold filter
    if (maxFieldScore >= filters.threshold) {
      // Sort matched fields by individual score
      matchedFields.sort((a, b) => b.score - a.score);

      results.push({
        record,
        score: maxFieldScore,
        confidence: getMatchConfidence(maxFieldScore),
        matchedFields,
        primaryMatchedField: primaryField,
      });
    }
  }

  // Sort by highest similarity score first
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.record.id || '').localeCompare(b.record.id || '');
  });

  return results;
}
