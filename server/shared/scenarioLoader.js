const fs = require('fs');
const path = require('path');

const scenariosDir = path.join(__dirname, 'scenarios');
const scenarios = [];

if (fs.existsSync(scenariosDir)) {
  const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
      scenarios.push(data);
    } catch (e) {
      console.error(`[Scenarios] Failed to load ${file}:`, e.message);
    }
  }
}

console.log(`[Scenarios] Loaded ${scenarios.length} scenarios`);
module.exports = scenarios;
