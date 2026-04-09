const GameEngine = require('../game/GameEngine');
const { generateRoomCode } = require('../utils/helpers');

class RoomManager {
  constructor() { this.rooms = new Map(); this.playerRoomMap = new Map(); }

  createRoom(gmSocketId, gmName) {
    let code; do { code = generateRoomCode(); } while (this.rooms.has(code));
    const room = { code, gmSocketId, gmName, game: new GameEngine(), createdAt: Date.now() };
    room.game.addPlayer(gmSocketId, gmName, true);
    this.rooms.set(code, room);
    this.playerRoomMap.set(gmSocketId, code);
    console.log(`[Room] Created ${code} by ${gmName}`);
    return room;
  }

  getRoom(code) { return this.rooms.get(code); }

  joinRoom(code, socketId, playerName) {
    const room = this.rooms.get(code);
    if (!room) throw new Error('الغرفة غير موجودة');
    const player = room.game.addPlayer(socketId, playerName);
    this.playerRoomMap.set(socketId, code);
    return { room, player };
  }

  removePlayer(socketId) {
    const code = this.playerRoomMap.get(socketId);
    if (!code) return null;
    const room = this.rooms.get(code);
    if (!room) return null;
    const player = room.game.getPlayer(socketId);
    room.game.removePlayer(socketId);
    this.playerRoomMap.delete(socketId);
    if (socketId === room.gmSocketId) { this.destroyRoom(code); return { room, player, roomDestroyed: true }; }
    return { room, player, roomDestroyed: false };
  }

  destroyRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const [id] of room.game.players) this.playerRoomMap.delete(id);
    this.rooms.delete(code);
  }

  getPlayerRoom(socketId) { const code = this.playerRoomMap.get(socketId); return code ? this.rooms.get(code) : null; }
  isGM(socketId) { const room = this.getPlayerRoom(socketId); return room?.gmSocketId === socketId; }
  getStats() { return { totalRooms: this.rooms.size, totalPlayers: this.playerRoomMap.size }; }

  cleanup(maxAge = 3 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [code, room] of this.rooms) { if (now - room.createdAt > maxAge) this.destroyRoom(code); }
  }
}

module.exports = new RoomManager();
