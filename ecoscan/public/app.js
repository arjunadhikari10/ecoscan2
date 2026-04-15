/* =============================================
   EcoScan — Main App JavaScript
   AI-powered plastic pollution awareness app
   ============================================= */

// ===== STATE =====
const state = {
  user: null,
  points: 0,
  scansCount: 0,
  plasticAvoided: 0,
  streakDays: 0,
  currentTab: 'home',
  scanHistory: [],
  joinedEvents: new Set(),
  likedStories: new Set(),
  sharedStories: new Set(),
  savedStories: new Set(),
  followedAuthors: new Set(),
  blockedAuthors: new Set(),
  commentsByStory: {},
  customStories: [],
  communityFeedFilter: 'all',
  notifications: [],
  lastActivityAt: 0,
  challengeProgress: { plasticFree: 5, bagmati: 1, scan10: 7 },
};

const cameraState = {
  stream: null,
  active: false,
};
const communityMapState = {
  map: null,
  userLocation: null,
  locating: false,
};
const SCAN_CONFIDENCE_MIN = 0.6;
const GOOGLE_CLIENT_ID = window.ECOSCAN_CONFIG?.GOOGLE_CLIENT_ID || '';
let googleAuthInitialized = false;
let pendingCommunityScrollTarget = '';

// ===== PLASTIC DATABASE =====
const plasticDB = {
  PET: {
    name: 'PET Bottle / Container',
    full: 'Polyethylene Terephthalate',
    type: 'Type 1 — PET',
    emoji: '🥤',
    recyclable: 'Yes — widely accepted',
    recyclableClass: 'td-good',
    decompose: '450+ years',
    decomposeClass: 'td-bad',
    bin: 'Blue bin (plastic)',
    dropoff: '0.8 km away',
    risk: 'Low (single use), can leach antimony',
    alternatives: [
      { em: '🫙', name: 'Stainless steel bottle', desc: 'Lasts 10+ years, zero plastic waste' },
      { em: '🪨', name: 'Glass bottle', desc: '100% recyclable, no microplastics' },
      { em: '🧉', name: 'Clay/ceramic vessel', desc: 'Traditional Nepali doko-style, fully natural' },
    ],
  },
  HDPE: {
    name: 'HDPE Container',
    full: 'High-Density Polyethylene',
    type: 'Type 2 — HDPE',
    emoji: '🧴',
    recyclable: 'Yes — easy to recycle',
    recyclableClass: 'td-good',
    decompose: '100–500 years',
    decomposeClass: 'td-bad',
    bin: 'Blue bin (plastic)',
    dropoff: '1.2 km away',
    risk: 'Low, relatively stable',
    alternatives: [
      { em: '🪥', name: 'Bamboo alternatives', desc: 'For personal care products' },
      { em: '🍶', name: 'Glass containers', desc: 'For shampoo and liquids' },
    ],
  },
  PS: {
    name: 'Polystyrene (Styrofoam)',
    full: 'Polystyrene',
    type: 'Type 6 — PS',
    emoji: '📦',
    recyclable: 'No — avoid',
    recyclableClass: 'td-bad',
    decompose: '500+ years',
    decomposeClass: 'td-bad',
    bin: 'General waste (not recyclable)',
    dropoff: 'Specialist facility only',
    risk: 'High — styrene is a known carcinogen',
    alternatives: [
      { em: '🌿', name: 'Banana leaf packaging', desc: 'Traditional, biodegradable wrapping' },
      { em: '📋', name: 'Cardboard boxes', desc: 'Recyclable and biodegradable' },
      { em: '🪣', name: 'Reusable steel tiffin', desc: 'Perfect for Nepali street food takeaway' },
    ],
  },
  PVC: {
    name: 'PVC Pipe / Container',
    full: 'Polyvinyl Chloride',
    type: 'Type 3 — PVC',
    emoji: '🔧',
    recyclable: 'Rarely — complex process',
    recyclableClass: 'td-bad',
    decompose: '100–1000 years',
    decomposeClass: 'td-bad',
    bin: 'General waste',
    dropoff: 'N/A',
    risk: 'High — contains phthalates and chlorine',
    alternatives: [
      { em: '🪵', name: 'Bamboo pipes', desc: 'Traditional and sustainable material' },
      { em: '🔩', name: 'Steel pipes', desc: 'Long-lasting, fully recyclable' },
    ],
  },
  BAG: {
    name: 'Plastic Bag',
    full: 'Low-Density Polyethylene (LDPE)',
    type: 'Type 4 — LDPE',
    emoji: '🛍️',
    recyclable: 'Some — check store drop-offs',
    recyclableClass: 'td-bad',
    decompose: '10–1000 years',
    decomposeClass: 'td-bad',
    bin: 'Store drop-off only',
    dropoff: 'Bhatbhateni / Biratnagar',
    risk: 'Medium — breaks into microplastics',
    alternatives: [
      { em: '👜', name: 'Dhaka-fabric tote bag', desc: 'Handwoven Nepali traditional bag' },
      { em: '🛒', name: 'Jute bags', desc: 'Cheap, strong, fully biodegradable' },
      { em: '🎒', name: 'Reusable cloth bag', desc: 'Washable, foldable, zero waste' },
    ],
  },
};

// ===== PLASTIC TYPE GUIDE DATA =====
const plasticGuide = [
  { num: '1', name: 'PET (Polyethylene Terephthalate)', uses: 'Water bottles, food packaging, polyester fabric', bg: '#e8f7ef', tags: ['Recyclable ✔', '450yr decompose'], tagCls: ['tag-g', 'tag-a'] },
  { num: '2', name: 'HDPE (High-Density Polyethylene)', uses: 'Milk jugs, shampoo bottles, plastic pipes', bg: '#faeeda', tags: ['Easily recyclable ✔'], tagCls: ['tag-g'] },
  { num: '3', name: 'PVC (Polyvinyl Chloride)', uses: 'Pipes, window frames, cable insulation', bg: '#fcebeb', tags: ['Hard to recycle', 'Toxic when burned'], tagCls: ['tag-r', 'tag-r'] },
  { num: '4', name: 'LDPE (Low-Density Polyethylene)', uses: 'Plastic bags, squeeze bottles, film wrap', bg: '#faeeda', tags: ['Limited recycling', 'Microplastic risk'], tagCls: ['tag-a', 'tag-r'] },
  { num: '5', name: 'PP (Polypropylene)', uses: 'Bottle caps, food containers, straws', bg: '#e8f7ef', tags: ['Recyclable', 'Food-safe'], tagCls: ['tag-g', 'tag-g'] },
  { num: '6', name: 'PS (Polystyrene / Styrofoam)', uses: 'Cups, takeaway boxes, packaging foam', bg: '#fcebeb', tags: ['Avoid — not recyclable', 'Carcinogen risk'], tagCls: ['tag-r', 'tag-r'] },
  { num: '7', name: 'Other plastics (PC, ABS, etc.)', uses: 'Baby bottles, electronics, medical devices', bg: '#f1effe', tags: ['Avoid BPA plastic', 'Rarely recyclable'], tagCls: ['tag-r', 'tag-a'] },
];

// ===== LEADERBOARD DATA =====
const leaderboard = {
  nepal: [
    { init: 'RG', name: 'Rajan Gurung', pts: 4820, color: '#faeeda', tcolor: '#854f0b' },
    { init: 'PM', name: 'Priya Maharjan', pts: 4100, color: '#e8f7ef', tcolor: '#1a7a4a' },
    { init: 'SK', name: 'Sanjay KC', pts: 3670, color: '#e6f1fb', tcolor: '#185fa5' },
    { init: 'AT', name: 'Anita Tamang', pts: 3210, color: '#fbeaf0', tcolor: '#993556' },
    { init: 'BS', name: 'Bikram Shrestha', pts: 2980, color: '#faeeda', tcolor: '#854f0b' },
  ],
  ktm: [
    { init: 'PM', name: 'Priya Maharjan', pts: 4100, color: '#e8f7ef', tcolor: '#1a7a4a' },
    { init: 'AT', name: 'Anita Tamang', pts: 3210, color: '#fbeaf0', tcolor: '#993556' },
    { init: 'NB', name: 'Nabin Bajracharya', pts: 2450, color: '#e6f1fb', tcolor: '#185fa5' },
    { init: 'SP', name: 'Sunita Poudel', pts: 2100, color: '#faeeda', tcolor: '#854f0b' },
    { init: 'RM', name: 'Raj Magar', pts: 1950, color: '#e8f7ef', tcolor: '#1a7a4a' },
  ],
  global: [
    { init: 'AK', name: 'Aiko K. (Japan)', pts: 12400, color: '#fbeaf0', tcolor: '#993556' },
    { init: 'LM', name: 'Lena M. (Germany)', pts: 11200, color: '#e6f1fb', tcolor: '#185fa5' },
    { init: 'CM', name: 'Chidi M. (Nigeria)', pts: 9800, color: '#faeeda', tcolor: '#854f0b' },
    { init: 'VR', name: 'Vani R. (India)', pts: 8400, color: '#e8f7ef', tcolor: '#1a7a4a' },
    { init: 'RG', name: 'Rajan G. (Nepal)', pts: 4820, color: '#faeeda', tcolor: '#854f0b' },
  ],
};

const communityEvents = [
  {
    id: 'ev1',
    day: '14',
    mon: 'APR',
    title: 'Bagmati River Cleanup Drive',
    loc: 'Tilganga, Pashupatinath Ghat · 7:00 AM',
    cnt: '45 volunteers registered · Free gloves & bags',
    pts: 300,
    lat: 27.7106,
    lng: 85.3489,
    mapQuery: 'Tilganga, Pashupatinath Ghat, Kathmandu',
  },
  {
    id: 'ev2',
    day: '19',
    mon: 'APR',
    title: 'School Plastic Awareness Workshop',
    loc: 'Lalitpur Municipality Hall · 10:00 AM',
    cnt: 'For teachers & students · Certificate provided',
    pts: 150,
    lat: 27.6716,
    lng: 85.3254,
    mapQuery: 'Lalitpur Metropolitan City Office, Lalitpur',
  },
  {
    id: 'ev3',
    day: '26',
    mon: 'APR',
    title: 'Eco Market — Plastic-Free Products Fair',
    loc: 'Asan Bazaar, Old Kathmandu · All day',
    cnt: '50+ vendors · Use Eco Points for discounts',
    pts: 100,
    lat: 27.7048,
    lng: 85.3096,
    mapQuery: 'Asan Bazaar, Kathmandu',
  },
  {
    id: 'ev4',
    day: '3',
    mon: 'MAY',
    title: 'World Press Freedom Cleanup — Kirtipur',
    loc: 'Kirtipur Municipality · 8:00 AM',
    cnt: 'Community initiative · All welcome',
    pts: 250,
    lat: 27.6672,
    lng: 85.2775,
    mapQuery: 'Kirtipur Municipality Office, Kirtipur',
  },
];

const communityStories = [
  {
    id: 's1',
    init: 'SK',
    name: 'Sunita K.',
    loc: 'Patan',
    color: '#e8f7ef',
    tcolor: '#1a7a4a',
    text: 'I went plastic-free for 30 days. Dhaka bags + steel tiffin made daily life much easier than expected.',
    likes: 124,
    shares: 18,
    time: '2h',
    tag: 'Plastic-Free Challenge',
    authorKey: 'author:sunita-k',
    followerBase: 312,
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 's2',
    init: 'GT',
    name: 'Green KTM Team',
    loc: 'Kathmandu',
    color: '#e6f1fb',
    tcolor: '#185fa5',
    text: 'Before & after from Kirtipur drain cleanup: 80kg plastic removed from one section. Join next Sunday.',
    likes: 89,
    shares: 11,
    time: '5h',
    tag: 'Cleanup Drive',
    authorKey: 'author:green-ktm',
    followerBase: 1240,
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    id: 's3',
    init: 'RM',
    name: 'Ram M.',
    loc: 'Bhaktapur',
    color: '#faeeda',
    tcolor: '#854f0b',
    text: 'Our tole now shares jute bags and leaf wrapping from local vendors. Plastic bin waste dropped 60%.',
    likes: 67,
    shares: 9,
    time: '1d',
    tag: 'Community Action',
    authorKey: 'author:ram-m',
    followerBase: 198,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
];

// ===== UTILITIES =====
function $(id) { return document.getElementById(id); }
function showToast(msg, dur = 3000) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { t.classList.add('hidden'); t.classList.remove('show'); }, dur);
}
function showLoading() { $('loading').classList.remove('hidden'); }
function hideLoading() { $('loading').classList.add('hidden'); }
function showModal(html) {
  $('modal-box').innerHTML = '<div class="modal-drag"></div>' + html;
  $('modal-overlay').classList.remove('hidden');
}
function closeModal() { $('modal-overlay').classList.add('hidden'); }
function addPoints(pts) {
  if (!Number.isFinite(pts) || pts === 0) return;
  state.points = Math.max(0, state.points + pts);
  $('nav-pts').textContent = `🌿 ${state.points.toLocaleString()} pts`;
  if (pts > 0) {
    showToast(`🎉 +${pts} Eco Points earned!`);
  } else {
    showToast(`↩️ ${pts} Eco Points adjusted`);
  }
  saveState();
}
function saveState() {
  try {
    localStorage.setItem('ecoscan_state', JSON.stringify({
      points: state.points,
      scansCount: state.scansCount,
      plasticAvoided: state.plasticAvoided,
      streakDays: state.streakDays,
      scanHistory: state.scanHistory.slice(0, 20),
      joinedEvents: [...state.joinedEvents],
      likedStories: [...state.likedStories],
      sharedStories: [...state.sharedStories],
      savedStories: [...state.savedStories],
      followedAuthors: [...state.followedAuthors],
      blockedAuthors: [...state.blockedAuthors],
      commentsByStory: state.commentsByStory,
      customStories: state.customStories,
      communityFeedFilter: state.communityFeedFilter,
      notifications: state.notifications,
      lastActivityAt: state.lastActivityAt,
      challengeProgress: state.challengeProgress,
    }));
  } catch(e) {}
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('ecoscan_state') || '{}');
    if (s.points) state.points = s.points;
    if (s.scansCount) state.scansCount = s.scansCount;
    if (s.plasticAvoided) state.plasticAvoided = s.plasticAvoided;
    if (s.streakDays) state.streakDays = s.streakDays;
    if (s.scanHistory) state.scanHistory = s.scanHistory;
    if (s.joinedEvents) state.joinedEvents = new Set(s.joinedEvents);
    if (s.likedStories) state.likedStories = new Set(s.likedStories);
    if (s.sharedStories) state.sharedStories = new Set(s.sharedStories);
    if (s.savedStories) state.savedStories = new Set(s.savedStories);
    if (s.followedAuthors) state.followedAuthors = new Set(s.followedAuthors);
    if (s.blockedAuthors) state.blockedAuthors = new Set(s.blockedAuthors);
    if (s.commentsByStory && typeof s.commentsByStory === 'object') state.commentsByStory = s.commentsByStory;
    if (Array.isArray(s.customStories)) {
      const currentOwner = getCurrentUserKey();
      state.customStories = s.customStories.map(st => {
        if (st && !st.ownerKey && st.name && state.user?.name && st.name === state.user.name) {
          return { ...st, ownerKey: currentOwner, authorKey: st.authorKey || `author:${currentOwner}` };
        }
        return st;
      });
    }
    if (s.communityFeedFilter) state.communityFeedFilter = s.communityFeedFilter;
    if (Array.isArray(s.notifications)) state.notifications = s.notifications;
    if (s.lastActivityAt) state.lastActivityAt = s.lastActivityAt;
    if (s.challengeProgress) state.challengeProgress = { ...state.challengeProgress, ...s.challengeProgress };
  } catch(e) {}
}

// ===== AUTH =====
function initGoogleAuth() {
  if (googleAuthInitialized) return true;
  if (!window.google?.accounts?.id) return false;
  if (!GOOGLE_CLIENT_ID) return false;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredentialResponse,
    auto_select: false,
  });
  googleAuthInitialized = true;
  return true;
}

async function onGoogleCredentialResponse(resp) {
  if (!resp?.credential) {
    showToast('Google login failed. Try again.');
    return;
  }
  showLoading();
  try {
    const r = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: resp.credential }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.user) {
      throw new Error(data?.message || data?.error || 'Google auth failed');
    }
    state.user = data.user;
    bootApp();
  } catch (_) {
    showToast('Google login failed. Check GOOGLE_CLIENT_ID and try again.');
  } finally {
    hideLoading();
  }
}

function signInWithGoogle() {
  const ok = initGoogleAuth();
  if (!ok) {
    showToast('Google login not configured. Add GOOGLE_CLIENT_ID.');
    return;
  }
  window.google.accounts.id.prompt();
}
function continueAsGuest() {
  state.user = { name: 'Guest User', email: 'guest@ecoscan.np', initials: 'G', type: 'guest' };
  bootApp();
}
function bootApp() {
  loadState();
  if (state.user) {
    try { localStorage.setItem('ecoscan_user', JSON.stringify(state.user)); } catch (_) {}
  }
  $('auth-screen').classList.remove('active');
  $('main-app').classList.remove('hidden');
  $('nav-avatar').textContent = state.user.initials;
  $('nav-pts').textContent = `🌿 ${state.points.toLocaleString()} pts`;
  navigate('home');
  syncNotificationsFromServer();
}

// ===== NAVIGATION =====
function navigate(tab) {
  const prevTab = state.currentTab;
  if (prevTab === 'scan' && tab !== 'scan') stopCamera();
  if (prevTab === 'community' && tab !== 'community') destroyCommunityMap();
  state.currentTab = tab;
  document.querySelectorAll('.bn-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  const content = $('page-content');
  content.scrollTop = 0;
  switch (tab) {
    case 'home': content.innerHTML = renderHome(); break;
    case 'scan':
      content.innerHTML = renderScan();
      setupScanUI();
      break;
    case 'learn': content.innerHTML = renderLearn(); break;
    case 'community':
      content.innerHTML = renderCommunity();
      setupCommunityMap();
      if (pendingCommunityScrollTarget) {
        const target = document.getElementById(pendingCommunityScrollTarget);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
        }
        pendingCommunityScrollTarget = '';
      }
      break;
    case 'rank': content.innerHTML = renderRank(); break;
  }
}

// ===== HOME PAGE =====
function renderHome() {
  const prog1 = Math.round((state.challengeProgress.plasticFree / 7) * 100);
  const prog2 = Math.round((state.challengeProgress.bagmati / 3) * 100);
  return `
  <div class="hero">
    <div class="hero-greet">Good morning,</div>
    <div class="hero-name">${state.user?.name || 'Eco Warrior'} 🌿</div>
    <div class="hero-cta">
      <button class="hero-btn" onclick="navigate('scan')">📷 Scan Plastic Now</button>
      ${state.streakDays > 0 ? `<div class="hero-streak">🔥 ${state.streakDays}-day streak</div>` : ''}
    </div>
    <div class="hero-stats">
      <div class="h-stat" onclick="navigate('scan')">
        <div class="h-stat-n">${state.scansCount}</div>
        <div class="h-stat-l">Items Scanned</div>
      </div>
      <div class="h-stat">
        <div class="h-stat-n">${state.plasticAvoided}kg</div>
        <div class="h-stat-l">Plastic Avoided</div>
      </div>
      <div class="h-stat" onclick="navigate('rank')">
        <div class="h-stat-n">${state.points.toLocaleString()}</div>
        <div class="h-stat-l">Eco Points</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="sec-hdr"><div class="sec-title">Quick actions</div></div>
    <div class="qa-grid">
      <div class="qa-card" onclick="navigate('scan')">
        <div class="qa-ic" style="background:#e8f7ef">📷</div>
        <div class="qa-label">Scan Item</div>
        <div class="qa-sub">Identify plastic type instantly</div>
      </div>
      <div class="qa-card" onclick="navigate('learn')">
        <div class="qa-ic" style="background:#faeeda">📚</div>
        <div class="qa-label">Learn & Ask AI</div>
        <div class="qa-sub">Chat with EcoAI assistant</div>
      </div>
      <div class="qa-card" onclick="navigate('community')">
        <div class="qa-ic" style="background:#e6f1fb">🗺️</div>
        <div class="qa-label">Events Near You</div>
        <div class="qa-sub">Cleanup drives & workshops</div>
      </div>
      <div class="qa-card" onclick="goToCommunityStories()">
        <div class="qa-ic" style="background:#eaf7ef">📝</div>
        <div class="qa-label">Community Stories</div>
        <div class="qa-sub">Read and share local impact</div>
      </div>
      <div class="qa-card" onclick="navigate('rank')">
        <div class="qa-ic" style="background:#fbeaf0">🏆</div>
        <div class="qa-label">Leaderboard</div>
        <div class="qa-sub">See your Nepal ranking</div>
      </div>
    </div>
  </div>
  <div class="section" style="padding-top:0">
    <div class="sec-hdr">
      <div class="sec-title">Active challenges</div>
      <div class="sec-link" onclick="navigate('rank')">See all</div>
    </div>
    <div class="challenge-card" onclick="navigate('rank')">
      <div class="ch-em">🚫</div>
      <div class="ch-info">
        <div class="ch-title">Plastic-Free Week</div>
        <div class="ch-sub">Avoid single-use plastics for 7 days</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${prog1}%"></div></div>
        <div class="ch-meta">${state.challengeProgress.plasticFree} of 7 days completed · 200 pts reward</div>
      </div>
    </div>
    <div class="challenge-card" onclick="navigate('community')">
      <div class="ch-em">♻️</div>
      <div class="ch-info">
        <div class="ch-title">Bagmati River Guardian</div>
        <div class="ch-sub">Participate in 3 Bagmati cleanup events</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${prog2}%"></div></div>
        <div class="ch-meta">${state.challengeProgress.bagmati} of 3 events attended · 500 pts reward</div>
      </div>
    </div>
  </div>
  <div class="section" style="padding-top:0">
    <div class="tip-card">Nepal fact: The Bagmati River carries significant plastic waste through Kathmandu, eventually draining into the Ganges system and reaching the Bay of Bengal.</div>
    <div class="tip-card danger">⚠️ <strong>Health alert:</strong> Microplastics found in Kathmandu tap water. Filter or boil water stored in steel or clay vessels, not plastic containers.</div>
  </div>`;
}

// ===== SCAN PAGE =====
function renderScan() {
  const history = state.scanHistory.slice(0, 4).map(h => `
    <div class="scan-item" onclick="showScanResult('${h.key}')">
      <div class="scan-em">${h.emoji}</div>
      <div class="scan-info">
        <div class="scan-name">${h.name}</div>
        <div class="scan-meta">${h.date} · +${h.pts} pts</div>
      </div>
      <div class="scan-arrow">›</div>
    </div>`).join('');
  return `
  <div class="scan-page">
    <div class="page-header">
      <div class="page-title">Plastic Scanner</div>
      <div class="page-sub">Identify any plastic item and get recycling info</div>
    </div>
    <div class="scan-box">
      <div class="scan-target" id="scan-target" onclick="triggerScan()">
        <video id="scan-video" class="scan-video hidden" autoplay playsinline muted></video>
        <div class="scan-anim"></div>
        <div class="scan-ic">📷</div>
        <div class="scan-txt" id="scan-txt">Tap to start camera</div>
      </div>
      <div class="camera-controls">
        <button class="cam-btn" id="camera-toggle-btn" onclick="toggleCamera()">Start camera</button>
        <button class="cam-btn cam-btn-primary" id="camera-scan-btn" onclick="triggerScan()" disabled>Capture & analyze</button>
      </div>
      <div class="camera-status" id="camera-status">Camera is off.</div>
      <div class="divider">or identify manually</div>
      <div class="input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Search: bottle, bag, container..." id="search-input" oninput="filterSearch(this.value)" />
        <button class="go-btn" onclick="doSearch()">Search</button>
      </div>
      <div id="search-results"></div>
    </div>
    <div id="scan-result-area"></div>
    ${state.scanHistory.length > 0 ? `
    <div class="recent-scans">
      <div class="sec-hdr" style="padding:0 0 0.5rem"><div class="sec-title">Recent scans</div></div>
      ${history}
    </div>` : ''}
  </div>`;
}

function setupScanUI() {
  refreshCameraUI();
}

function refreshCameraUI(msg) {
  const video = $('scan-video');
  const status = $('camera-status');
  const toggleBtn = $('camera-toggle-btn');
  const scanBtn = $('camera-scan-btn');
  const txt = $('scan-txt');
  const ic = document.querySelector('#scan-target .scan-ic');

  if (!status || !toggleBtn || !scanBtn || !txt || !ic) return;

  const isActive = cameraState.active && !!cameraState.stream;
  if (video) video.classList.toggle('hidden', !isActive);
  scanBtn.disabled = !isActive;
  toggleBtn.textContent = isActive ? 'Stop camera' : 'Start camera';
  txt.textContent = isActive ? 'Tap capture to analyze this item' : 'Tap to start camera';
  ic.textContent = isActive ? '🎯' : '📷';
  status.textContent = msg || (isActive ? 'Camera ready. Point to a plastic item and capture.' : 'Camera is off.');
}

async function startCamera() {
  if (cameraState.active && cameraState.stream) return true;
  if (!navigator.mediaDevices?.getUserMedia) {
    refreshCameraUI('Camera is not supported on this browser.');
    return false;
  }
  const isSecure = window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!isSecure) {
    refreshCameraUI('Camera requires HTTPS (or localhost).');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    const video = $('scan-video');
    if (!video) {
      stream.getTracks().forEach(t => t.stop());
      return false;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});
    cameraState.stream = stream;
    cameraState.active = true;
    refreshCameraUI('Camera live. Capture when ready.');
    return true;
  } catch (err) {
    cameraState.stream = null;
    cameraState.active = false;
    refreshCameraUI('Camera permission denied or unavailable.');
    return false;
  }
}

function stopCamera() {
  if (cameraState.stream) {
    cameraState.stream.getTracks().forEach(track => track.stop());
  }
  cameraState.stream = null;
  cameraState.active = false;
  const video = $('scan-video');
  if (video) video.srcObject = null;
  refreshCameraUI('Camera stopped.');
}

function toggleCamera() {
  if (cameraState.active) {
    stopCamera();
    return;
  }
  startCamera();
}

function filterSearch(val) {
  const container = document.getElementById('search-results');
  if (!val.trim()) { container.innerHTML = ''; return; }
  const v = val.toLowerCase();
  const matches = [];
  if ('bottle water pet'.includes(v) || v.includes('bottle') || v.includes('pet') || v.includes('water')) matches.push({ key: 'PET', ...plasticDB.PET });
  if ('hdpe shampoo milk container'.includes(v) || v.includes('shampoo') || v.includes('milk')) matches.push({ key: 'HDPE', ...plasticDB.HDPE });
  if ('bag plastic shopping'.includes(v) || v.includes('bag')) matches.push({ key: 'BAG', ...plasticDB.BAG });
  if ('styrofoam polystyrene cup foam'.includes(v) || v.includes('foam') || v.includes('cup') || v.includes('styro')) matches.push({ key: 'PS', ...plasticDB.PS });
  if ('pvc pipe'.includes(v) || v.includes('pipe') || v.includes('pvc')) matches.push({ key: 'PVC', ...plasticDB.PVC });
  if (!matches.length) { container.innerHTML = `<p style="font-size:12px;color:var(--txt3);text-align:center;margin-top:8px">No results — try "bottle", "bag", or "cup"</p>`; return; }
  container.innerHTML = matches.map(m => `
    <div class="scan-item" onclick="showScanResult('${m.key}')">
      <div class="scan-em">${m.emoji}</div>
      <div class="scan-info"><div class="scan-name">${m.name}</div><div class="scan-meta">${m.type}</div></div>
      <div class="scan-arrow">›</div>
    </div>`).join('');
}
function doSearch() {
  const v = document.getElementById('search-input')?.value;
  if (v) filterSearch(v);
}

function triggerScan() {
  triggerScanAsync();
}

async function triggerScanAsync() {
  const target = document.getElementById('scan-target');
  if (!target) return;
  if (!cameraState.active) {
    await startCamera();
    return;
  }
  const video = $('scan-video');
  if (!video || !video.videoWidth || !video.videoHeight) {
    refreshCameraUI('Camera is still warming up. Try again in a second.');
    return;
  }
  target.classList.add('scanning');
  target.querySelector('.scan-txt').textContent = 'Analyzing captured image...';
  target.querySelector('.scan-ic').textContent = '🔍';
  try {
    const dataUrl = captureFrameAsDataUrl(video);
    const analysis = await analyzeCapturedItem(dataUrl);
    const key = analysis?.plasticType && plasticDB[analysis.plasticType] ? analysis.plasticType : null;
    if (!key) {
      target.classList.remove('scanning');
      refreshCameraUI('Could not identify clearly. Try moving closer with better light.');
      showToast('Could not identify item confidently. Try again.');
      showUncertainScanResult(analysis);
      return;
    }
    if (typeof analysis?.confidence === 'number' && analysis.confidence < SCAN_CONFIDENCE_MIN) {
      target.classList.remove('scanning');
      refreshCameraUI(`Low confidence (${Math.round(analysis.confidence * 100)}%). Please retake.`);
      showToast('Low confidence scan. Please retake.');
      showUncertainScanResult(analysis);
      return;
    }
    target.classList.remove('scanning');
    showScanResult(key, analysis);
    refreshCameraUI(`Detected ${plasticDB[key].name}${analysis?.confidence ? ` (${Math.round(analysis.confidence * 100)}%)` : ''}. Capture again to keep going.`);
  } catch (err) {
    target.classList.remove('scanning');
    refreshCameraUI('Scan service unavailable. Check backend/API key and try again.');
    showToast('Scan service unavailable right now.');
  }
}

function showUncertainScanResult(analysis = null) {
  const area = $('scan-result-area');
  if (!area) return;
  const confidence = typeof analysis?.confidence === 'number' ? `${(analysis.confidence * 100).toFixed(0)}%` : 'N/A';
  const reason = analysis?.reason ? escapeHtml(analysis.reason) : 'Item could not be mapped confidently to PET, HDPE, PS, PVC, or BAG.';
  area.innerHTML = `
    <div class="result-card" style="border-color:var(--warn)">
      <div class="result-hdr">
        <div class="result-em">🤔</div>
        <div>
          <div class="result-nm" style="color:var(--warn)">Unknown Item</div>
          <div class="result-type">Confidence: ${confidence}</div>
        </div>
      </div>
      <div class="tip-card warn" style="margin-bottom:0.75rem">${reason}</div>
      <div class="tip-card" style="margin-bottom:0.75rem">No points were added and this scan was not saved. Please retake in better light or move closer to the item.</div>
      <button class="cam-btn cam-btn-primary" onclick="triggerScan()">Retake scan</button>
    </div>`;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function captureFrameAsDataUrl(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function analyzeCapturedItem(imageDataUrl) {
  const response = await fetch('/api/scan/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Scan analyze request failed');
  }
  return data;
}

function showScanResult(key, analysis = null) {
  const p = plasticDB[key];
  if (!p) return;
  // Record scan
  state.scansCount++;
  state.plasticAvoided = parseFloat((state.plasticAvoided + 0.05).toFixed(2));
  const pts = 15;
  const entry = { key, name: p.name, emoji: p.emoji, pts, date: new Date().toLocaleDateString('en-NP', { day: 'numeric', month: 'short' }) };
  state.scanHistory.unshift(entry);
  state.challengeProgress.scan10 = Math.min(state.challengeProgress.scan10 + 1, 10);
  addPoints(pts);
  saveState();
  // Update hero stat
  const heroStat = document.querySelector('.h-stat-n');
  if (heroStat) heroStat.textContent = state.scansCount;

  const alts = p.alternatives.map(a => `
    <div class="alt-row">
      <div class="alt-em">${a.em}</div>
      <div>
        <div class="alt-nm">${a.name}</div>
        <div class="alt-ds">${a.desc}</div>
      </div>
    </div>`).join('');
  const area = document.getElementById('scan-result-area');
  if (!area) return;
  area.innerHTML = `
    <div class="result-card">
      <div class="result-hdr">
        <div class="result-em">${p.emoji}</div>
        <div>
          <div class="result-nm">${p.name}</div>
          <div class="result-type">${p.full} · ${p.type}${analysis?.confidence ? ` · ${(analysis.confidence * 100).toFixed(0)}% confidence` : ''}</div>
        </div>
      </div>
      ${analysis?.source ? `<div class="tip-card" style="margin-bottom:0.75rem">Scan source: ${escapeHtml(analysis.source)}</div>` : ''}
      <table class="info-table">
        <tr><td>Recyclable</td><td class="${p.recyclableClass}">${p.recyclable}</td></tr>
        <tr><td>Decomposition time</td><td class="${p.decomposeClass}">${p.decompose}</td></tr>
        <tr><td>Correct bin</td><td>${p.bin}</td></tr>
        <tr><td>Nearest drop-off</td><td class="td-good">${p.dropoff}</td></tr>
        <tr><td>Health risk</td><td>${p.risk}</td></tr>
      </table>
      <div class="alt-section">
        <div class="alt-title">♻️ Eco-friendly alternatives</div>
        ${alts}
      </div>
      <div class="points-earned">🎉 Scan recorded! +${pts} Eco Points earned</div>
    </div>`;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== LEARN PAGE =====
function renderLearn() {
  const types = plasticGuide.map(t => `
    <div class="plastic-type">
      <div class="pt-badge" style="background:${t.bg}">${t.num}</div>
      <div class="pt-info">
        <div class="pt-name">${t.name}</div>
        <div class="pt-uses">${t.uses}</div>
        <div class="tag-row">${t.tags.map((tg, i) => `<span class="tag ${t.tagCls[i]}">${tg}</span>`).join('')}</div>
      </div>
    </div>`).join('');
  return `
  <div class="learn-page">
    <div class="page-header">
      <div class="page-title">Learn & Educate</div>
      <div class="page-sub">Knowledge is the first step toward change</div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num" style="color:#e24b4a">8M+</div><div class="stat-lbl">Tonnes of plastic entering oceans yearly</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#ba7517">450</div><div class="stat-lbl">Years for a PET bottle to decompose</div></div>
      <div class="stat-card"><div class="stat-num">5T+</div><div class="stat-lbl">Microplastic pieces floating in oceans</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--g)">91%</div><div class="stat-lbl">Of all plastic never recycled</div></div>
    </div>
    <div class="tip-card">Nepal fact: The Bagmati River carries significant plastic waste through Kathmandu, eventually draining into the Ganges system and reaching the Bay of Bengal.</div>
    <div class="sec-hdr"><div class="sec-title">Plastic types guide</div></div>
    ${types}
    <div class="sec-hdr" style="margin-top:1.5rem"><div class="sec-title">Microplastic health risks</div></div>
    <div class="tip-card danger">⚠️ Microplastics have been detected in human blood, breast milk, and fetal tissue. Research suggests a person can ingest up to 5 grams of plastic per week — the equivalent of a credit card.</div>
    <div class="tip-card">💧 <strong>Water safety tip:</strong> Filter tap water in Kathmandu. The municipal supply often contains microplastic fragments from aging plastic pipes. Use a certified filter, or store in steel or clay vessels — not plastic containers.</div>
    <div class="tip-card warn">🌊 <strong>Food chain contamination:</strong> Fish caught near Kathmandu rivers show microplastic particles in their digestive tracts. The toxins accumulate up the food chain, eventually reaching humans.</div>
    <div class="sec-hdr" style="margin-top:1rem"><div class="sec-title">Ask EcoAI — your plastic advisor</div></div>
    <div class="ai-chat">
      <div class="ai-chat-hdr">
        <div class="ai-dot"></div>
        EcoAI — Powered by Claude AI
      </div>
      <div class="ai-messages" id="ai-messages">
        <div class="ai-msg bot"><div class="ai-bubble">Namaste! 🌿 I'm EcoAI, your plastic pollution advisor. Ask me anything about recycling, plastic types, the Bagmati River, or how to live more sustainably in Nepal!</div></div>
      </div>
      <div class="ai-input-row">
        <input class="ai-input" id="ai-input" type="text" placeholder="Ask about recycling, plastic types..." onkeydown="if(event.key==='Enter')sendAIMessage()" />
        <button class="ai-send" onclick="sendAIMessage()">Send</button>
      </div>
    </div>
  </div>`;
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const msgs = document.getElementById('ai-messages');
  if (!input || !msgs) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Add user message
  msgs.innerHTML += `<div class="ai-msg user"><div class="ai-bubble">${escapeHtml(text)}</div></div>`;

  // Add thinking indicator
  const thinkingId = 'thinking-' + Date.now();
  msgs.innerHTML += `<div class="ai-msg bot" id="${thinkingId}"><div class="ai-thinking"><span></span><span></span><span></span></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are EcoAI, a friendly and knowledgeable plastic pollution advisor inside the EcoScan app for Nepal. Your focus is on:
- Plastic pollution in Nepal, especially the Bagmati River in Kathmandu
- Recycling guidance specific to Nepal's waste management system
- Eco-friendly Nepali alternatives (dhaka bags, clay vessels, bamboo, etc.)
- Microplastic health risks for communities in South Asia
- How individuals in Kathmandu can reduce plastic use
Keep answers concise (2-4 sentences), warm, practical, and Nepal-specific where possible. Use occasional emojis. Always encourage positive action.`,
        messages: [{ role: 'user', content: text }]
      })
    });
    const data = await response.json();
    const reply = data.content?.[0]?.text || "I'm having trouble connecting. Please try again!";
    const thinkEl = document.getElementById(thinkingId);
    if (thinkEl) thinkEl.outerHTML = `<div class="ai-msg bot"><div class="ai-bubble">${escapeHtml(reply)}</div></div>`;
  } catch (err) {
    const thinkEl = document.getElementById(thinkingId);
    const fallback = getFallbackResponse(text);
    if (thinkEl) thinkEl.outerHTML = `<div class="ai-msg bot"><div class="ai-bubble">${escapeHtml(fallback)}</div></div>`;
  }
  msgs.scrollTop = msgs.scrollHeight;
  addPoints(5);
}

function getFallbackResponse(q) {
  const lq = q.toLowerCase();
  if (lq.includes('bagmati')) return '🏔️ The Bagmati River is one of Nepal\'s most sacred rivers, but it carries significant plastic waste through Kathmandu before draining into the Ganges system. Community cleanup events happen every month — join one to make a real difference!';
  if (lq.includes('recycl')) return '♻️ In Kathmandu, PET (Type 1) and HDPE (Type 2) plastics are most widely recycled. Look for collection points at Bhatbhateni supermarkets or contact the Solid Waste Management Office at your municipality.';
  if (lq.includes('bag') || lq.includes('alternative')) return '🛍️ Swap plastic bags for Dhaka-fabric totes or jute bags — both are widely available in Nepal, long-lasting, and fully biodegradable. Many Kathmandu markets now offer them for under Rs 100!';
  if (lq.includes('microplastic') || lq.includes('health')) return '⚠️ Microplastics have been found in Kathmandu tap water and in fish from polluted rivers. Use a water filter, store water in steel or clay vessels, and avoid heating food in plastic containers.';
  return '🌿 Great question! Reducing plastic use in Nepal starts with simple swaps: cloth bags, steel water bottles, and supporting local businesses that use natural packaging. Every small action counts for the Bagmati and beyond!';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

// ===== COMMUNITY PAGE =====
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = deg => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function requestCommunityLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported on this device.');
    return;
  }
  if (communityMapState.locating) return;
  communityMapState.locating = true;
  showToast('Getting your location...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      communityMapState.locating = false;
      communityMapState.userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      showToast('Location found. Events sorted by nearest.');
      refreshCommunityView({ keepScroll: false, scrollTop: 0 });
    },
    () => {
      communityMapState.locating = false;
      showToast('Could not access location. Check browser permissions.');
      refreshCommunityView();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
  );
}

function buildGoogleMapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildGoogleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=walking`;
}

function openEventMap(id) {
  const event = communityEvents.find(e => e.id === id);
  if (!event) return;
  window.open(buildGoogleMapsSearchUrl(event.mapQuery), '_blank', 'noopener');
}

function getStoryComments(storyId) {
  const rows = Array.isArray(state.commentsByStory[storyId]) ? state.commentsByStory[storyId] : [];
  return rows.map((c, idx) => ({
    id: c.id || `${storyId}-c-${idx}`,
    author: c.author || 'User',
    initials: c.initials || getInitials(c.author || 'User'),
    text: c.text || '',
    timeLabel: c.timeLabel || 'now',
    replies: Array.isArray(c.replies) ? c.replies.map((r, ridx) => ({
      id: r.id || `${storyId}-r-${idx}-${ridx}`,
      author: r.author || 'User',
      initials: r.initials || getInitials(r.author || 'User'),
      text: r.text || '',
      timeLabel: r.timeLabel || 'now',
    })) : [],
  }));
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'U';
}

function getCurrentUserKey() {
  return (state.user?.email || state.user?.name || 'guest').toLowerCase();
}

function getStoryAuthorKey(story) {
  return story.authorKey || `author:${(story.name || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
}

function isOwnStory(story) {
  return !!story.ownerKey && story.ownerKey === getCurrentUserKey();
}

function refreshCommunityView({ keepScroll = true, scrollTop = null } = {}) {
  if (state.currentTab !== 'community') return;
  const content = $('page-content');
  if (!content) return;
  const previousTop = keepScroll ? content.scrollTop : 0;
  content.innerHTML = renderCommunity();
  setupCommunityMap();
  content.scrollTop = scrollTop == null ? previousTop : scrollTop;
}

function setCommunityFeedFilter(filter) {
  if (!['all', 'saved', 'mine'].includes(filter)) return;
  state.communityFeedFilter = filter;
  saveState();
  refreshCommunityView({ keepScroll: false, scrollTop: 0 });
}

async function pushNotificationToServer(notification) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
  } catch (_) {}
}

async function syncNotificationsFromServer() {
  const userKey = getCurrentUserKey();
  if (!userKey) return;
  try {
    const r = await fetch(`/api/notifications?userKey=${encodeURIComponent(userKey)}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(data?.notifications)) return;
    state.notifications = data.notifications.slice(0, 80);
    saveState();
  } catch (_) {}
}

async function markNotificationsReadOnServer() {
  const userKey = getCurrentUserKey();
  if (!userKey) return;
  try {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey }),
    });
  } catch (_) {}
}

function addNotification({ type = 'activity', text, storyId = null, userKey = getCurrentUserKey() }) {
  if (!text) return;
  const entry = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userKey,
    type,
    text,
    storyId,
    createdAt: Date.now(),
    read: false,
  };
  if (userKey === getCurrentUserKey()) {
    state.notifications.unshift(entry);
    state.notifications = state.notifications.slice(0, 80);
    saveState();
  }
  pushNotificationToServer(entry);
}

function formatRelativeTime(ts) {
  if (!ts) return 'now';
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getUnreadNotificationsCount() {
  return state.notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
}

function maybeGenerateCommunityActivity() {
  const ownStories = state.customStories.filter(isOwnStory);
  if (!ownStories.length) return;
  const now = Date.now();
  if (now - (state.lastActivityAt || 0) < 180000) return;
  if (Math.random() < 0.55) return;

  const actors = ['Rajan G.', 'Priya M.', 'Green KTM Team', 'Sanjay KC', 'Anita T.'];
  const actor = actors[Math.floor(Math.random() * actors.length)];
  const target = ownStories[Math.floor(Math.random() * ownStories.length)];

  if (Math.random() < 0.5) {
    target.likes = (target.likes || 0) + 1;
    addNotification({ type: 'like', text: `${actor} liked your post`, storyId: target.id });
  } else {
    const list = getStoryComments(target.id);
    list.push({
      id: `c-${Date.now()}`,
      author: actor,
      initials: getInitials(actor),
      text: 'Great initiative. Let us join this weekend!',
      timeLabel: 'just now',
      replies: [],
    });
    state.commentsByStory[target.id] = list;
    addNotification({ type: 'comment', text: `${actor} commented on your post`, storyId: target.id });
  }
  state.lastActivityAt = now;
  saveState();
}

function destroyCommunityMap() {
  if (communityMapState.map) {
    communityMapState.map.remove();
    communityMapState.map = null;
  }
}

function setupCommunityMap() {
  const mapEl = $('community-live-map');
  if (!mapEl) return;
  if (!window.L) {
    mapEl.innerHTML = '<div class="map-fallback">Map library unavailable right now.</div>';
    return;
  }
  destroyCommunityMap();
  const center = communityMapState.userLocation || { lat: 27.7008, lng: 85.3001 };
  const map = window.L.map(mapEl, { zoomControl: true }).setView([center.lat, center.lng], communityMapState.userLocation ? 12 : 11);
  communityMapState.map = map;

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const bounds = [];
  communityEvents.forEach((event, idx) => {
    const marker = window.L.marker([event.lat, event.lng]).addTo(map);
    marker.bindPopup(
      `<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.loc)}<br><a href="${buildGoogleMapsDirectionsUrl(event.lat, event.lng)}" target="_blank" rel="noopener noreferrer">Directions</a>`
    );
    marker.bindTooltip(`${idx + 1}. ${event.title}`, { direction: 'top', offset: [0, -6] });
    bounds.push([event.lat, event.lng]);
  });

  if (communityMapState.userLocation) {
    const u = communityMapState.userLocation;
    const userMarker = window.L.circleMarker([u.lat, u.lng], {
      radius: 8,
      color: '#185fa5',
      weight: 2,
      fillColor: '#2f8ae5',
      fillOpacity: 0.9,
    }).addTo(map);
    userMarker.bindPopup('You are here');
    bounds.push([u.lat, u.lng]);
  }

  if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] });
  setTimeout(() => map.invalidateSize(), 0);
}

function renderCommunity() {
  maybeGenerateCommunityActivity();
  const userLoc = communityMapState.userLocation;
  const unreadCount = getUnreadNotificationsCount();
  const eventsForView = communityEvents.map(e => {
    const distanceKm = userLoc ? calcDistanceKm(userLoc.lat, userLoc.lng, e.lat, e.lng) : null;
    return { ...e, distanceKm };
  }).sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  const mapList = eventsForView.map((e, idx) => `
    <button class="map-list-item" onclick="openEventMap('${e.id}')">
      <span>${idx + 1}. ${e.title}</span>
      <span>↗</span>
    </button>`).join('');

  const evHtml = eventsForView.map(e => {
    const joined = state.joinedEvents.has(e.id);
    const searchUrl = buildGoogleMapsSearchUrl(e.mapQuery);
    const dirUrl = buildGoogleMapsDirectionsUrl(e.lat, e.lng);
    return `<div class="event-card">
      <div class="ev-date"><div class="ev-day">${e.day}</div><div class="ev-mon">${e.mon}</div></div>
      <div class="ev-info">
        <div class="ev-title">${e.title}</div>
        <div class="ev-loc">📍 ${e.loc}</div>
        ${typeof e.distanceKm === 'number' ? `<div class="ev-dist">🚶 ${(e.distanceKm).toFixed(1)} km from your location</div>` : ''}
        <div class="ev-cnt">${e.cnt}</div>
        <div class="ev-actions">
          <a class="ev-link" href="${searchUrl}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          <a class="ev-link" href="${dirUrl}" target="_blank" rel="noopener noreferrer">Directions</a>
        </div>
        <div class="ev-btn ${joined ? 'joined' : ''}" id="btn-${e.id}" onclick="${joined ? '' : `joinEvent('${e.id}', ${e.pts})`}">
          ${joined ? '✔ Registered' : `Join event → (+${e.pts} pts)`}
        </div>
      </div>
    </div>`;
  }).join('');

  const feedStories = [...state.customStories, ...communityStories]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const filteredStories = feedStories.filter(s => {
    const blocked = state.blockedAuthors.has(getStoryAuthorKey(s));
    if (blocked && !isOwnStory(s)) return false;
    if (state.communityFeedFilter === 'saved') return state.savedStories.has(s.id);
    if (state.communityFeedFilter === 'mine') return isOwnStory(s);
    return true;
  });
  const storiesHtml = filteredStories.map(s => {
    const liked = state.likedStories.has(s.id);
    const shared = state.sharedStories.has(s.id);
    const saved = state.savedStories.has(s.id);
    const own = isOwnStory(s);
    const lcount = liked ? s.likes + 1 : s.likes;
    const scount = shared ? s.shares + 1 : s.shares;
    const comments = getStoryComments(s.id);
    const authorKey = getStoryAuthorKey(s);
    const followed = state.followedAuthors.has(authorKey);
    const followers = (s.followerBase || 0) + (followed ? 1 : 0);
    const commentsHtml = comments.map(c => {
      const repliesHtml = c.replies.map(r => `
        <div class="reply-item">
          <div class="comment-avatar">${escapeHtml(r.initials || 'U')}</div>
          <div class="comment-body">
            <div class="comment-line"><strong>${escapeHtml(r.author || 'User')}</strong> ${escapeHtml(r.text || '')}</div>
            <div class="comment-time">${escapeHtml(r.timeLabel || 'now')}</div>
          </div>
        </div>`).join('');
      return `
      <div class="comment-item">
        <div class="comment-avatar">${escapeHtml(c.initials || 'U')}</div>
        <div class="comment-body">
          <div class="comment-line"><strong>${escapeHtml(c.author || 'User')}</strong> ${escapeHtml(c.text || '')}</div>
          <div class="comment-time">${escapeHtml(c.timeLabel || 'now')}</div>
          <div class="comment-actions-row">
            <button class="comment-reply-btn" onclick="toggleReplyBox('${s.id}','${c.id}')">Reply</button>
          </div>
          ${repliesHtml ? `<div class="reply-list">${repliesHtml}</div>` : ''}
          <div class="reply-input-row hidden" id="reply-box-${s.id}-${c.id}">
            <input id="reply-input-${s.id}-${c.id}" type="text" placeholder="Write a reply..." onkeydown="if(event.key==='Enter')submitReply('${s.id}','${c.id}')" />
            <button onclick="submitReply('${s.id}','${c.id}')">Reply</button>
          </div>
        </div>
      </div>`;
    }).join('') || `<div class="comment-empty">No comments yet. Start the conversation.</div>`;
    return `<div class="story-card">
      <div class="story-hdr">
        <div class="story-avatar" style="background:${s.color};color:${s.tcolor}">${s.init}</div>
        <div>
          <div class="story-name">${s.name}${own ? ' <span class="story-owner-badge">You</span>' : ''}</div>
          <div class="story-loc">📍 ${s.loc} · ${s.time}</div>
          <div class="story-followers">${followers.toLocaleString()} followers</div>
        </div>
        ${own ? `<button class="story-menu-btn" onclick="openStoryMenu('${s.id}')">•••</button>` : `<div class="story-head-actions"><button class="story-follow-btn ${followed ? 'active' : ''}" onclick="toggleFollowAuthor('${escapeHtml(authorKey)}')">${followed ? 'Following' : 'Follow'}</button><button class="story-flag-btn" onclick="openSafetyMenu('${s.id}')">⚑</button></div>`}
      </div>
      <div class="story-tag">${s.tag}</div>
      <div class="story-text">${s.text}</div>
      <div class="story-actions">
        <div class="story-act ${liked ? 'liked' : ''}" id="like-${s.id}" onclick="toggleLike('${s.id}', ${s.likes})">
          ${liked ? '❤️' : '🤍'} <span id="story-like-count-${s.id}">${lcount}</span>
        </div>
        <div class="story-act" onclick="toggleComments('${s.id}')">💬 <span id="story-comment-count-${s.id}">${comments.length}</span></div>
        <div class="story-act ${shared ? 'shared' : ''}" id="share-${s.id}" onclick="shareStory('${s.id}')">↗ <span id="story-share-count-${s.id}">${scount}</span></div>
        <div class="story-act ${saved ? 'saved' : ''}" id="save-${s.id}" onclick="toggleSaveStory('${s.id}')">${saved ? '🔖 Saved' : '🔖 Save'}</div>
      </div>
      <div class="comment-wrap hidden" id="comments-${s.id}">
        <div class="comment-list">${commentsHtml}</div>
        <div class="comment-input-row">
          <input id="comment-input-${s.id}" type="text" placeholder="Write a comment..." onkeydown="if(event.key==='Enter')submitComment('${s.id}')" />
          <button onclick="submitComment('${s.id}')">Post</button>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="tip-card">No posts in this feed yet. Try switching filter or creating a new story.</div>`;
  return `
  <div class="community-page">
    <div class="page-header">
      <div class="community-hdr-row">
        <div class="page-title">Community Hub</div>
        <button class="notif-btn" onclick="openNotifications()">
          🔔
          ${unreadCount > 0 ? `<span class="notif-badge">${unreadCount}</span>` : ''}
        </button>
      </div>
      <div class="page-sub">Local events, cleanup drives & sustainability stories</div>
    </div>
    <div class="loc-banner">
      <div class="loc-pin">📍</div>
      <div>
        <div class="loc-name">Kathmandu, Bagmati Province</div>
        <div class="loc-sub">4 events this month · 8 volunteers active near you</div>
      </div>
    </div>
    <div class="community-map-card">
      <div class="community-map-hdr">
        <div class="sec-title">Community map</div>
        <div class="community-map-sub">${userLoc ? 'Showing your location and nearest events first' : 'Enable location to sort nearest events'}</div>
      </div>
      <div class="map-actions">
        <button class="map-cta" onclick="requestCommunityLocation()">${communityMapState.locating ? 'Locating...' : (userLoc ? 'Refresh my location' : 'Use my location')}</button>
      </div>
      <div id="community-live-map" class="community-map-live">
        <div class="map-fallback">Loading interactive map...</div>
      </div>
      <div class="map-list">${mapList}</div>
    </div>
    <div class="sec-hdr"><div class="sec-title">Upcoming events</div></div>
    ${evHtml}
    <div id="community-stories-section" class="sec-hdr" style="margin-top:0.5rem"><div class="sec-title">Community stories</div></div>
    <div class="feed-filter-row">
      <button class="feed-filter-btn ${state.communityFeedFilter === 'all' ? 'active' : ''}" onclick="setCommunityFeedFilter('all')">All</button>
      <button class="feed-filter-btn ${state.communityFeedFilter === 'saved' ? 'active' : ''}" onclick="setCommunityFeedFilter('saved')">Saved</button>
      <button class="feed-filter-btn ${state.communityFeedFilter === 'mine' ? 'active' : ''}" onclick="setCommunityFeedFilter('mine')">My posts</button>
    </div>
    ${storiesHtml}
    <div class="add-story" onclick="showAddStory()">
      <div class="add-story-txt">✍️ Share your eco story</div>
      <div class="add-story-sub">Inspire others in Nepal to take action</div>
    </div>
  </div>`;
}

function goToCommunityStories() {
  pendingCommunityScrollTarget = 'community-stories-section';
  navigate('community');
}

function joinEvent(id, pts) {
  state.joinedEvents.add(id);
  state.challengeProgress.bagmati = Math.min(state.challengeProgress.bagmati + 1, 3);
  addPoints(pts);
  saveState();
  const btn = document.getElementById('btn-' + id);
  if (btn) { btn.textContent = '✔ Registered'; btn.classList.add('joined'); btn.onclick = null; }
}
function toggleLike(id, baseLikes) {
  const el = document.getElementById('like-' + id);
  const likeCount = document.getElementById('story-like-count-' + id);
  const story = [...state.customStories, ...communityStories].find(s => s.id === id);
  if (!el) return;
  if (state.likedStories.has(id)) {
    state.likedStories.delete(id);
    el.innerHTML = `🤍 <span id="story-like-count-${id}">${baseLikes}</span>`;
    el.classList.remove('liked');
    if (likeCount) likeCount.textContent = `${baseLikes}`;
    addPoints(-2);
  } else {
    state.likedStories.add(id);
    el.innerHTML = `❤️ <span id="story-like-count-${id}">${baseLikes + 1}</span>`;
    el.classList.add('liked');
    if (likeCount) likeCount.textContent = `${baseLikes + 1}`;
    addPoints(2);
    if (story?.ownerKey && story.ownerKey !== getCurrentUserKey()) {
      addNotification({ type: 'like', text: `${state.user?.name || 'Someone'} liked your post`, storyId: id, userKey: story.ownerKey });
    }
  }
  saveState();
}

function toggleSaveStory(storyId) {
  if (state.savedStories.has(storyId)) {
    state.savedStories.delete(storyId);
    showToast('Post removed from saved.');
  } else {
    state.savedStories.add(storyId);
    showToast('Post saved.');
  }
  saveState();
  const el = document.getElementById(`save-${storyId}`);
  if (el) {
    const saved = state.savedStories.has(storyId);
    el.textContent = saved ? '🔖 Saved' : '🔖 Save';
    el.classList.toggle('saved', saved);
  }
}

function toggleFollowAuthor(authorKey) {
  if (!authorKey) return;
  if (state.followedAuthors.has(authorKey)) {
    state.followedAuthors.delete(authorKey);
    showToast('Unfollowed');
  } else {
    state.followedAuthors.add(authorKey);
    showToast('Following');
  }
  saveState();
  refreshCommunityView();
}

async function openNotifications() {
  await syncNotificationsFromServer();
  const items = state.notifications;
  const html = items.length
    ? items.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="focusStoryFromNotif('${n.storyId || ''}')">
        <div class="notif-dot">${n.type === 'comment' ? '💬' : n.type === 'like' ? '❤️' : n.type === 'safety' ? '🛡️' : '🔔'}</div>
        <div class="notif-body">
          <div class="notif-text">${escapeHtml(n.text || 'Activity update')}</div>
          <div class="notif-time">${formatRelativeTime(n.createdAt)}</div>
        </div>
      </div>`).join('')
    : `<div class="comment-empty">No notifications yet.</div>`;
  showModal(`
    <div style="padding:1.25rem 1.25rem 1rem">
      <div style="font-size:17px;font-weight:700;margin-bottom:10px">Notifications</div>
      <div class="notif-list">${html}</div>
    </div>`);
  state.notifications = state.notifications.map(n => ({ ...n, read: true }));
  saveState();
  markNotificationsReadOnServer();
  refreshCommunityView();
}

function focusStoryFromNotif(storyId) {
  closeModal();
  if (!storyId) return;
  state.communityFeedFilter = 'all';
  saveState();
  refreshCommunityView({ keepScroll: false, scrollTop: 0 });
  const el = document.getElementById(`like-${storyId}`) || document.getElementById(`comments-${storyId}`);
  if (el && typeof el.scrollIntoView === 'function') {
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  }
}

function openSafetyMenu(storyId) {
  const story = [...state.customStories, ...communityStories].find(s => s.id === storyId);
  if (!story || isOwnStory(story)) return;
  const authorKey = getStoryAuthorKey(story);
  const blocked = state.blockedAuthors.has(authorKey);
  showModal(`
    <div style="padding:1.25rem 1.25rem 1rem">
      <div style="font-size:16px;font-weight:700;color:var(--txt);margin-bottom:10px">Safety options</div>
      <div class="story-manage-actions">
        <button class="story-manage-btn" onclick="reportStory('${story.id}','Spam or misleading')">🚩 Report post</button>
        <button class="story-manage-btn ${blocked ? '' : 'danger'}" onclick="toggleBlockAuthor('${escapeHtml(authorKey)}')">${blocked ? '✅ Unblock author' : '⛔ Block author'}</button>
      </div>
    </div>`);
}

async function reportStory(storyId, reason = 'Reported by user') {
  const story = [...state.customStories, ...communityStories].find(s => s.id === storyId);
  try {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterKey: getCurrentUserKey(),
        storyId,
        authorKey: story ? getStoryAuthorKey(story) : '',
        reason,
        details: '',
      }),
    });
  } catch (_) {}
  addNotification({ type: 'safety', text: `Report submitted: ${reason}`, storyId });
  closeModal();
  showToast('Thanks. Our team will review this post.');
}

function toggleBlockAuthor(authorKey) {
  if (!authorKey) return;
  if (state.blockedAuthors.has(authorKey)) {
    state.blockedAuthors.delete(authorKey);
    showToast('Author unblocked');
  } else {
    state.blockedAuthors.add(authorKey);
    showToast('Author blocked. Their posts are hidden.');
  }
  saveState();
  closeModal();
  refreshCommunityView({ keepScroll: false, scrollTop: 0 });
}

function openStoryMenu(storyId) {
  const story = state.customStories.find(s => s.id === storyId && isOwnStory(s));
  if (!story) return;
  showModal(`
    <div style="padding:1.25rem 1.25rem 1rem">
      <div style="font-size:16px;font-weight:700;color:var(--txt);margin-bottom:10px">Manage your post</div>
      <div class="story-manage-actions">
        <button class="story-manage-btn" onclick="openEditStory('${story.id}')">✏️ Edit post</button>
        <button class="story-manage-btn danger" onclick="deleteStory('${story.id}')">🗑️ Delete post</button>
      </div>
    </div>`);
}

function openEditStory(storyId) {
  const story = state.customStories.find(s => s.id === storyId && isOwnStory(s));
  if (!story) return;
  showModal(`
    <div style="padding:1.5rem">
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--g);margin-bottom:1rem">Edit your story</div>
      <textarea id="edit-story-ta" style="width:100%;height:140px;border:1px solid var(--border);border-radius:var(--r2);padding:12px;font-family:var(--font);font-size:13px;resize:none;background:var(--bg);color:var(--txt)"></textarea>
      <button onclick="saveEditedStory('${story.id}')" style="width:100%;background:var(--g);color:#fff;font-size:14px;font-weight:700;padding:13px;border-radius:50px;margin-top:12px">Save changes</button>
    </div>`);
  const ta = document.getElementById('edit-story-ta');
  if (ta) ta.value = story.text || '';
}

function saveEditedStory(storyId) {
  const input = document.getElementById('edit-story-ta');
  const text = input?.value.trim();
  if (!text) {
    showToast('Post cannot be empty.');
    return;
  }
  const story = state.customStories.find(s => s.id === storyId && isOwnStory(s));
  if (!story) return;
  story.text = text;
  story.edited = true;
  story.time = 'edited';
  saveState();
  closeModal();
  refreshCommunityView();
  showToast('Post updated.');
}

function deleteStory(storyId) {
  const idx = state.customStories.findIndex(s => s.id === storyId && isOwnStory(s));
  if (idx < 0) return;
  state.customStories.splice(idx, 1);
  state.savedStories.delete(storyId);
  state.sharedStories.delete(storyId);
  state.likedStories.delete(storyId);
  delete state.commentsByStory[storyId];
  saveState();
  closeModal();
  refreshCommunityView();
  showToast('Post deleted.');
}

function toggleComments(id) {
  const wrap = document.getElementById(`comments-${id}`);
  if (!wrap) return;
  wrap.classList.toggle('hidden');
  if (!wrap.classList.contains('hidden')) {
    const input = document.getElementById(`comment-input-${id}`);
    if (input) input.focus();
  }
}

function toggleReplyBox(storyId, commentId) {
  const row = document.getElementById(`reply-box-${storyId}-${commentId}`);
  if (!row) return;
  row.classList.toggle('hidden');
  if (!row.classList.contains('hidden')) {
    const input = document.getElementById(`reply-input-${storyId}-${commentId}`);
    if (input) input.focus();
  }
}

function submitReply(storyId, commentId) {
  const input = document.getElementById(`reply-input-${storyId}-${commentId}`);
  const text = input?.value.trim();
  if (!text) return;
  const author = state.user?.name || 'Guest User';
  const comments = getStoryComments(storyId);
  const target = comments.find(c => c.id === commentId);
  if (!target) return;
  target.replies.push({
    id: `r-${Date.now()}`,
    author,
    initials: getInitials(author),
    text,
    timeLabel: 'just now',
  });
  state.commentsByStory[storyId] = comments;
  saveState();
  const content = $('page-content');
  const scrollPos = content ? content.scrollTop : 0;
  refreshCommunityView({ keepScroll: true, scrollTop: scrollPos });
  const wrap = document.getElementById(`comments-${storyId}`);
  if (wrap) wrap.classList.remove('hidden');
  showToast('Reply posted');
}

function submitComment(storyId) {
  const input = document.getElementById(`comment-input-${storyId}`);
  const text = input?.value.trim();
  if (!text) return;
  const author = state.user?.name || 'Guest User';
  const comment = {
    author,
    initials: getInitials(author),
    text,
    timeLabel: 'just now',
  };
  const existing = getStoryComments(storyId);
  state.commentsByStory[storyId] = [...existing, { ...comment, id: `c-${Date.now()}`, replies: [] }].slice(-40);
  const story = [...state.customStories, ...communityStories].find(s => s.id === storyId);
  if (story?.ownerKey && story.ownerKey !== getCurrentUserKey()) {
    addNotification({ type: 'comment', text: `${author} commented on your post`, storyId, userKey: story.ownerKey });
  }
  saveState();
  const content = $('page-content');
  const scrollPos = content ? content.scrollTop : 0;
  refreshCommunityView({ keepScroll: true, scrollTop: scrollPos });
  const wrap = document.getElementById(`comments-${storyId}`);
  if (wrap) wrap.classList.remove('hidden');
  const commentCount = document.getElementById(`story-comment-count-${storyId}`);
  if (commentCount) commentCount.textContent = `${state.commentsByStory[storyId].length}`;
  showToast('💬 Comment posted');
}
async function shareStory(storyId) {
  if (state.sharedStories.has(storyId)) {
    showToast('Already shared from your account.');
    return;
  }
  const story = [...state.customStories, ...communityStories].find(s => s.id === storyId);
  if (!story) return;
  const shareText = `${story.name}: ${story.text}`;
  try {
    if (navigator.share) {
      await navigator.share({
        title: 'EcoScan Community Story',
        text: shareText,
        url: window.location.href,
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    }
    state.sharedStories.add(storyId);
    saveState();
    const el = document.getElementById(`share-${storyId}`);
    const shareCount = document.getElementById(`story-share-count-${storyId}`);
    const storyShares = story.shares + 1;
    if (el) {
      el.innerHTML = `✅ <span id="story-share-count-${storyId}">${storyShares}</span>`;
      el.classList.add('shared');
    }
    if (shareCount) shareCount.textContent = `${storyShares}`;
    showToast('📤 Shared successfully');
  } catch (_) {
    showToast('Share canceled');
  }
}
function showAddStory() {
  showModal(`
    <div style="padding:1.5rem">
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--g);margin-bottom:1rem">Share your story</div>
      <textarea id="story-ta" placeholder="Tell the community about your eco journey in Nepal..." style="width:100%;height:120px;border:1px solid var(--border);border-radius:var(--r2);padding:12px;font-family:var(--font);font-size:13px;resize:none;background:var(--bg);color:var(--txt)"></textarea>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="story-loc" type="text" placeholder="Location (e.g. Lalitpur)" style="flex:1;border:1px solid var(--border);border-radius:999px;padding:9px 12px;font-size:12px;background:var(--bg);color:var(--txt)" />
        <input id="story-tag" type="text" placeholder="Tag (e.g. Cleanup)" style="flex:1;border:1px solid var(--border);border-radius:999px;padding:9px 12px;font-size:12px;background:var(--bg);color:var(--txt)" />
      </div>
      <button onclick="submitStory()" style="width:100%;background:var(--g);color:#fff;font-size:14px;font-weight:700;padding:13px;border-radius:50px;margin-top:12px">Post Story (+20 pts)</button>
    </div>`);
}
function submitStory() {
  const val = document.getElementById('story-ta')?.value.trim();
  if (!val) { showToast('Please write your story first!'); return; }
  const loc = document.getElementById('story-loc')?.value.trim() || 'Kathmandu';
  const tag = document.getElementById('story-tag')?.value.trim() || 'Community Post';
  const userName = state.user?.name || 'Guest User';
  const userInit = getInitials(userName);
  const ownerKey = getCurrentUserKey();
  state.customStories.unshift({
    id: `u${Date.now()}`,
    init: userInit,
    name: userName,
    loc,
    color: '#e8f7ef',
    tcolor: '#1a7a4a',
    text: val,
    likes: 0,
    shares: 0,
    time: 'now',
    tag,
    ownerKey,
    authorKey: `author:${ownerKey}`,
    followerBase: 0,
    createdAt: Date.now(),
  });
  closeModal();
  addPoints(20);
  saveState();
  refreshCommunityView({ keepScroll: false, scrollTop: 0 });
  showToast('🌿 Your story has been shared with the community!');
}

// ===== RANK PAGE =====
let currentLBTab = 'nepal';
function renderRank() {
  return `
  <div class="rank-page">
    <div class="page-header">
      <div class="page-title">Eco Leaderboard</div>
      <div class="page-sub">Top plastic reducers in Nepal</div>
    </div>
    <div class="rank-hero">
      <div class="rank-medal">🏅</div>
      <div class="rank-info">
        <div class="rank-pos">#23 in Nepal</div>
        <div class="rank-sub">Top 5% this month!</div>
        <div class="rank-pts">🌿 ${state.points.toLocaleString()} Eco Points</div>
      </div>
    </div>
    <div class="tab-row">
      <div class="tab-btn ${currentLBTab==='nepal'?'active':''}" onclick="switchLBTab('nepal')">🇳🇵 Nepal</div>
      <div class="tab-btn ${currentLBTab==='ktm'?'active':''}" onclick="switchLBTab('ktm')">🏙️ Kathmandu</div>
      <div class="tab-btn ${currentLBTab==='global'?'active':''}" onclick="switchLBTab('global')">🌍 Global</div>
    </div>
    ${renderLBTable(currentLBTab)}
    <div class="sec-hdr" style="margin-top:1.5rem"><div class="sec-title">Ways to earn more points</div></div>
    <div class="earn-card"><div class="earn-em">📷</div><div class="earn-info"><div class="earn-title">Scan a plastic item</div><div class="earn-pts">+15 pts per scan</div></div><div class="earn-arrow">›</div></div>
    <div class="earn-card"><div class="earn-em">🤝</div><div class="earn-info"><div class="earn-title">Join a cleanup event</div><div class="earn-pts">+100–300 pts per event</div></div><div class="earn-arrow">›</div></div>
    <div class="earn-card"><div class="earn-em">💬</div><div class="earn-info"><div class="earn-title">Ask EcoAI a question</div><div class="earn-pts">+5 pts per question</div></div><div class="earn-arrow">›</div></div>
    <div class="earn-card"><div class="earn-em">✍️</div><div class="earn-info"><div class="earn-title">Share a story</div><div class="earn-pts">+20 pts per post</div></div><div class="earn-arrow">›</div></div>
    <div class="earn-card"><div class="earn-em">🚫</div><div class="earn-info">
      <div class="earn-title">Complete Plastic-Free Week</div>
      <div class="earn-pts">+200 pts bonus · ${state.challengeProgress.plasticFree}/7 days done</div>
      <div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${Math.round(state.challengeProgress.plasticFree/7*100)}%"></div></div>
    </div></div>
    <div class="earn-card"><div class="earn-em">♻️</div><div class="earn-info">
      <div class="earn-title">Bagmati River Guardian</div>
      <div class="earn-pts">+500 pts bonus · ${state.challengeProgress.bagmati}/3 events attended</div>
      <div class="progress-bar" style="margin-top:6px"><div class="progress-fill" style="width:${Math.round(state.challengeProgress.bagmati/3*100)}%"></div></div>
    </div></div>
    <div style="margin-top:1.5rem;background:var(--gl);border-radius:var(--r);padding:1.25rem;text-align:center">
      <div style="font-size:14px;font-weight:600;color:var(--gd);margin-bottom:6px">🎁 Redeem Eco Points</div>
      <div style="font-size:12px;color:var(--txt2);line-height:1.5">Points are redeemable for discounts at partner eco-brands and local sustainable markets in Nepal. <span style="color:var(--g);font-weight:600;cursor:pointer" onclick="showToast('Marketplace coming soon — partner onboarding in progress!')">View marketplace →</span></div>
    </div>
  </div>`;
}
function renderLBTable(tab) {
  const rows = leaderboard[tab] || [];
  const medals = ['🥇','🥈','🥉'];
  const rowsHtml = rows.map((r, i) => `
    <div class="lb-row">
      <div class="lb-rank ${i<3?'top3':''}">${medals[i] || i+1}</div>
      <div class="lb-avatar" style="background:${r.color};color:${r.tcolor}">${r.init}</div>
      <div class="lb-name">${r.name}</div>
      <div class="lb-pts">${r.pts.toLocaleString()} pts</div>
    </div>`).join('');
  const meRow = `
    <div class="lb-row me">
      <div class="lb-rank top3">23</div>
      <div class="lb-avatar" style="background:var(--g);color:#fff">${state.user?.initials || 'ME'}</div>
      <div class="lb-name" style="font-weight:700">${state.user?.name || 'You'}</div>
      <div class="lb-pts">${state.points.toLocaleString()} pts</div>
    </div>`;
  return `<div class="lb-table">${rowsHtml}${meRow}</div>`;
}
function switchLBTab(tab) {
  currentLBTab = tab;
  document.querySelectorAll('.tab-btn').forEach((el, i) => {
    const tabs = ['nepal','ktm','global'];
    el.classList.toggle('active', tabs[i] === tab);
  });
  const table = document.querySelector('.lb-table');
  if (table) table.outerHTML = renderLBTable(tab);
}

// ===== PROFILE =====
function showProfile() {
  showModal(`
    <div class="profile-modal">
      <div class="modal-drag" style="margin-bottom:1.5rem"></div>
      <div class="profile-hdr">
        <div class="profile-avatar">${state.user?.initials || 'G'}</div>
        <div class="profile-name">${state.user?.name || 'Guest User'}</div>
        <div class="profile-email">${state.user?.email || ''}</div>
      </div>
      <div class="profile-stats">
        <div class="p-stat"><div class="p-stat-n">${state.points.toLocaleString()}</div><div class="p-stat-l">Eco Points</div></div>
        <div class="p-stat"><div class="p-stat-n">${state.scansCount}</div><div class="p-stat-l">Scans</div></div>
        <div class="p-stat"><div class="p-stat-n">${state.plasticAvoided}kg</div><div class="p-stat-l">Avoided</div></div>
      </div>
      <div class="profile-menu">
        <div class="pm-item" onclick="closeModal();showToast('Settings coming soon!')"><div class="pm-em">⚙️</div>Settings</div>
        <div class="pm-item" onclick="closeModal();showToast('Notifications on!')"><div class="pm-em">🔔</div>Notifications</div>
        <div class="pm-item" onclick="closeModal();navigate('rank')"><div class="pm-em">🏆</div>My achievements</div>
        <div class="pm-item" onclick="closeModal();showToast('Privacy policy opened.')"><div class="pm-em">🔒</div>Privacy policy</div>
        <div class="pm-item danger" onclick="signOut()"><div class="pm-em">🚪</div>Sign out</div>
      </div>
    </div>`);
}
function signOut() {
  closeModal();
  stopCamera();
  state.user = null;
  try { localStorage.removeItem('ecoscan_user'); } catch (_) {}
  $('main-app').classList.add('hidden');
  $('auth-screen').classList.add('active');
}

// ===== PWA MANIFEST =====
window.addEventListener('load', async () => {
  if (!('serviceWorker' in navigator)) return;

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalhost) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (_) {}
    return;
  }

  navigator.serviceWorker.register('sw.js').catch(() => {});
});
window.addEventListener('beforeunload', stopCamera);

// ===== INIT =====
(function init() {
  // Check for returning user
  const saved = localStorage.getItem('ecoscan_user');
  if (saved) {
    try {
      state.user = JSON.parse(saved);
      bootApp();
      return;
    } catch(e) {}
  }
  // Otherwise show auth
  $('auth-screen').classList.add('active');
})();
