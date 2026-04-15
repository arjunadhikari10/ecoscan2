# 🌿 EcoScan — AI-Powered Plastic Pollution Tracker for Nepal

EcoScan is a Progressive Web App (PWA) that helps communities in Nepal identify, track, and reduce plastic waste through AI-powered scanning, education, community events, and gamified eco challenges.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **AI Plastic Scanner** | Identify plastic types instantly via camera or search. Get recycling info, decomposition time, and local drop-off points. |
| 🌿 **Eco-Friendly Alternatives** | Localized suggestions including Dhaka bags, steel tiffin, clay vessels, and bamboo products. |
| 🤖 **EcoAI Chat** | Powered by Claude AI — ask anything about recycling, the Bagmati River, microplastics, or sustainable living in Nepal. |
| 🏆 **Eco Leaderboard** | Nepal / Kathmandu / Global rankings. Earn points for every green action. |
| 🎯 **Challenges & Badges** | Plastic-Free Week, Bagmati River Guardian, and more — with real Eco Points rewards. |
| 🗺️ **Community Events** | Cleanup drives, workshops, and eco markets around Kathmandu with in-app registration. |
| ♻️ **Eco Points Marketplace** | Redeem points for discounts at partner eco-brands and local markets. |
| 📱 **PWA / Offline Support** | Installable on Android & iOS. Works offline via service worker caching. |

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+ (download from nodejs.org)
- An Anthropic API key (for EcoAI chat): [console.anthropic.com](https://console.anthropic.com)

### Steps

```bash
# 1. Install dependencies
cd ecoscan
npm install

# 2. Start the server
npm start

# 3. Open in browser
# Go to: http://localhost:3000
```

The app works immediately — the EcoAI chat requires your Anthropic API key (see below).

---

## 🔑 API Key Setup

The EcoAI chat uses the Anthropic Claude API. To enable it:

1. Get your API key from [console.anthropic.com](https://console.anthropic.com)
2. Open `public/app.js`
3. Find the `sendAIMessage()` function
4. The API key is passed via the request headers — **for production, proxy all API calls through your backend server to keep the key secret**

### Secure production setup (recommended)

Add to your backend `server.js`:

```javascript
// Proxy endpoint — keeps API key server-side
app.post('/api/ai/chat', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
});
```

Then set the environment variable:
```bash
export ANTHROPIC_API_KEY=your_key_here
npm start
```

---

## ☁️ Deployment Options

### Option 1: Vercel (Recommended — Free)
```bash
npm install -g vercel
vercel --prod
```

### Option 2: Netlify (Free)
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=public
```

### Option 3: Render.com (Free tier, Node.js)
1. Create account at render.com
2. New → Web Service → Connect your GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable: `ANTHROPIC_API_KEY`

### Option 4: Railway (Free tier)
```bash
npm install -g @railway/cli
railway up
```

### Option 5: Docker
```bash
docker build -t ecoscan .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=your_key ecoscan
```

---

## 📱 Install as Mobile App (PWA)

### Android (Chrome)
1. Open app URL in Chrome
2. Tap the "Install" prompt or Menu → "Add to Home Screen"

### iOS (Safari)
1. Open app URL in Safari
2. Tap Share button → "Add to Home Screen"

---

## 🏗️ Project Structure

```
ecoscan/
├── public/
│   ├── index.html      # Main HTML shell
│   ├── styles.css      # All CSS (mobile-first)
│   ├── app.js          # Full app logic + AI integration
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service worker (offline)
├── server.js           # Express backend + REST API
├── package.json
├── Dockerfile
└── README.md
```

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/plastics` | All plastic types with recycling info |
| GET | `/api/plastic/:type` | Single plastic type (PET, HDPE, PS, PVC, BAG) |
| GET | `/api/events` | Upcoming community events |
| POST | `/api/events/:id/join` | Register for an event |
| GET | `/api/stats/nepal` | Nepal plastic pollution statistics |

---

## 🌱 Business Model

1. **Freemium** — Free core features; premium subscription for advanced analytics
2. **CSR Partnerships** — Partner with eco-friendly brands in Nepal for in-app promotion
3. **Eco Points Marketplace** — Commission on redemptions at partner brands
4. **Data for Good** — Anonymized waste data sold to NGOs, municipalities, and research groups
5. **Impact Grants** — UNDP Nepal, WWF Nepal, and government sustainability programs

---

## 🤝 Partners & Integrations

- **Anthropic Claude** — EcoAI chat assistant
- **Google Sign-In** — User authentication
- **Open Food Facts** — Barcode → product database (future)
- **Google Maps Platform** — Geolocated events and drop-off points (future)
- **Nepal Solid Waste Management** — Official recycling point data (future)

---

## 📊 Impact Metrics to Track

- Total plastic items scanned
- Kg of plastic avoided (estimated)
- Community event participation
- Behavior change surveys (before/after)
- Social shares and referrals
- Repeat users / 30-day retention

---

## 🛣️ Roadmap

- [ ] Real camera + AI image recognition (TensorFlow.js or Google Vision API)
- [ ] Barcode scanning (ZXing.js library)
- [ ] Google Maps for recycling drop-off points
- [ ] Push notifications for nearby cleanup events
- [ ] Multi-language support (Nepali / Devanagari)
- [ ] Corporate CSR dashboard
- [ ] Integration with Kathmandu municipality waste data

---

## 📜 License

MIT License — Free to use, modify, and distribute.

---

Built with 💚 for Nepal's rivers and communities.
