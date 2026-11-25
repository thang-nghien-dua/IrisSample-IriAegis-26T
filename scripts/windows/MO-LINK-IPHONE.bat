@echo off
if not "%~1"=="--giu-cua-so" (cmd /k ""%~f0" --giu-cua-so" & exit /b)
setlocal
title Link HTTPS cho iPhone (Cloudflare Tunnel)
set "PF86=%ProgramFiles(x86)%"
set "CF="
call :find
if defined CF goto :run
echo Chua co cloudflared, dang cai bang winget...
winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
call :find
if not defined CF (echo Cai xong nhung chua tim thay cloudflared. Dong cua so va chay lai file nay. & goto :err)

:run
echo Can dang chay: scripts\windows\CHAY-WEB.bat va CHAY-SERVER-NHOM-4.bat
echo Tim dong co link dang https://....trycloudflare.com ben duoi,
echo mo link do bang Safari tren iPhone, them #/camera vao cuoi link.
echo Link cong khai tam thoi: chi gui cho nguoi test. Dong cua so nay de tat link.
echo.
"%CF%" tunnel --url http://127.0.0.1:5173
exit /b 0

:find
for /f "delims=" %%P in ('where cloudflared 2^>nul') do if not defined CF set "CF=%%P"
if not defined CF if exist "%PF86%\cloudflared\cloudflared.exe" set "CF=%PF86%\cloudflared\cloudflared.exe"
if not defined CF if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
exit /b 0

:err
echo.
echo ===== CO LOI =====
echo Chup man hinh cua so nay gui nhom truong.
exit /b 1
