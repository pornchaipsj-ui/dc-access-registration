@echo off
setlocal
cd /d "%~dp0"
title DC Access Registration

echo ==============================================
echo  DC Access Registration - Local Test Server
echo ==============================================
echo.
echo Starting website at http://localhost:8080/
echo Keep this window open while testing.
echo Press Ctrl+C to stop the website.
echo.

where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo Windows PowerShell was not found on this computer.
  echo Please contact IT support or install Python/VS Code Live Server.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" -Port 8080

echo.
echo The local website has stopped.
pause
