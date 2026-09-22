@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0testar-demo.ps1" %*
exit /b %ERRORLEVEL%
