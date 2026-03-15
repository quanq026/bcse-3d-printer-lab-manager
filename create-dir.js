const fs = require('fs');
const path = require('path');

try {
  fs.mkdirSync('server/routes', { recursive: true });
  console.log('✓ Directory created successfully');
  console.log('✓ Full path:', path.resolve('server/routes'));

  // Verify it exists
  if (fs.existsSync('server/routes')) {
    console.log('✓ Directory exists: YES');
    const stats = fs.statSync('server/routes');
    console.log('✓ Is directory:', stats.isDirectory());
  }
} catch (err) {
  console.error('✗ Error:', err.message);
}
