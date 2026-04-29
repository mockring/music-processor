// Start script that ensures ELECTRON_RUN_AS_NODE is not set
const { spawn } = require('child_process');
const path = require('path');

// Create a clean environment without ELECTRON_RUN_AS_NODE
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');

const child = spawn(electronPath, ['.'], {
  env,
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});
