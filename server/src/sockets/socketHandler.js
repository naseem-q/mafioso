const { EVENTS } = require('../../shared/constants');
const rm = require('../rooms/RoomManager');

function sanitize(p) { return p ? { id: p.id, name: p.name, isGM: p.isGM, status: p.status, title: p.title, appearance: p.appearance } : null; }

function broadcastState(io, room) {
  if (!room) return;
  io.to(room.gmSocketId).emit(EVENTS.ROOM_UPDATE, { state: room.game.getGMState() });
  for (const [id] of room.game.players) {
    if (id !== room.gmSocketId) io.to(id).emit(EVENTS.ROOM_UPDATE, { state: room.game.getPlayerState(id) });
  }
}

function requireGM(socket) { if (!rm.isGM(socket.id)) throw new Error('فقط مدير اللعبة'); }

function err(socket, cb, msg) {
  if (typeof cb === 'function') cb({ success: false, message: msg });
  socket.emit(EVENTS.ERROR, { message: msg });
}

function registerHandlers(io, socket) {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on(EVENTS.CREATE_ROOM, ({ gmName }, cb) => {
    try {
      const room = rm.createRoom(socket.id, gmName);
      socket.join(room.code);
      const res = { code: room.code, gmName: room.gmName, state: room.game.getGMState() };
      if (typeof cb === 'function') cb({ success: true, ...res });
      socket.emit(EVENTS.ROOM_CREATED, res);
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.JOIN_ROOM, ({ code, playerName }, cb) => {
    try {
      const { room, player } = rm.joinRoom(code, socket.id, playerName);
      socket.join(code);
      if (typeof cb === 'function') cb({ success: true, code, player: sanitize(player), state: room.game.getPlayerState(socket.id) });
      socket.emit(EVENTS.ROOM_JOINED, { code, player: sanitize(player), state: room.game.getPlayerState(socket.id) });
      socket.to(code).emit(EVENTS.PLAYER_JOINED, { player: sanitize(player) });
      io.to(room.gmSocketId).emit(EVENTS.ROOM_UPDATE, { state: room.game.getGMState() });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.ASSIGN_ROLES, ({ scenario }, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      const assignments = room.game.assignRoles(scenario);
      for (const [pid, data] of Object.entries(assignments)) io.to(pid).emit(EVENTS.ROLE_REVEAL, data);
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.ADVANCE_PHASE, (_, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      const phase = room.game.advancePhase();
      io.to(room.code).emit(EVENTS.PHASE_CHANGED, { phase });
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true, phase });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.SEND_EVIDENCE, ({ evidenceId }, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      const evidence = room.game.sendEvidence(evidenceId);
      io.to(room.code).emit(EVENTS.EVIDENCE_RECEIVED, { evidence });
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.OPEN_VOTING, (_, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      room.game.openVoting();
      io.to(room.code).emit(EVENTS.VOTING_OPENED, {});
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.CAST_VOTE, ({ targetId }, cb) => {
    try {
      const room = rm.getPlayerRoom(socket.id);
      const count = room.game.castVote(socket.id, targetId);
      io.to(room.gmSocketId).emit(EVENTS.VOTE_CAST, { voterId: socket.id, targetId, totalVotes: count });
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.CLOSE_VOTING, (_, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      const results = room.game.closeVoting();
      io.to(room.code).emit(EVENTS.VOTING_RESULTS, { results });
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true, results });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.ELIMINATE_PLAYER, ({ playerId }, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      const player = room.game.eliminatePlayer(playerId);
      io.to(room.code).emit(EVENTS.PLAYER_ELIMINATED, { player: sanitize(player) });
      const win = room.game.checkWinCondition();
      if (win) { room.game.setPhase('finished'); io.to(room.code).emit(EVENTS.TRUTH_REVEALED, { winner: win.winner, reason: win.reason }); }
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.OPEN_GHOST_VOTE, (_, cb) => {
    try { requireGM(socket); const room = rm.getPlayerRoom(socket.id); room.game.openGhostVoting(); io.to(room.code).emit(EVENTS.GHOST_VOTING_OPENED, {}); broadcastState(io, room); if (typeof cb === 'function') cb({ success: true }); } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.CAST_GHOST_VOTE, ({ targetId }, cb) => {
    try { const room = rm.getPlayerRoom(socket.id); room.game.castGhostVote(socket.id, targetId); if (typeof cb === 'function') cb({ success: true }); } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.CLOSE_GHOST_VOTE, (_, cb) => {
    try { requireGM(socket); const room = rm.getPlayerRoom(socket.id); const results = room.game.closeGhostVoting(); io.to(room.code).emit(EVENTS.GHOST_VOTING_RESULTS, { results }); broadcastState(io, room); if (typeof cb === 'function') cb({ success: true, results }); } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.REVEAL_TRUTH, (_, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      room.game.setPhase('finished');
      const all = [...room.game.players.values()].map(p => ({ id: p.id, name: p.name, role: p.role, status: p.status, title: p.title }));
      io.to(room.code).emit(EVENTS.TRUTH_REVEALED, { players: all });
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.KICK_PLAYER, ({ playerId }, cb) => {
    try {
      requireGM(socket); const room = rm.getPlayerRoom(socket.id);
      room.game.removePlayer(playerId); rm.playerRoomMap?.delete?.(playerId);
      io.to(playerId).emit(EVENTS.PLAYER_KICKED, { reason: 'تم طردك' });
      const kicked = io.sockets.sockets.get(playerId);
      if (kicked) kicked.leave(room.code);
      broadcastState(io, room);
      if (typeof cb === 'function') cb({ success: true });
    } catch (e) { err(socket, cb, e.message); }
  });

  socket.on(EVENTS.DISCONNECT, () => {
    const result = rm.removePlayer(socket.id);
    if (result) {
      if (result.roomDestroyed) io.to(result.room.code).emit(EVENTS.ROOM_ERROR, { message: 'GM غادر — تم إغلاق الغرفة' });
      else { socket.to(result.room.code).emit(EVENTS.PLAYER_LEFT, { player: sanitize(result.player) }); broadcastState(io, result.room); }
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
}

module.exports = { registerHandlers };
