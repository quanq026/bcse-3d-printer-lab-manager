#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Create server/routes directory
try {
  fs.mkdirSync(path.join(__dirname, 'server', 'routes'), { recursive: true });
  console.log('✓ server/routes directory created successfully');
} catch (error) {
  console.error('Error creating directory:', error.message);
  process.exit(1);
}
