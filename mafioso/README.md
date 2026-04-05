# 🎭 مافيوسو — Mafioso

> لعبة استنتاج اجتماعي وتحقيق درامي تفاعلية — Real-time multiplayer deduction game

**Created by Naseem Q.**

---

## 📸 Screenshots

The game features a **card-based UI** with crimson + beige + gold + black theme, the Mafioso character as card backs, and dramatic animations.

---

## 🏗️ Project Structure

```
mafioso/
├── client/           ← React (Vite) — Frontend
│   ├── public/       ← Static assets (logo.png)
│   ├── src/
│   │   ├── App.jsx          ← Main app (all screens)
│   │   ├── main.jsx         ← Entry point
│   │   ├── hooks/           ← useSocket hook
│   │   ├── services/        ← Socket.IO + SFX
│   │   └── styles/          ← Global CSS (card system)
│   ├── .env.example
│   └── package.json
├── server/           ← Node.js + Express + Socket.IO — Backend
│   ├── src/
│   │   ├── game/            ← GameEngine (authoritative logic)
│   │   ├── rooms/           ← RoomManager
│   │   ├── sockets/         ← Socket event handlers
│   │   └── utils/           ← Helpers
│   ├── index.js             ← Server entry
│   ├── .env.example
│   └── package.json
├── shared/           ← Shared constants (events, roles, phases)
│   └── constants.js
├── render.yaml       ← Render deployment config
├── package.json      ← Root (concurrent dev scripts)
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** v18+
- **npm** v9+

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/mafioso.git
cd mafioso

# Install root + all dependencies
npm install
npm run install:all
```

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

### 3. Run Development

```bash
# Run both server + client simultaneously
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:4000

### Or run separately:

```bash
# Terminal 1 — Server
cd server && npm run dev

# Terminal 2 — Client
cd client && npm run dev
```

---

## 🌐 Deployment

### Backend → Render.com

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Runtime**: Node
4. Environment Variables:
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = `https://your-app.vercel.app` (add after deploying client)
   - `PORT` = `4000`
5. Deploy!

Your server URL will be something like: `https://mafioso-server.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - `VITE_SERVER_URL` = `https://mafioso-server.onrender.com` (your Render URL)
5. Deploy!

### After Both Are Deployed:
- Go back to **Render** → Environment Variables
- Update `CLIENT_URL` to your Vercel URL (e.g., `https://mafioso.vercel.app`)
- Redeploy the server

---

## 🎮 How to Play

1. **GM** creates a room → gets a 4-digit code
2. **Players** join with the code from their phones
3. **GM** assigns roles (2 Mafia + Innocents)
4. Each player sees their secret role (Hold to Reveal)
5. **Investigation**: GM sends evidence clues gradually
6. **Voting**: Players vote to eliminate suspects
7. **Ghost Mode**: Eliminated players watch silently
8. **Final Verdict**: Ghosts vote on who's the real killer

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, CSS (no framework) |
| Backend | Node.js, Express, Socket.IO |
| Real-time | Socket.IO (WebSocket + polling fallback) |
| Architecture | Authoritative Server, Event-driven |
| Hosting | Vercel (client) + Render (server) |

---

## 📋 Socket Events

All events are defined in `shared/constants.js`. Key events:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-room` | Client → Server | GM creates room |
| `join-room` | Client → Server | Player joins |
| `assign-roles` | GM → Server → All | Distribute roles |
| `role-reveal` | Server → Player | Private role info |
| `send-evidence` | GM → Server → All | Send a clue |
| `cast-vote` | Player → Server | Submit vote |
| `eliminate-player` | GM → Server → All | Remove player |
| `reveal-truth` | GM → Server → All | End game |

---

## 📝 License

MIT — Built with ❤️ by **Naseem Q.**
