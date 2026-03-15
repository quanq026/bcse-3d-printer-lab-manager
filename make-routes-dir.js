const fs = require('fs');
const path = require('path');
const dir = path.join('c:\\QuanNewData\\bcse-3d-printer-lab-manager-main', 'server', 'routes');
fs.mkdirSync(dir, { recursive: true });
console.log('Created:', dir);
console.log('Exists:', fs.existsSync(dir));
