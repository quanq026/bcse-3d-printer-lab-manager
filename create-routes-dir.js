#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');

try {
  fs.mkdirSync(routesDir, { recursive: true });
  console.log('✓ Directory created successfully:', routesDir);

  // Verify it exists
  if (fs.existsSync(routesDir)) {
    console.log('✓ Directory verified to exist');
  }
} catch (err) {
  console.error('✗ Error creating directory:', err.message);
  process.exit(1);
}
