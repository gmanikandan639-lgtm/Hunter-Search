/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseCSVText } from '../utils/csvParser';
import { CSVMetadata, RecordItem } from '../types';

export const RAW_DEMO_CSV_DATA = '';

export const UNMASKED_ORGANISATION_MAP: Record<string, { unmaskedName: string; orgType: 'Bank' | 'NBFC' }> = {
  'KOTA* MAH*NDRA BANK': { unmaskedName: 'Kotak Mahindra Bank', orgType: 'Bank' },
  'AD*TYA B*RLA FINANCE LIMITED': { unmaskedName: 'Aditya Birla Finance Ltd', orgType: 'NBFC' },
  'RBL B@NK LIM*TED': { unmaskedName: 'RBL Bank Limited', orgType: 'Bank' },
  'Rel*ance Capital': { unmaskedName: 'Reliance Capital', orgType: 'NBFC' },
  'SHR*RAM FIN@NCE LIMITED': { unmaskedName: 'Shriram Finance Limited', orgType: 'NBFC' },
  'TAT@ CAP*TAL LIMITED': { unmaskedName: 'Tata Capital Limited', orgType: 'NBFC' },
  'HD*C B@NK': { unmaskedName: 'HDFC Bank', orgType: 'Bank' },
  'ID*C FIRST B@NK': { unmaskedName: 'IDFC First Bank', orgType: 'Bank' },
  'TVS CRED*T $ERVICES LIM*TED': { unmaskedName: 'TVS Credit Services Limited', orgType: 'NBFC' },
  'Ugr@w Capit@l': { unmaskedName: 'Ugraw Capital', orgType: 'NBFC' },
  'Un*ty sm@ll finance b@nk': { unmaskedName: 'Unity Small Finance Bank', orgType: 'Bank' },
  'UTKAR$H SM@LL FINANCE BANK': { unmaskedName: 'Utkarsh Small Finance Bank', orgType: 'Bank' },
  'YE$ B@NK': { unmaskedName: 'Yes Bank', orgType: 'Bank' },
  'AXI$ B@NK LIMITED': { unmaskedName: 'Axis Bank Limited', orgType: 'Bank' },
  'AD*TYA B*RLA HOUSING FINANCE LIMITED': { unmaskedName: 'Aditya Birla Housing Finance Ltd', orgType: 'NBFC' },
  'PNB HOU$ING F!NANCE': { unmaskedName: 'PNB Housing Finance', orgType: 'NBFC' },
  'C$B BANK L!MITED': { unmaskedName: 'CSB Bank Limited', orgType: 'Bank' },
  'P!RAM@L FINANCE L*MITED': { unmaskedName: 'Piramal Finance Limited', orgType: 'NBFC' },
  'HERO FI^CORP': { unmaskedName: 'Hero Fincorp', orgType: 'NBFC' },
  'SMFG': { unmaskedName: 'SMFG India Credit', orgType: 'NBFC' },
  'AXI$ B@NK LIMITED - C!T! BANK': { unmaskedName: 'Axis Bank - Citi Bank', orgType: 'Bank' },
  'INCRED FINANCE': { unmaskedName: 'InCred Finance', orgType: 'NBFC' },
  'Profectus capital': { unmaskedName: 'Profectus Capital', orgType: 'NBFC' },
  'PROFECTUS CAPITAL': { unmaskedName: 'Profectus Capital', orgType: 'NBFC' },
  'CENTRUM HOUSING FINANCE': { unmaskedName: 'Centrum Housing Finance', orgType: 'NBFC' },
  'NIWAS HOUSING FINANCE': { unmaskedName: 'Niwas Housing Finance', orgType: 'NBFC' },
  'Godrej capital limited': { unmaskedName: 'Godrej Capital Limited', orgType: 'NBFC' },
  'Godrej finance limited': { unmaskedName: 'Godrej Finance Limited', orgType: 'NBFC' },
  'GIRIUM HOUSING FINANCE LTD': { unmaskedName: 'Girium Housing Finance Ltd', orgType: 'NBFC' },
  'Girium housing finance limited': { unmaskedName: 'Girium Housing Finance Ltd', orgType: 'NBFC' },
  'ART HOUSING': { unmaskedName: 'Art Housing Finance', orgType: 'NBFC' },
  'POON@WALA F!NCROP': { unmaskedName: 'Poonawalla Fincorp', orgType: 'NBFC' },
  'CAPRI GLOBAL FINANCE': { unmaskedName: 'Capri Global Finance', orgType: 'NBFC' },
  'ICIC* B@NK': { unmaskedName: 'ICICI Bank', orgType: 'Bank' },
  'INDOSTAR CAPITAL FINANCE': { unmaskedName: 'Indostar Capital Finance', orgType: 'NBFC' },
  'Indostar Finance': { unmaskedName: 'Indostar Capital Finance', orgType: 'NBFC' },
  'EQU!TA$ SM@LL FINANCE BANK': { unmaskedName: 'Equitas Small Finance Bank', orgType: 'Bank' },
  'AU $MALL F!NANCE B@NK': { unmaskedName: 'AU Small Finance Bank', orgType: 'Bank' },
  'AXI$ FIN@NCE LIMITED': { unmaskedName: 'Axis Finance Limited', orgType: 'NBFC' },
  'DB$ B@NK L!MITED': { unmaskedName: 'DBS Bank Limited', orgType: 'Bank' },
  'SHUBHAM FINANCE': { unmaskedName: 'Shubham Housing Finance', orgType: 'NBFC' },
  'B@NDHAN B@NK': { unmaskedName: 'Bandhan Bank', orgType: 'Bank' },
  'TOYOTA F!NANCE': { unmaskedName: 'Toyota Financial Services', orgType: 'NBFC' },
  '!ND!A BULLS ( SAMM@N CAP!TAL )': { unmaskedName: 'Indiabulls (Samman Capital)', orgType: 'NBFC' },
  'SUNDAR@M F!NANCE': { unmaskedName: 'Sundaram Finance', orgType: 'NBFC' },
  'CL!X FINANCE': { unmaskedName: 'Clix Finance', orgType: 'NBFC' },
  'FED B@NK F!NANCI@L $ERVICES': { unmaskedName: 'Fedbank Financial Services', orgType: 'NBFC' },
  'Fullerton / SMPG': { unmaskedName: 'SMFG India Credit (Fullerton)', orgType: 'NBFC' },
  'INDUS!ND B@NK': { unmaskedName: 'IndusInd Bank', orgType: 'Bank' },
  'Indusind Bank': { unmaskedName: 'IndusInd Bank', orgType: 'Bank' },
  'l and T FInance': { unmaskedName: 'L&T Finance', orgType: 'NBFC' },
  '$AMMAAN CAP!TAL LIMITED-IND!A BULLS LIMITED': { unmaskedName: 'Samman Capital Limited - Indiabulls Limited', orgType: 'NBFC' },
};

export function getUnmaskedOrganisationInfo(rawBankName: string): { unmaskedName: string; orgType: 'Bank' | 'NBFC' } {
  const clean = rawBankName ? rawBankName.trim() : '';
  if (UNMASKED_ORGANISATION_MAP[clean]) {
    return UNMASKED_ORGANISATION_MAP[clean];
  }
  for (const [key, val] of Object.entries(UNMASKED_ORGANISATION_MAP)) {
    if (key.toLowerCase() === clean.toLowerCase()) {
      return val;
    }
  }
  const isBank = clean.toLowerCase().includes('bank');
  return {
    unmaskedName: clean || 'Financial Institution',
    orgType: isBank ? 'Bank' : 'NBFC',
  };
}

/**
 * Initializes and parses default master dataset - starts clean with 0 records
 */
export function getInitialDemoData(): {
  records: RecordItem[];
  metadata: CSVMetadata;
  uniqueBanks: string[];
} {
  const metadata: CSVMetadata = {
    fileName: 'No Reference Dataset Uploaded',
    fileSize: '0 KB',
    recordCount: 0,
    columnCount: 0,
    bankCount: 0,
    uploadedAt: '—',
    headers: ['Hunter Identification Number', 'Organisation Name', 'Bank-NBFC'],
    isDemo: false,
    status: 'EMPTY',
    detectedNameCol: 'Hunter Identification Number',
    detectedBankCol: 'Organisation Name',
  };

  return {
    records: [],
    metadata,
    uniqueBanks: [],
  };
}
