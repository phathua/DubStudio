@echo off
setlocal
cd /d "%~dp0"
where pnpm >nul 2>&1 || (echo pnpm is required. See README.md. & goto :fail)
call pnpm install --frozen-lockfile || goto :fail
call pnpm tauri dev || goto :fail
exit /b 0
:fail
echo Development server stopped with an error.
pause
exit /b 1
