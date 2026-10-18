@echo off
cd /d "%~dp0backend"
if not exist venv python -m venv venv
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt
if errorlevel 1 goto failed
if not exist .env python -c "import secrets; from pathlib import Path; Path('.env').write_text('SECRET_KEY='+secrets.token_urlsafe(48)+'\nALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173\n')"
echo Backend ready.
pause
exit /b 0
:failed
echo Setup failed. Check the error above.
pause
exit /b 1
