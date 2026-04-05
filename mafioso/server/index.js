require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { registerHandlers } = require('./src/sockets/socketHandler');
const roomManager = require('./src/rooms/RoomManager');
const scenarios = require('../shared/scenarioLoader');

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? CLIENT_URL : '*' }));

app.get('/', (_, res) => res.json({ status: 'ok', name: 'Mafioso Server', ...roomManager.getStats() }));
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Scenarios API — returns list of available scenarios (without secrets/revealStory for players)
app.get('/api/scenarios', (_, res) => {
  const list = scenarios.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    difficulty: s.difficulty,
    minPlayers: s.minPlayers,
    maxPlayers: s.maxPlayers,
    setting: s.setting,
    playerCount: s.players?.length || 0,
  }));
  res.json(list);
});

// Full scenario (GM only — includes everything)
app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarios.find(s => s.id === req.params.id);
  if (!scenario) return res.status(404).json({ error: 'السيناريو غير موجود' });
  res.json(scenario);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.NODE_ENV === 'production' ? CLIENT_URL : ['http://localhost:5173','http://localhost:3000'], methods: ['GET','POST'], credentials: true },
  pingTimeout: 30000, pingInterval: 10000,
});

io.on('connection', (socket) => registerHandlers(io, socket));
setInterval(() => { roomManager.cleanup(); console.log(`[Cleanup] Rooms: ${roomManager.getStats().totalRooms}`); }, 30*60*1000);

server.listen(PORT, () => console.log(`\n🎭 Mafioso Server on port ${PORT}\n`));
