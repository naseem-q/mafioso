const { ROLES, PHASES, PLAYER_STATUS, CONFIG } = require('../../shared/constants');
const { shuffle, tallyVotes } = require('./utils/helpers');

class GameEngine {
  constructor() {
    this.phase = PHASES.LOBBY;
    this.players = new Map();
    this.gmId = null;
    this.evidence = [];
    this.votes = {};
    this.ghostVotes = {};
    this.votingOpen = false;
    this.ghostVotingOpen = false;
    this.rolesAssigned = false;
  }

  addPlayer(id, name, isGM = false) {
    if (this.players.size >= CONFIG.MAX_PLAYERS) throw new Error('الغرفة ممتلئة');
    if (this.phase !== PHASES.LOBBY && !isGM) throw new Error('اللعبة بدأت');
    const player = { id, name, isGM, role: null, status: PLAYER_STATUS.ALIVE, title: '', job: '', appearance: '', timeline: '', secret: '' };
    this.players.set(id, player);
    if (isGM) this.gmId = id;
    return player;
  }

  removePlayer(id) { this.players.delete(id); delete this.votes[id]; delete this.ghostVotes[id]; }
  getPlayer(id) { return this.players.get(id); }
  getAlivePlayers() { return [...this.players.values()].filter(p => p.status === PLAYER_STATUS.ALIVE && !p.isGM); }
  getGhosts() { return [...this.players.values()].filter(p => p.status === PLAYER_STATUS.GHOST); }
  getNonGMPlayers() { return [...this.players.values()].filter(p => !p.isGM); }

  assignRoles(scenario) {
    const players = this.getNonGMPlayers();
    if (players.length < CONFIG.MIN_PLAYERS) throw new Error(`يلزم ${CONFIG.MIN_PLAYERS} لاعبين`);
    const shuffled = shuffle(players.map(p => p.id));
    const mafiaIds = new Set(shuffled.slice(0, CONFIG.MAFIA_COUNT));
    const sp = scenario?.players || [];
    players.forEach((player, i) => {
      player.role = mafiaIds.has(player.id) ? ROLES.MAFIA : ROLES.INNOCENT;
      if (sp[i]) { player.title = sp[i].title||''; player.job = sp[i].job||''; player.appearance = sp[i].appearance||''; player.timeline = sp[i].timeline||''; player.secret = sp[i].secret||''; }
    });
    if (scenario?.evidence) this.evidence = scenario.evidence.map((e, i) => ({ id: i+1, ...e, sent: false }));
    this.rolesAssigned = true;
    this.phase = PHASES.SETUP;
    const assignments = {};
    for (const [id, p] of this.players) { if (!p.isGM) assignments[id] = { role: p.role, title: p.title, job: p.job, appearance: p.appearance, timeline: p.timeline, secret: p.secret }; }
    return assignments;
  }

  advancePhase() {
    const order = [PHASES.LOBBY, PHASES.SETUP, PHASES.INVESTIGATION, PHASES.ELIMINATION, PHASES.VERDICT, PHASES.FINISHED];
    const idx = order.indexOf(this.phase);
    if (idx < order.length - 1) { this.phase = order[idx + 1]; this.votingOpen = false; this.votes = {}; }
    return this.phase;
  }

  setPhase(phase) { this.phase = phase; this.votingOpen = false; this.votes = {}; }
  sendEvidence(id) { const ev = this.evidence.find(e => e.id === id); if (!ev) throw new Error('دليل غير موجود'); if (ev.sent) throw new Error('أُرسل مسبقاً'); ev.sent = true; return ev; }
  getSentEvidence() { return this.evidence.filter(e => e.sent); }

  openVoting() { this.votingOpen = true; this.votes = {}; }
  castVote(voterId, targetId) {
    if (!this.votingOpen) throw new Error('التصويت مغلق');
    const voter = this.getPlayer(voterId);
    if (!voter || voter.status !== PLAYER_STATUS.ALIVE) throw new Error('لا يمكنك التصويت');
    this.votes[voterId] = targetId;
    return Object.keys(this.votes).length;
  }
  closeVoting() {
    this.votingOpen = false;
    return tallyVotes(this.votes).map(r => { const p = this.getPlayer(r.playerId); return { ...r, name: p?.name||'', title: p?.title||'', role: p?.role }; });
  }

  openGhostVoting() { this.ghostVotingOpen = true; this.ghostVotes = {}; }
  castGhostVote(ghostId, targetId) {
    if (!this.ghostVotingOpen) throw new Error('التصويت مغلق');
    const g = this.getPlayer(ghostId);
    if (!g || g.status !== PLAYER_STATUS.GHOST) throw new Error('فقط الأشباح');
    this.ghostVotes[ghostId] = targetId;
    return Object.keys(this.ghostVotes).length;
  }
  closeGhostVoting() { this.ghostVotingOpen = false; return tallyVotes(this.ghostVotes); }

  eliminatePlayer(playerId) { const p = this.getPlayer(playerId); if (!p) throw new Error('غير موجود'); p.status = PLAYER_STATUS.GHOST; return p; }

  checkWinCondition() {
    const alive = this.getAlivePlayers();
    const m = alive.filter(p => p.role === ROLES.MAFIA);
    const inn = alive.filter(p => p.role === ROLES.INNOCENT);
    if (m.length === 0) return { winner: 'innocents', reason: 'تم كشف كل المافيوسو' };
    if (m.length >= inn.length) return { winner: 'mafia', reason: 'المافيوسو سيطروا' };
    return null;
  }

  getPublicState() {
    return {
      phase: this.phase,
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, isGM: p.isGM, status: p.status, title: p.title, job: p.job, appearance: p.appearance })),
      evidence: this.getSentEvidence(),
      votingOpen: this.votingOpen, ghostVotingOpen: this.ghostVotingOpen, rolesAssigned: this.rolesAssigned,
    };
  }

  getGMState() {
    return {
      phase: this.phase,
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, isGM: p.isGM, status: p.status, role: p.role, title: p.title, job: p.job, appearance: p.appearance, secret: p.secret })),
      evidence: this.evidence, votingOpen: this.votingOpen, ghostVotingOpen: this.ghostVotingOpen, rolesAssigned: this.rolesAssigned,
    };
  }

  getPlayerState(playerId) {
    const pub = this.getPublicState();
    const p = this.getPlayer(playerId);
    return { ...pub, myRole: p?.role, mySecret: p?.secret, myTimeline: p?.timeline, myStatus: p?.status };
  }
}

module.exports = GameEngine;
