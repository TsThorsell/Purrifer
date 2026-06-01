@echo off
setlocal

set "APP_DIR=C:\Dev\Purrifer"
set "NODE_DIR=C:\Users\thoma\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.22_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v22.22.3-win-x64"

if exist "%NODE_DIR%\npm.cmd" goto run_app
if exist "C:\Program Files\nodejs\npm.cmd" set "NODE_DIR=C:\Program Files\nodejs" & goto run_app

echo Kunde inte hitta Node.js eller npm.cmd.
echo Kontrollera Node-installationen.
pause
exit /b 1

:run_app
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_scripts_prepend_node_path=true"
cd /d "%APP_DIR%"
call "%NODE_DIR%\npm.cmd" run dev
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Appstart misslyckades med exit code %EXIT_CODE%.
  pause
)
exit /b %EXIT_CODE%
