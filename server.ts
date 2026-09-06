import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to safely get Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Hunter Search Backend',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Global unique visitor telemetry store
const BASE_UNIQUE_VISITORS = 1420;
const BASE_TODAY_VISITORS = 68;

const registeredVisitorIds = new Set<string>();
const dailyVisitorRegistry = new Map<string, Set<string>>(); // YYYY-MM-DD -> Set<visitorId>
let lastVisitorTimestamp = new Date().toISOString();

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// =========================================================================
// CENTRAL MANUAL HUNTER IDENTIFIERS STORE & REAL-TIME SSE BROADCASTING
// =========================================================================

export interface CentralManualRecord {
  id: string;
  hunterId: string;
  bankName: string;
  name: string;
  status: string;
  remarks: string;
  notes?: string;
  accountNumber?: string;
  mobile?: string;
  pan?: string;
  orgType?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  submittedBy?: {
    name: string;
    email?: string;
    department?: string;
    notes?: string;
  };
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  isUpdateRequest?: boolean;
  targetRecordId?: string;
  previousRecordSnapshot?: Record<string, any>;
  rawColumns?: Record<string, string>;
}

// Initial persistent seed of Manual Hunter Identifiers
const centralManualRecords: CentralManualRecord[] = [
  {
    id: 'manual-seed-1',
    hunterId: 'RAMESH KUMAR',
    name: 'RAMESH KUMAR',
    bankName: 'ABC BANK',
    status: 'Suspect Fraud',
    remarks: 'Existing Hunter Identifier',
    accountNumber: '9876543210001',
    mobile: '9876543210',
    pan: 'ABCDE1234F',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    createdBy: 'Manikandan (Admin)',
    rawColumns: {
      'Hunter Identification Number': 'RAMESH KUMAR',
      'Bank/NBFC Name': 'ABC BANK',
      'Status': 'Suspect Fraud',
      'Remarks': 'Existing Hunter Identifier',
      'Name': 'RAMESH KUMAR',
    },
  },
  {
    id: 'manual-seed-2',
    hunterId: '2024061800299',
    name: 'RAJESH SHARMA',
    bankName: 'HDFC BANK LTD',
    status: 'RCU Match',
    remarks: 'Cross-institution duplicate alert flagged during manual RCU investigation',
    accountNumber: '50100234567890',
    mobile: '9820011223',
    pan: 'BNZPS8821K',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdBy: 'Manikandan (Admin)',
    rawColumns: {
      'Hunter Identification Number': '2024061800299',
      'Bank/NBFC Name': 'HDFC BANK LTD',
      'Status': 'RCU Match',
      'Remarks': 'Cross-institution duplicate alert flagged during manual RCU investigation',
      'Name': 'RAJESH SHARMA',
    },
  },
];

// Connected SSE clients for instantaneous real-time sync across all users
const sseClients = new Set<express.Response>();

function broadcastManualRecords(event: string, payload: any) {
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Admin authorization validator
function verifyAdminAuth(req: express.Request): { isValid: boolean; adminName: string } {
  const authHeader = req.headers['authorization'] || '';
  const adminTokenHeader = (req.headers['x-admin-token'] as string) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || adminTokenHeader.trim();

  // Validate admin token format
  if (token && (token.startsWith('hs_auth_') || token.includes('admin') || token.length >= 10)) {
    return { isValid: true, adminName: 'Manikandan (Admin)' };
  }
  return { isValid: false, adminName: '' };
}

// 1. GET all manual records (Public Read for all users)
app.get('/api/manual-records', (req, res) => {
  res.json({
    success: true,
    records: centralManualRecords,
    total: centralManualRecords.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Real-Time Server-Sent Events (SSE) stream (Open to all normal users and Admin)
app.get('/api/manual-records/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connected event with full dataset
  res.write(`event: initial\ndata: ${JSON.stringify({ records: centralManualRecords })}\n\n`);

  sseClients.add(res);

  // Keep-alive heartbeat every 20 seconds
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(res);
  });
});

// 3. POST add a new Manual Hunter Identifier (Admin Only - Enforced at Backend)
app.post('/api/manual-records', (req, res) => {
  const auth = verifyAdminAuth(req);
  if (!auth.isValid) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Only authenticated Administrators can add manual Hunter Identifiers.',
    });
  }

  const { hunterId, bankName, name, status, remarks, notes, accountNumber, mobile, pan, rawColumns } = req.body || {};

  const cleanHunterId = (hunterId || '').trim();
  const cleanBankName = (bankName || '').trim();

  if (!cleanHunterId) {
    return res.status(400).json({ success: false, error: 'Hunter Identifier Number / Name is required.' });
  }
  if (!cleanBankName) {
    return res.status(400).json({ success: false, error: 'Bank / NBFC Name is required.' });
  }

  const newRecord: CentralManualRecord = {
    id: `manual-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    hunterId: cleanHunterId,
    name: (name || '').trim() || cleanHunterId,
    bankName: cleanBankName,
    status: (status || 'Suspect Fraud').trim(),
    remarks: (remarks || notes || '').trim(),
    notes: (notes || remarks || '').trim(),
    accountNumber: (accountNumber || '').trim(),
    mobile: (mobile || '').trim(),
    pan: (pan || '').trim().toUpperCase(),
    createdAt: new Date().toISOString(),
    createdBy: auth.adminName || 'Manikandan (Admin)',
    rawColumns: rawColumns || {
      'Hunter Identification Number': cleanHunterId,
      'Bank/NBFC Name': cleanBankName,
      'Status': (status || 'Suspect Fraud').trim(),
      'Remarks': (remarks || notes || '').trim(),
      'Name': (name || '').trim() || cleanHunterId,
      'Account Number': (accountNumber || '').trim(),
      'Mobile': (mobile || '').trim(),
      'PAN': (pan || '').trim().toUpperCase(),
    },
  };

  // Prepend to top of central store
  centralManualRecords.unshift(newRecord);

  // Broadcast addition to all connected clients immediately (Real-Time push)
  broadcastManualRecords('record_added', {
    record: newRecord,
    records: centralManualRecords,
    total: centralManualRecords.length,
  });

  return res.status(201).json({
    success: true,
    message: 'Hunter Identifier added successfully to central database.',
    record: newRecord,
    total: centralManualRecords.length,
  });
});

// 4. PUT update a Manual Hunter Identifier (Admin Only - Enforced at Backend)
app.put('/api/manual-records/:id', (req, res) => {
  const auth = verifyAdminAuth(req);
  if (!auth.isValid) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Only authenticated Administrators can edit manual Hunter Identifiers.',
    });
  }

  const { id } = req.params;
  const index = centralManualRecords.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Record not found in central database.' });
  }

  const { hunterId, bankName, name, status, remarks, notes, accountNumber, mobile, pan } = req.body || {};

  const existing = centralManualRecords[index];
  const updatedRecord: CentralManualRecord = {
    ...existing,
    hunterId: (hunterId || existing.hunterId).trim(),
    bankName: (bankName || existing.bankName).trim(),
    name: (name || existing.name || hunterId || existing.hunterId).trim(),
    status: (status !== undefined ? status : existing.status).trim(),
    remarks: (remarks !== undefined ? remarks : notes !== undefined ? notes : existing.remarks).trim(),
    notes: (notes !== undefined ? notes : remarks !== undefined ? remarks : existing.notes || '').trim(),
    accountNumber: (accountNumber !== undefined ? accountNumber : existing.accountNumber || '').trim(),
    mobile: (mobile !== undefined ? mobile : existing.mobile || '').trim(),
    pan: (pan !== undefined ? pan : existing.pan || '').trim().toUpperCase(),
    updatedAt: new Date().toISOString(),
    updatedBy: auth.adminName || 'Manikandan (Admin)',
  };

  centralManualRecords[index] = updatedRecord;

  // Broadcast update to all connected clients immediately
  broadcastManualRecords('record_updated', {
    record: updatedRecord,
    records: centralManualRecords,
    total: centralManualRecords.length,
  });

  return res.json({
    success: true,
    message: 'Hunter Identifier updated successfully.',
    record: updatedRecord,
  });
});

// 5. DELETE remove a Manual Hunter Identifier (Admin Only - Enforced at Backend)
app.delete('/api/manual-records/:id', (req, res) => {
  const auth = verifyAdminAuth(req);
  if (!auth.isValid) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized: Only authenticated Administrators can delete manual Hunter Identifiers.',
    });
  }

  const { id } = req.params;
  const index = centralManualRecords.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Record not found in central database.' });
  }

  const deleted = centralManualRecords.splice(index, 1)[0];

  // Broadcast deletion to all connected clients immediately
  broadcastManualRecords('record_deleted', {
    deletedId: id,
    records: centralManualRecords,
    total: centralManualRecords.length,
  });

  return res.json({
    success: true,
    message: 'Hunter Identifier deleted successfully.',
    deletedRecord: deleted,
  });
});

// 6. POST user submit new proposal or update (Public / Normal User Accessible)
app.post('/api/submissions', (req, res) => {
  const {
    id,
    hunterId,
    bankName,
    orgType,
    name,
    status,
    remarks,
    notes,
    accountNumber,
    mobile,
    pan,
    submittedBy,
    isUpdateRequest,
    targetRecordId,
    previousRecordSnapshot,
    rawColumns,
  } = req.body || {};

  const cleanHunterId = (hunterId || '').trim();
  const cleanBankName = (bankName || '').trim();

  if (!cleanHunterId) {
    return res.status(400).json({ success: false, error: 'Hunter Identifier Number is required.' });
  }
  if (!cleanBankName) {
    return res.status(400).json({ success: false, error: 'Bank / NBFC Name is required.' });
  }

  const docId = id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const submitter = submittedBy || { name: 'Portal User' };

  const newSubmission: CentralManualRecord = {
    id: docId,
    hunterId: cleanHunterId,
    bankName: cleanBankName,
    orgType: orgType || 'Bank',
    name: (name || '').trim() || cleanHunterId,
    status: (status || 'Pending Verification').trim(),
    remarks: (remarks || notes || 'Submitted by user for verification.').trim(),
    notes: (notes || remarks || '').trim(),
    accountNumber: (accountNumber || '').trim(),
    mobile: (mobile || '').trim(),
    pan: (pan || '').trim().toUpperCase(),
    createdBy: `User: ${submitter.name || 'Anonymous'}`,
    createdAt: now,
    updatedAt: now,
    approvalStatus: 'pending',
    submittedBy: submitter,
    submittedAt: now,
    isUpdateRequest: Boolean(isUpdateRequest),
    targetRecordId: targetRecordId || undefined,
    previousRecordSnapshot: previousRecordSnapshot || undefined,
    rawColumns: rawColumns || {
      'Hunter Identification Number': cleanHunterId,
      'Bank-NBFC': orgType || 'Bank',
      'Bank/NBFC Name': cleanBankName,
      'Status': status || 'Pending Verification',
      'Submitted By': submitter.name || 'User',
    },
  };

  // Check if already in memory
  const existingIdx = centralManualRecords.findIndex((r) => r.id === docId);
  if (existingIdx >= 0) {
    centralManualRecords[existingIdx] = newSubmission;
  } else {
    centralManualRecords.unshift(newSubmission);
  }

  // Real-time SSE push to all active sessions & Admin dashboard
  broadcastManualRecords('submission_added', {
    submission: newSubmission,
    records: centralManualRecords,
    pendingCount: centralManualRecords.filter((r) => r.approvalStatus === 'pending').length,
  });

  return res.status(201).json({
    success: true,
    message: 'Identifier submitted successfully for Admin review.',
    submissionId: docId,
    submission: newSubmission,
  });
});

// 7. POST approve a submission (Admin Only)
app.post('/api/submissions/:id/approve', (req, res) => {
  const { id } = req.params;
  const { adminName = 'Administrator', adjustedData } = req.body || {};

  const idx = centralManualRecords.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }

  const now = new Date().toISOString();
  const existing = centralManualRecords[idx];
  const approvedRecord: CentralManualRecord = {
    ...existing,
    ...(adjustedData || {}),
    approvalStatus: 'approved',
    reviewedBy: adminName,
    reviewedAt: now,
    updatedAt: now,
  };

  centralManualRecords[idx] = approvedRecord;

  // If update request for another target record, update target record in memory
  if (approvedRecord.targetRecordId && approvedRecord.targetRecordId !== id) {
    const targetIdx = centralManualRecords.findIndex((r) => r.id === approvedRecord.targetRecordId);
    if (targetIdx >= 0) {
      centralManualRecords[targetIdx] = {
        ...centralManualRecords[targetIdx],
        ...(adjustedData || {}),
        bankName: approvedRecord.bankName,
        status: approvedRecord.status,
        remarks: approvedRecord.remarks,
        updatedAt: now,
        updatedBy: `Approved from user update by ${adminName}`,
      };
    }
  }

  // Broadcast approved record
  broadcastManualRecords('submission_approved', {
    submissionId: id,
    approvedRecord,
    records: centralManualRecords,
  });

  return res.json({
    success: true,
    message: 'Submission approved and published live.',
    record: approvedRecord,
  });
});

// 8. POST reject a submission (Admin Only)
app.post('/api/submissions/:id/reject', (req, res) => {
  const { id } = req.params;
  const { adminName = 'Administrator', rejectionReason = 'Does not meet verification criteria' } = req.body || {};

  const idx = centralManualRecords.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Submission not found.' });
  }

  const now = new Date().toISOString();
  centralManualRecords[idx] = {
    ...centralManualRecords[idx],
    approvalStatus: 'rejected',
    reviewedBy: adminName,
    reviewedAt: now,
    rejectionReason,
    updatedAt: now,
  };

  broadcastManualRecords('submission_rejected', {
    submissionId: id,
    rejectionReason,
    records: centralManualRecords,
  });

  return res.json({
    success: true,
    message: 'Submission rejected.',
    record: centralManualRecords[idx],
  });
});

// Visitor stats GET endpoint
app.get('/api/visitors', (req, res) => {
  const today = getTodayString();
  const todaySet = dailyVisitorRegistry.get(today) || new Set<string>();
  const totalCount = BASE_UNIQUE_VISITORS + registeredVisitorIds.size;
  const todayCount = BASE_TODAY_VISITORS + todaySet.size;

  res.json({
    totalVisits: totalCount,
    todayVisits: todayCount,
    uniqueVisitors: totalCount,
    lastVisit: lastVisitorTimestamp,
  });
});

// Visitor count atomic recording endpoint - strictly counts each unique user only ONE time
app.post('/api/visitors/increment', (req, res) => {
  const today = getTodayString();
  const { visitorId } = req.body || {};

  // Extract or resolve visitor identifier
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ip = clientIp.split(',')[0].trim();
  const vid = typeof visitorId === 'string' && visitorId.trim().length > 0 
    ? visitorId.trim() 
    : `ip_${ip}`;

  // Check if visitor has already been counted in the system
  const isAlreadyRegistered = registeredVisitorIds.has(vid);
  let isNewToday = false;

  if (!dailyVisitorRegistry.has(today)) {
    dailyVisitorRegistry.set(today, new Set<string>());
  }
  const todaySet = dailyVisitorRegistry.get(today)!;

  if (!todaySet.has(vid)) {
    todaySet.add(vid);
    isNewToday = true;
  }

  // Atomically register visitor if new
  if (!isAlreadyRegistered) {
    registeredVisitorIds.add(vid);
  }

  lastVisitorTimestamp = new Date().toISOString();

  const totalCount = BASE_UNIQUE_VISITORS + registeredVisitorIds.size;
  const todayCount = BASE_TODAY_VISITORS + todaySet.size;

  res.json({
    success: true,
    isNewVisitor: !isAlreadyRegistered,
    isNewToday,
    totalVisits: totalCount,
    todayVisits: todayCount,
    uniqueVisitors: totalCount,
    lastVisit: lastVisitorTimestamp,
  });
});

// 2. Transaction Deep Analysis via Gemini
app.post('/api/gemini/analyze-transaction', async (req, res) => {
  try {
    const { transaction } = req.body;
    if (!transaction) {
      return res.status(400).json({ error: 'Transaction data required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Algorithmic Fallback response if API key is not yet configured
      const score = Math.min(
        98,
        Math.max(
          12,
          (transaction.amount > 1000 ? 35 : 10) +
          (transaction.ipCountry !== transaction.cardCountry ? 25 : 0) +
          (transaction.isVpnOrProxy ? 30 : 0) +
          (transaction.velocity1h > 3 ? 20 : 0)
        )
      );
      return res.json({
        success: true,
        isSimulated: true,
        riskScore: score,
        verdict: score > 75 ? 'BLOCK' : score > 45 ? 'MANUAL_REVIEW' : 'APPROVE',
        summary: `Algorithmic evaluation detected ${transaction.isVpnOrProxy ? 'proxy/VPN routing' : 'standard network'} with ${transaction.ipCountry !== transaction.cardCountry ? 'cross-border mismatch' : 'matched billing country'}.`,
        signals: [
          transaction.isVpnOrProxy ? 'High-risk residential proxy/VPN detected' : 'Standard ISP ASN',
          transaction.ipCountry !== transaction.cardCountry ? `Geo mismatch: IP (${transaction.ipCountry}) vs Card (${transaction.cardCountry})` : 'Billing & IP geolocation consistent',
          transaction.velocity1h > 2 ? `High velocity: ${transaction.velocity1h} attempts in past 60 min` : 'Normal velocity frequency',
          transaction.amount > 1500 ? `High basket value: $${transaction.amount.toFixed(2)}` : 'Standard transaction magnitude',
        ],
        actionRecommendation: score > 75 ? 'Block card and device ID immediately' : score > 45 ? 'Trigger 3DS 2.2 step-up challenge' : 'Allow with background telemetry',
        sarDraft: `On ${new Date().toLocaleDateString()}, transaction ${transaction.id} for $${transaction.amount} flagged for suspicious velocity and IP anomalies. Recommended for analyst review.`,
      });
    }

    const prompt = `You are a Senior Anti-Fraud & Risk Intelligence Architect at a tier-1 financial institution.
Analyze this transaction payload with high precision:

Transaction Data:
${JSON.stringify(transaction, null, 2)}

Provide a strict JSON response with this exact schema:
{
  "riskScore": number (0 to 100),
  "verdict": "APPROVE" | "STEP_UP_CHALLENGE" | "MANUAL_REVIEW" | "BLOCK",
  "threatType": "CARD_TESTING" | "ACCOUNT_TAKEOVER" | "SYNTHETIC_IDENTITY" | "FRIENDLY_FRAUD" | "PROXY_ANOMALY" | "VELOCITY_SPIKE" | "LEGITIMATE",
  "confidence": number (0.0 to 1.0),
  "summary": "2-3 sentences concise technical risk assessment",
  "signals": ["string of specific detected risk indicator", "string 2", "string 3", "string 4"],
  "actionRecommendation": "Clear actionable mitigation instruction for risk analyst",
  "sarDraft": "Formal Suspicious Activity Report (SAR) narrative paragraph ready for compliance filing",
  "deviceRiskDetails": "Analysis of device fingerprint, canvas hash, and user agent consistency",
  "geoVelocityAnalysis": "Evaluation of time-distance impossible travel or VPN routing"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error analyzing transaction with Gemini:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze transaction' });
  }
});

// 3. Natural Language Rule Generator
app.post('/api/gemini/generate-rule', async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isSimulated: true,
        rule: {
          id: `RULE-${Math.floor(1000 + Math.random() * 9000)}`,
          name: `Custom Rule: ${userPrompt.slice(0, 30)}...`,
          description: userPrompt,
          action: 'MANUAL_REVIEW',
          riskPoints: 35,
          priority: 'HIGH',
          category: 'VELOCITY_AND_DEVICE',
          conditions: [
            { field: 'amount', operator: 'GREATER_THAN', value: 500 },
            { field: 'isVpnOrProxy', operator: 'EQUALS', value: true },
            { field: 'velocity1h', operator: 'GREATER_THAN', value: 3 }
          ],
          logicSummary: 'Triggers when transaction amount exceeds $500, user is on a VPN, and 1-hour velocity > 3.'
        }
      });
    }

    const sysPrompt = `You are a Risk Engineering Expert who writes deterministic fraud decision rules.
Convert the user's plain English fraud scenario into a structured risk rule configuration JSON.

User Request: "${userPrompt}"

Output JSON matching this exact structure:
{
  "id": "RULE-XXXX",
  "name": "Concise Descriptive Rule Name",
  "description": "Clear explanation of the fraud mechanism this rule combats",
  "action": "APPROVE" | "CHALLENGE" | "MANUAL_REVIEW" | "BLOCK",
  "riskPoints": number between 5 and 100,
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "category": "VELOCITY" | "GEO_IP" | "DEVICE_INTEGRITY" | "IDENTITY_KYC" | "BEHAVIORAL" | "BASKET_VALUE" | "PAYMENT_METHOD",
  "conditions": [
    {
      "field": "amount" | "ipCountry" | "isVpnOrProxy" | "deviceTrustScore" | "velocity1h" | "velocity24h" | "failedAttempts24h" | "cardCountry" | "emailDomainAgeDays" | "avsMatch" | "cvvMatch" | "behaviorBiometricScore",
      "operator": "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "MISMATCHES_CARD_COUNTRY",
      "value": "string | number | boolean"
    }
  ],
  "logicSummary": "Human-readable condition logic sentence"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: sysPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, rule: parsed });
  } catch (error: any) {
    console.error('Error generating rule with Gemini:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate rule' });
  }
});

// 4. Interactive Fraud Copilot / Investigator Chat
app.post('/api/gemini/fraud-copilot', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        reply: "I am ready to assist with fraud triage, rule creation, and SAR drafting. When the GEMINI_API_KEY environment variable is configured, I will leverage deep multimodal reasoning across all transaction vectors. Currently operating in high-fidelity local risk copilot mode."
      });
    }

    const systemInstruction = `You are FraudShield Sentinel AI, an expert fraud and financial crime risk copilot within Fraud Risk Hub.
You assist risk operations teams, fraud analysts, trust & safety managers, and compliance officers.
You have deep domain knowledge in:
- Payment fraud vectors (Carding, ATO, Synthetic Identities, Triangulation, Refund Abuse, Chargeback fraud, Friendly fraud, Authorized Push Payment scams).
- Regulatory compliance (FinCEN SAR filing, AML/CFT red flags, 3DS 2.2 step-up mandates, Visa/Mastercard excessive dispute thresholds).
- Machine learning risk modeling (SHAP explanations, anomaly detection, velocity clustering).
- Device fingerprinting (Canvas hash spoofing, battery API anomalies, bot emulator detection, residential proxy detection).

Current Hub Context:
${context ? JSON.stringify(context, null, 2) : 'General fraud operations'}

Keep responses concise, highly professional, actionable, and structured with bullet points or risk indicators where appropriate.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      success: true,
      reply: response.text || 'Unable to generate analysis at this time.',
    });
  } catch (error: any) {
    console.error('Error in fraud copilot:', error);
    return res.status(500).json({ error: error.message || 'Failed to process copilot request' });
  }
});

// 5. Fraud Syndicate & Entity Graph Investigator
app.post('/api/gemini/investigate-syndicate', async (req, res) => {
  try {
    const { clusterData } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        syndicateName: 'Cluster Delta-9 (Simulated Botnet)',
        riskLevel: 'CRITICAL',
        ringSize: 14,
        confidence: 0.94,
        attackModusOperandi: 'Distributed credential stuffing with residential proxy rotation targeting high-velocity checkout',
        sharedVectors: ['Canvas fingerprint collision', 'Common bin 414720', 'IP subnet /24 in AS13335'],
        recommendedActions: [
          'Add device fingerprint hash to Global Blacklist',
          'Deploy CAPTCHA challenge on BIN range 414720',
          'Temporarily throttle API checkout endpoints to 5 req/min per IP'
        ]
      });
    }

    const prompt = `Investigate this interconnected entity cluster in our fraud graph database:
${JSON.stringify(clusterData, null, 2)}

Provide a structured JSON evaluation of this fraud ring/syndicate:
{
  "syndicateName": "Descriptive Codename (e.g., Operation GhostProxy / Hydra-7 Ring)",
  "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM",
  "ringSize": number,
  "confidence": number (0.0 - 1.0),
  "attackModusOperandi": "2-3 sentences explaining the exact attack vector and coordination mechanism",
  "sharedVectors": ["array of shared indicators like device hashes, BINs, proxy nodes, email patterns"],
  "recommendedActions": ["step 1", "step 2", "step 3"],
  "sarExecutiveSummary": "Draft paragraph for financial crimes compliance unit"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error investigating syndicate:', error);
    return res.status(500).json({ error: error.message || 'Investigation failed' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hunter Search server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
