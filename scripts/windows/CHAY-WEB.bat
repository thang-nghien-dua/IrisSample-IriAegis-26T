@echo off
if not "%~1"=="--giu-cua-so" (cmd /k ""%~f0" --giu-cua-so" & exit /b)
setlocal
title Web IriAegis - Nhom 5 (cong 5173)
where npm.cmd >nul 2>&1 || (echo Khong tim thay Node.js. Cai Node.js LTS tu nodejs.org roi chay lai. & goto :err)
cd /d "%~dp0..\.."
if not exist "package.json" (echo Khong tim thay package.json. File nay phai nam trong scripts\windows cua repo. & goto :err)

where git >nul 2>&1 || set "PATH=%PATH%;C:\Program Files\Git\cmd"
if exist ".git" (
  echo [1/3] Lay code moi nhat...
  git pull --ff-only || echo Khong tu cap nhat duoc - co the ban dang sua code. Chay tiep voi code hien tai.
)

echo [2/3] Cai thu vien (lan dau mat vai phut)...
if not exist "node_modules\.package-lock.json" (call npm.cmd ci || goto :err) else (call npm.cmd install --no-audit --no-fund || goto :err)

echo [3/3] Chay web. Trinh duyet se tu mo. Dong cua so nay hoac bam Ctrl+C de tat.
echo Kiem tra REAL/FAKE can server Nhom 4 dang chay (scripts\windows\CHAY-SERVER-NHOM-4.bat).
start "" cmd /c "timeout /t 8 >nul & start http://127.0.0.1:5173/#/camera"
call npm.cmd run dev
exit /b 0

:err
echo.
echo ===== CO LOI =====
echo Chup man hinh cua so nay gui nhom truong.
exit /b 1
