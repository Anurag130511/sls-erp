#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "First-time setup - installing dependencies, this can take a few minutes..."
  npm install
fi

if [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
  echo "Installing backend/frontend dependencies..."
  npm run setup
fi

if [ ! -f "backend/.env" ]; then
  echo "Creating backend/.env from template..."
  cp backend/.env.example backend/.env
fi

echo "Making sure the demo admin login exists..."
npm run seed --prefix backend >/dev/null 2>&1

echo "Starting servers - your browser will open automatically once ready..."
(sleep 6 && xdg-open "http://localhost:5173" 2>/dev/null) &

npm run start

echo ""
echo "============================================================"
echo "The servers have stopped. If this happened unexpectedly,"
echo "scroll up in this window to see the error message above."
echo "============================================================"
read -p "Press Enter to close this window..."
