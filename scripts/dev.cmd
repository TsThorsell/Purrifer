@echo off
setlocal
set "NODE_EXE="
for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PROJECT_ROOT=%~dp0.."

if not exist "%NODE_EXE%" (
  echo [purrifer] Could not find node.exe. Aborting dev start.
  exit /b 1
)

echo [purrifer] Rebuilding native modules for Electron ABI...
"%NODE_EXE%" "%PROJECT_ROOT%\node_modules\@electron\rebuild\lib\cli.js" -f -w better-sqlite3
if errorlevel 1 (
  echo [purrifer] Native rebuild failed. Aborting dev start.
  exit /b 1
)

echo [purrifer] Starting dev environment...
"%NODE_EXE%" "%~dp0dev.mjs"
