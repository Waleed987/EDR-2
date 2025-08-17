@echo off
echo Starting EDR Security Dashboard...
echo.

echo Starting Backend Server...
start "EDR Backend" cmd /k "cd edr_server && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "EDR Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Dashboard is starting up...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul
