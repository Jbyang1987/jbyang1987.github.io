@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if exist "%NODE_EXE%" goto run
set "NODE_EXE=node.exe"
where node.exe >nul 2>nul
if not errorlevel 1 goto run
echo Node.js was not found. Please install Node.js.
pause
exit /b 1
:run
"%NODE_EXE%" "%~dp0tools\tex2html\launch.js" %*
if not errorlevel 1 exit /b 0
echo.
echo Startup failed. See the error above.
pause
exit /b 1
