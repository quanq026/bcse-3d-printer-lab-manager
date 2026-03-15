import os
import sys

# Change to the target directory
os.chdir(r'c:\QuanNewData\bcse-3d-printer-lab-manager-main')

# Create the server/routes directory
target_dir = os.path.join('server', 'routes')
try:
    os.makedirs(target_dir, exist_ok=True)
    print(f'✓ {target_dir} directory created successfully')
except Exception as e:
    print(f'Error creating directory: {e}', file=sys.stderr)
    sys.exit(1)
