@echo off
cd /d "%~dp0"

if not exist "node_modules" (
  echo First-time setup - installing dependencies, this can take a few minutes...
  call npm install
)

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  call npm run setup
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  call npm run setup
)

if not exist "backend\.env" (
  echo Creating backend\.env from template...
  copy "backend\.env.example" "backend\.env" >nul
)

echo Making sure the demo admin login exists...
call npm run seed --prefix backend >nul 2>&1

echo Starting servers - your browser will open automatically once ready...
start "" cmd /c "timeout /t 6 /nobreak >nul && start "" "http://localhost:5173""

call npm run start

echo.
echo ============================================================
echo The servers have stopped. If this happened unexpectedly,
echo scroll up in this window to see the error message above.
echo ============================================================
pause
