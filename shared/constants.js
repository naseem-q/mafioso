// Mafioso — Shared Constants (CJS + ESM compatible)

const EVENTS = {
  CONNECTION: 'connection', DISCONNECT: 'disconnect',
  CREATE_ROOM: 'create-room', ROOM_CREATED: 'room-created',
  JOIN_ROOM: 'join-room', ROOM_JOINED: 'room-joined',
  LEAVE_ROOM: 'leave-room', PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left', ROOM_UPDATE: 'room-update',
  ROOM_ERROR: 'room-error',
  START_GAME: 'start-game', GAME_STARTED: 'game-started',
  ASSIGN_ROLES: 'assign-roles', ROLES_ASSIGNED: 'roles-assigned',
  ROLE_REVEAL: 'role-reveal',
  ADVANCE_PHASE: 'advance-phase', PHASE_CHANGED: 'phase-changed',
  SEND_EVIDENCE: 'send-evidence', EVIDENCE_RECEIVED: 'evidence-received',
  OPEN_VOTING: 'open-voting', VOTING_OPENED: 'voting-opened',
  CAST_VOTE: 'cast-vote', VOTE_CAST: 'vote-cast',
  CLOSE_VOTING: 'close-voting', VOTING_RESULTS: 'voting-results',
  ELIMINATE_PLAYER: 'eliminate-player', PLAYER_ELIMINATED: 'player-eliminated',
  OPEN_GHOST_VOTE: 'open-ghost-vote', GHOST_VOTING_OPENED: 'ghost-voting-opened',
  CAST_GHOST_VOTE: 'cast-ghost-vote',
  CLOSE_GHOST_VOTE: 'close-ghost-vote', GHOST_VOTING_RESULTS: 'ghost-voting-results',
  REVEAL_TRUTH: 'reveal-truth', TRUTH_REVEALED: 'truth-revealed',
  KICK_PLAYER: 'kick-player', PLAYER_KICKED: 'player-kicked',
  ERROR: 'error',
};

const ROLES = { MAFIA: 'mafia', INNOCENT: 'innocent' };

const PHASES = {
  LOBBY: 'lobby', SETUP: 'setup', INVESTIGATION: 'investigation',
  ELIMINATION: 'elimination', VERDICT: 'verdict', FINISHED: 'finished',
};

const PLAYER_STATUS = { ALIVE: 'alive', GHOST: 'ghost', KICKED: 'kicked' };

const CONFIG = {
  MIN_PLAYERS: 4, MAX_PLAYERS: 12, MAFIA_COUNT: 2,
  ROOM_CODE_LENGTH: 4, VOTE_TIMEOUT_SECONDS: 60, EVIDENCE_COUNT: 3,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EVENTS, ROLES, PHASES, PLAYER_STATUS, CONFIG };
}
export { EVENTS, ROLES, PHASES, PLAYER_STATUS, CONFIG };
