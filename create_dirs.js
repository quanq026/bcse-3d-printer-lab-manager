const fs = require('fs');
const path = require('path');

try {
  const dirPath = path.join(__dirname, 'server', 'routes');
  fs.mkdirSync(dirPath, { recursive: true });
  console.log('Directory created successfully at:', dirPath);
  console.log('Directory exists:', fs.existsSync(dirPath));
} catch (err) {
  console.error('Error creating directory:', err.message);
}
