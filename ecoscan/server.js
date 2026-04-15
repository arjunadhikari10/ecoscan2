const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'social_store.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureStoreFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ reports: [], notifications: [] }, null, 2), 'utf8');
  }
}
function readStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return {
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch (_) {
    return { reports: [], notifications: [] };
  }
}
function writeStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}
function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'U';
}

// ===== AUTH API =====
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'GOOGLE_NOT_CONFIGURED', message: 'Set GOOGLE_CLIENT_ID on server.' });
    }
    const credential = req.body?.credential;
    if (!credential) return res.status(400).json({ error: 'Missing credential token' });

    const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const tokenInfo = await verifyResp.json();
    if (!verifyResp.ok) return res.status(401).json({ error: 'Invalid Google token' });

    if (tokenInfo.aud !== GOOGLE_CLIENT_ID && tokenInfo.azp !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Token audience mismatch' });
    }
    if (!tokenInfo.email) return res.status(401).json({ error: 'No email in token' });

    const name = tokenInfo.name || tokenInfo.email.split('@')[0];
    return res.json({
      user: {
        name,
        email: tokenInfo.email,
        initials: getInitials(name),
        type: 'google',
      },
    });
  } catch (_) {
    return res.status(500).json({ error: 'Google auth failed' });
  }
});

// ===== PLASTIC DATABASE API =====
const plasticDB = {
  PET: { name: 'PET Bottle', full: 'Polyethylene Terephthalate', type: 'Type 1', recyclable: true, decompose: '450+ years', bin: 'Blue (plastic)', risk: 'Low', alternatives: ['Stainless steel bottle', 'Glass bottle', 'Clay vessel'] },
  HDPE: { name: 'HDPE Container', full: 'High-Density Polyethylene', type: 'Type 2', recyclable: true, decompose: '100-500 years', bin: 'Blue (plastic)', risk: 'Low', alternatives: ['Bamboo alternatives', 'Glass containers'] },
  PS: { name: 'Polystyrene', full: 'Polystyrene/Styrofoam', type: 'Type 6', recyclable: false, decompose: '500+ years', bin: 'General waste', risk: 'High — carcinogen', alternatives: ['Banana leaf', 'Cardboard', 'Steel tiffin'] },
  PVC: { name: 'PVC', full: 'Polyvinyl Chloride', type: 'Type 3', recyclable: false, decompose: '100-1000 years', bin: 'General waste', risk: 'High — chlorine compounds', alternatives: ['Bamboo pipes', 'Steel pipes'] },
  BAG: { name: 'Plastic Bag', full: 'Low-Density Polyethylene', type: 'Type 4', recyclable: false, decompose: '10-1000 years', bin: 'Store drop-off', risk: 'Medium — microplastics', alternatives: ['Dhaka tote bag', 'Jute bag', 'Cloth bag'] },
};

app.get('/api/plastic/:type', (req, res) => {
  const data = plasticDB[req.params.type.toUpperCase()];
  if (!data) return res.status(404).json({ error: 'Plastic type not found' });
  res.json(data);
});

app.get('/api/plastics', (req, res) => {
  res.json(Object.entries(plasticDB).map(([key, val]) => ({ key, ...val })));
});

// ===== EVENTS API =====
const events = [
  { id: 'ev1', title: 'Bagmati River Cleanup Drive', date: '2026-04-14', time: '7:00 AM', location: 'Tilganga, Pashupatinath Ghat', participants: 45, points: 300 },
  { id: 'ev2', title: 'School Plastic Awareness Workshop', date: '2026-04-19', time: '10:00 AM', location: 'Lalitpur Municipality Hall', participants: 28, points: 150 },
  { id: 'ev3', title: 'Eco Market — Plastic-Free Fair', date: '2026-04-26', time: 'All day', location: 'Asan Bazaar, Kathmandu', participants: 120, points: 100 },
];

app.get('/api/events', (req, res) => res.json(events));
app.post('/api/events/:id/join', (req, res) => {
  const ev = events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  ev.participants++;
  res.json({ success: true, event: ev, pointsEarned: ev.points });
});

// ===== STATS API =====
app.get('/api/stats/nepal', (req, res) => {
  res.json({
    bagmatiPlasticTonnesDaily: 35,
    kathmandúPlasticGeneratedKgPerDay: 250000,
    recyclingRatePercent: 12,
    activeEcoScanUsers: 1842,
    totalScansThisMonth: 14200,
    plasticAvoidedKg: 3200,
  });
});

// ===== SOCIAL SAFETY + NOTIFICATION API =====
app.post('/api/reports', (req, res) => {
  const { reporterKey = 'anonymous', storyId = '', authorKey = '', reason = 'Reported', details = '' } = req.body || {};
  if (!storyId) return res.status(400).json({ error: 'storyId is required' });
  const store = readStore();
  const report = {
    id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reporterKey,
    storyId,
    authorKey,
    reason,
    details,
    createdAt: Date.now(),
    status: 'open',
  };
  store.reports.unshift(report);
  store.reports = store.reports.slice(0, 2000);
  writeStore(store);
  res.json({ success: true, report });
});

app.get('/api/reports', (req, res) => {
  const store = readStore();
  res.json({ reports: store.reports.slice(0, 200) });
});

app.post('/api/notifications', (req, res) => {
  const { userKey, type = 'activity', text = '', storyId = null, createdAt = Date.now(), read = false } = req.body || {};
  if (!userKey || !text) return res.status(400).json({ error: 'userKey and text are required' });
  const store = readStore();
  const row = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userKey,
    type,
    text,
    storyId,
    createdAt,
    read: !!read,
  };
  store.notifications.unshift(row);
  store.notifications = store.notifications.slice(0, 5000);
  writeStore(store);
  res.json({ success: true, notification: row });
});

app.get('/api/notifications', (req, res) => {
  const userKey = String(req.query.userKey || '').trim().toLowerCase();
  if (!userKey) return res.status(400).json({ error: 'userKey query is required' });
  const store = readStore();
  const notifications = store.notifications
    .filter(n => String(n.userKey || '').toLowerCase() === userKey)
    .slice(0, 200);
  res.json({ notifications });
});

app.post('/api/notifications/read-all', (req, res) => {
  const userKey = String(req.body?.userKey || '').trim().toLowerCase();
  if (!userKey) return res.status(400).json({ error: 'userKey is required' });
  const store = readStore();
  store.notifications = store.notifications.map(n => {
    if (String(n.userKey || '').toLowerCase() === userKey) return { ...n, read: true };
    return n;
  });
  writeStore(store);
  res.json({ success: true });
});

function parseTypeFromModelText(text = '') {
  const t = String(text).toUpperCase();
  if (t.includes('PET')) return 'PET';
  if (t.includes('HDPE')) return 'HDPE';
  if (t.includes('PS')) return 'PS';
  if (t.includes('PVC')) return 'PVC';
  if (t.includes('BAG')) return 'BAG';
  return null;
}

app.post('/api/scan/analyze', async (req, res) => {
  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'imageDataUrl (base64 data URL) is required' });
    }

    const m = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) {
      return res.status(400).json({ error: 'Invalid imageDataUrl format' });
    }

    const mimeType = m[1];
    const imageBase64 = m[2];
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'ANALYSIS_NOT_CONFIGURED',
        message: 'Set ANTHROPIC_API_KEY in environment to enable real camera detection.',
      });
    }

    const modelResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 140,
        temperature: 0,
        system: [
          'You are a strict plastic-type classifier for EcoScan.',
          'Classify the dominant visible item into exactly one key from: PET, HDPE, PS, PVC, BAG.',
          'If uncertain, still pick the closest key and lower confidence.',
          'Return ONLY valid JSON with keys: plasticType, confidence, reason.',
          'confidence must be a number between 0 and 1.',
          'reason must be <= 20 words.',
        ].join(' '),
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Classify this captured item.' },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
      }),
    });

    const modelData = await modelResp.json();
    if (!modelResp.ok) {
      return res.status(502).json({
        error: 'SCAN_MODEL_ERROR',
        details: modelData?.error?.message || 'Model request failed',
      });
    }

    const rawText = modelData?.content?.map(block => block?.text || '').join('\n') || '';
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (_) {
      parsed = null;
    }

    const plasticType = parseTypeFromModelText(parsed?.plasticType || rawText);
    const confidence = Number.isFinite(parsed?.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : 0.45;
    const reason = typeof parsed?.reason === 'string' ? parsed.reason : 'Best visual match from available categories.';

    if (!plasticType) {
      return res.status(422).json({
        error: 'SCAN_UNCERTAIN',
        message: 'Could not map model result to known plastic categories.',
      });
    }

    return res.json({
      plasticType,
      confidence,
      reason,
      source: 'Anthropic Vision',
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SCAN_FAILED',
      message: 'Unexpected scan failure',
    });
  }
});

// ===== CATCH-ALL: Serve React/SPA =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 EcoScan server running at http://localhost:${PORT}`);
});

module.exports = app;
