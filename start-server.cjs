const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

const candidates = [
  'dist/server/index.js',
  'dist/server/server/index.js'
];

const entrypoint = candidates.find(existsSync);

if (!entrypoint) {
  console.error(`Missing server entrypoint. Checked: ${candidates.join(', ')}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [entrypoint], { stdio: 'inherit' });
process.exit(result.status ?? 1);
