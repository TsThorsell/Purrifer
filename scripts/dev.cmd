@echo off
setlocal
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PROJECT_ROOT=%~dp0.."

echo [purrifer] Rebuilding native modules for Electron ABI...
"%NODE_EXE%" "%PROJECT_ROOT%\node_modules\@electron\rebuild\lib\cli.js" -f -w better-sqlite3
if errorlevel 1 (
  echo [purrifer] Native rebuild failed. Aborting dev start.
  exit /b 1
)

echo [purrifer] Starting dev environment...
"%NODE_EXE%" "%~dp0dev.mjs"
