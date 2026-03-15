@echo off
cd /d c:\QuanNewData\bcse-3d-printer-lab-manager-main
echo Creating server/routes directory...
node create-routes-dir.js
echo.
echo Verifying directory exists...
if exist "server\routes" (
  echo SUCCESS: Directory c:\QuanNewData\bcse-3d-printer-lab-manager-main\server\routes exists
  dir server
) else (
  echo ERROR: Directory was not created
  exit /b 1
)
