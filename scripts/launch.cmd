@echo off
setlocal

set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "PROJECT_ROOT=%~dp0.."
set "ELECTRON_VITE_CLI=%PROJECT_ROOT%\node_modules\electron-vite\bin\electron-vite.js"
set "ELECTRON_EXE=%PROJECT_ROOT%\node_modules\electron\dist\electron.exe"

if not exist "%NODE_EXE%" (
  echo [purrifer] Node executable not found: %NODE_EXE%
  exit /b 1
)

if not exist "%PROJECT_ROOT%\node_modules" (
  echo [purrifer] node_modules saknas. Kor installation:
  echo   "%NODE_EXE%" "%ProgramFiles%\nodejs\node_modules\npm\bin\npm-cli.js" install
  exit /b 1
)

echo [purrifer] Rebuilding native modules for Electron ABI...
"%NODE_EXE%" "%PROJECT_ROOT%\node_modules\@electron\rebuild\lib\cli.js" -f -w better-sqlite3
if errorlevel 1 (
  echo [purrifer] Native rebuild failed.
  exit /b 1
)

echo [purrifer] Building renderer/main/preload...
"%NODE_EXE%" "%ELECTRON_VITE_CLI%" build
if errorlevel 1 (
  echo [purrifer] Build failed.
  exit /b 1
)

echo [purrifer] Starting application...
"%ELECTRON_EXE%" "%PROJECT_ROOT%"
