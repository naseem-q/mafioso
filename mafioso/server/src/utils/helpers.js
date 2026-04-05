function generateRoomCode(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tallyVotes(votes) {
  const counts = {};
  for (const targetId of Object.values(votes)) {
    counts[targetId] = (counts[targetId] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([playerId, count]) => ({ playerId, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { generateRoomCode, shuffle, tallyVotes };
