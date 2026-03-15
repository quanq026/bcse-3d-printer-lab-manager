const { execSync } = require('child_process');
const path = require('path');

try {
  process.chdir('c:\\QuanNewData\\bcse-3d-printer-lab-manager-main');
  const result = execSync('node _mkdir.cjs', { encoding: 'utf-8' });
  console.log(result);
  console.log('Script executed successfully');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
