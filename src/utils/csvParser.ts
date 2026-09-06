/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RecordItem } from '../types';

/**
 * Robust RFC 4180 compliant CSV line parser supporting quoted fields and embedded commas
 */
export function parseCSVText(
  csvString: string,
  options?: {
    customNameCol?: string;
    customBankCol?: string;
  }
): {
  headers: string[];
  records: RecordItem[];
  rowCount: number;
  columnCount: number;
  uniqueBanks: string[];
  detectedNameCol: string;
  detectedBankCol: string;
} {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentLine += '"';
      i++; // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += '"';
    } else if ((char === '\r' && nextChar === '\n') || char === '\n' || char === '\r') {
      if (inQuotes) {
        currentLine += ' ';
      } else {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
        if (char === '\r' && nextChar === '\n') i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    throw new Error('The uploaded CSV file is empty.');
  }

  // Parse header line
  const headers = splitCSVRow(lines[0]).map((h) => h.trim());
  if (headers.length === 0) {
    throw new Error('Invalid CSV structure: No header row detected.');
  }

  // Map header indexes dynamically
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerMap[h.toLowerCase().trim()] = idx;
  });

  // Find likely column matches
  const findColIndex = (candidates: string[]): { index: number; headerName: string } => {
    for (const c of candidates) {
      const target = c.toLowerCase().trim();
      for (const [h, idx] of Object.entries(headerMap)) {
        if (h === target || h.replace(/[_\-\s]/g, '') === target.replace(/[_\-\s]/g, '') || h.includes(target)) {
          return { index: idx, headerName: headers[idx] };
        }
      }
    }
    return { index: -1, headerName: '' };
  };

  const idMatch = findColIndex(['record id', 'rec id', 'id', 'sr no', 's.no', 'sr_no', 'sno']);
  const hunterIdMatch = findColIndex([
    'hunter identification number',
    'hunter id',
    'hunter_identification_number',
    'hunterid',
    'identification number',
    'appl no',
    'appl_no',
    'lead id',
    'application no',
    'case id',
  ]);
  
  // Bank Column detection
  let bankColIndex = -1;
  let detectedBankCol = '';
  if (options?.customBankCol && headerMap[options.customBankCol.toLowerCase().trim()] !== undefined) {
    bankColIndex = headerMap[options.customBankCol.toLowerCase().trim()];
    detectedBankCol = headers[bankColIndex];
  } else {
    const bankMatch = findColIndex([
      'bank/nbfc name',
      'bank name',
      'bank_name',
      'bankname',
      'bank / nbfc name',
      'nbfc name',
      'bank',
      'lender',
      'institution',
      'financial institution',
      'company/bank',
    ]);
    bankColIndex = bankMatch.index;
    detectedBankCol = bankMatch.headerName || (headers.length > 2 ? headers[2] : headers[0]);
  }

  // Name Column detection
  let nameColIndex = -1;
  let detectedNameCol = '';
  if (options?.customNameCol && headerMap[options.customNameCol.toLowerCase().trim()] !== undefined) {
    nameColIndex = headerMap[options.customNameCol.toLowerCase().trim()];
    detectedNameCol = headers[nameColIndex];
  } else {
    const nameMatch = findColIndex([
      'name',
      'customer name',
      'applicant name',
      'full name',
      'customer_name',
      'applicant_name',
      'client name',
      'account holder',
      'person name',
      'hunter identification number',
      'hunter id',
    ]);
    nameColIndex = nameMatch.index;
    detectedNameCol = nameMatch.headerName || (headers.length > 1 ? headers[1] : headers[0]);
  }

  const uploadedByMatch = findColIndex(['uploaded by', 'creator', 'analyst', 'officer', 'user']);
  const uploadDateMatch = findColIndex(['upload date', 'uploaded on', 'created date', 'date', 'timestamp']);
  const lastUpdatedMatch = findColIndex(['last updated', 'updated date', 'modified date']);
  const statusMatch = findColIndex(['status', 'risk status', 'verification status', 'profile', 'risk verdict']);
  const notesMatch = findColIndex(['notes', 'remark', 'remarks', 'comments', 'risk sector', 'description']);
  const accountMatch = findColIndex(['account number', 'account no', 'acc no', 'acc_no', 'account_number', 'loan account']);
  const companyMatch = findColIndex(['company', 'company name', 'employer', 'organization', 'segment', 'entity']);
  const mobileMatch = findColIndex(['mobile', 'mobile number', 'phone', 'contact', 'mobile_no']);
  const panMatch = findColIndex(['pan', 'pan number', 'pan_no', 'tax id', 'pan_number']);

  const records: RecordItem[] = [];
  const banksSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawRow = splitCSVRow(lines[i]);
    if (rawRow.length === 0 || rawRow.every((val) => !val.trim())) continue;

    const rawColumns: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawColumns[h] = rawRow[idx] !== undefined ? rawRow[idx].trim() : '';
    });

    const recordId =
      idMatch.index !== -1 && rawRow[idMatch.index] ? rawRow[idMatch.index].trim() : `rec-${i}`;

    const hunterIdVal = hunterIdMatch.index !== -1 ? rawRow[hunterIdMatch.index]?.trim() : undefined;
    const nameVal = nameColIndex !== -1 ? rawRow[nameColIndex]?.trim() : undefined;
    const bankVal = bankColIndex !== -1 ? rawRow[bankColIndex]?.trim() : undefined;

    if (bankVal && bankVal.trim() && bankVal.trim() !== '—') {
      banksSet.add(bankVal.trim());
    }

    records.push({
      id: recordId,
      hunterId: hunterIdVal || (hunterIdMatch.index === -1 ? recordId : undefined),
      name: nameVal || (hunterIdVal ? undefined : undefined),
      bankName: bankVal || 'Unspecified Entity',
      accountNumber: accountMatch.index !== -1 ? rawRow[accountMatch.index]?.trim() : undefined,
      company: companyMatch.index !== -1 ? rawRow[companyMatch.index]?.trim() : undefined,
      mobile: mobileMatch.index !== -1 ? rawRow[mobileMatch.index]?.trim() : undefined,
      pan: panMatch.index !== -1 ? rawRow[panMatch.index]?.trim() : undefined,
      status: statusMatch.index !== -1 ? rawRow[statusMatch.index]?.trim() : 'Active Investigation',
      notes: notesMatch.index !== -1 ? rawRow[notesMatch.index]?.trim() : undefined,
      uploadedBy: uploadedByMatch.index !== -1 ? rawRow[uploadedByMatch.index]?.trim() : undefined,
      uploadDate: uploadDateMatch.index !== -1 ? rawRow[uploadDateMatch.index]?.trim() : undefined,
      lastUpdated: lastUpdatedMatch.index !== -1 ? rawRow[lastUpdatedMatch.index]?.trim() : undefined,
      rawColumns,
    });
  }

  const uniqueBanks = Array.from(banksSet).sort((a, b) => a.localeCompare(b));

  return {
    headers,
    records,
    rowCount: records.length,
    columnCount: headers.length,
    uniqueBanks,
    detectedNameCol: detectedNameCol || headers[0],
    detectedBankCol: detectedBankCol || (headers[1] || headers[0]),
  };
}


/**
 * Splits a single CSV row handling quoted fields
 */
function splitCSVRow(rowStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    const nextChar = rowStr[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Mask sensitive data for display (e.g., account number, PAN)
 */
export function maskSensitiveValue(value: string | undefined, type: 'account' | 'pan' | 'mobile' | 'general' = 'general'): string {
  if (!value) return '-';
  const clean = value.trim();
  if (clean.length <= 4) return clean;

  if (type === 'account') {
    const last4 = clean.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  if (type === 'pan') {
    if (clean.length === 10) {
      return `${clean.slice(0, 2)}XXXXX${clean.slice(-3)}`;
    }
    return `XXXX${clean.slice(-4)}`;
  }

  if (type === 'mobile') {
    const last4 = clean.slice(-4);
    return `******${last4}`;
  }

  return clean;
}

/**
 * Convert records to downloadable CSV text
 */
export function exportToCSV(records: RecordItem[], headers: string[]): string {
  const csvLines: string[] = [];
  // Header line
  csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Rows
  for (const rec of records) {
    const row = headers.map((h) => {
      const val = rec.rawColumns[h] ?? (rec as any)[h] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvLines.push(row.join(','));
  }

  return csvLines.join('\n');
}
