@echo off
setlocal
cd /d "%~dp0"
where pnpm >nul 2>&1 || (echo pnpm is required. See README.md. & goto :fail)
call pnpm install --frozen-lockfile || goto :fail
call pnpm tauri build --bundles nsis || goto :fail
set "INSTALLER="
for /f "delims=" %%F in ('dir /b /a-d /o-d "src-tauri\target\release\bundle\nsis\*-setup.exe" 2^>nul') do if not defined INSTALLER set "INSTALLER=%%F"
if not defined INSTALLER (echo NSIS installer not found. & goto :fail)
start "" /wait "src-tauri\target\release\bundle\nsis\%INSTALLER%" /S
if errorlevel 1 goto :fail
echo Installation completed: %INSTALLER%
pause
exit /b 0
:fail
echo Build or installation failed.
pause
exit /b 1
