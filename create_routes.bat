@echo off
cd /d "c:\QuanNewData\bcse-3d-printer-lab-manager-main"
node -e "const fs = require('fs'); const path = require('path'); fs.mkdirSync('server/routes', { recursive: true }); console.log('Directory created at:', path.resolve('server/routes'));"
pause
