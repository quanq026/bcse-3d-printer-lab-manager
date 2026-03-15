const fs = require('fs');
const path = require('path');
const os = require('os');

// Change to the correct directory
process.chdir('c:\\QuanNewData\\bcse-3d-printer-lab-manager-main');

const dirPath = path.join(process.cwd(), 'server', 'routes');

try {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log('✓ Directory created successfully at:', dirPath);

  // Verify it exists
  const exists = fs.existsSync(dirPath);
  console.log('✓ Verification - Directory exists:', exists);

  // Get stats
  if (exists) {
    const stats = fs.statSync(dirPath);
    console.log('✓ Is directory:', stats.isDirectory());
    console.log('✓ Full path:', dirPath);
  }
} catch (err) {
  console.error('✗ Error:', err.message);
  process.exit(1);
}
