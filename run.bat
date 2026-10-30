@echo off
echo ========================================================
echo    AdvD - Digital Court Diary & Advocate System
echo ========================================================
echo.
echo Starting MongoDB service check...
sc query MongoDB | find "RUNNING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] MongoDB service does not appear to be running.
    echo Attempting to start MongoDB service...
    net start MongoDB
)

echo.
echo Starting Backend API (Port 5000)...
start "AdvD Backend API" cmd /k "cd backend && npm run dev"

echo.
echo Starting Frontend Client (Port 5173)...
start "AdvD Frontend App" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo AdvD is launching!
echo App URL:     http://localhost:5173
echo API URL:     http://localhost:5000
echo ========================================================
echo.
timeout /t 3 >nul
start http://localhost:5173

