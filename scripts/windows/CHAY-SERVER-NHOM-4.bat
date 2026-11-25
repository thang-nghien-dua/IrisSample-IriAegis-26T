@echo off
if not "%~1"=="--giu-cua-so" (cmd /k ""%~f0" --giu-cua-so" & exit /b)
setlocal
title Server liveness Nhom 4 - Docker (cong 8000)
where git >nul 2>&1 || set "PATH=%PATH%;C:\Program Files\Git\cmd"
where git >nul 2>&1 || (echo Khong tim thay Git. Cai Git roi chay lai. & goto :err)
where docker >nul 2>&1 || set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
where docker >nul 2>&1 || (echo Khong tim thay Docker. Cai va mo Docker Desktop roi chay lai. & goto :err)
docker info >nul 2>&1 || (echo Docker Desktop chua chay. Mo Docker Desktop, doi Engine running roi chay lai. & goto :err)

cd /d "%~dp0..\.."
set "SRC=.nhom4-server"

echo [1/3] Lay code server Nhom 4 (Long965, nhanh task1.2_API_Liveness_detection)...
if not exist "%SRC%\.git" (
  git clone --depth 1 -b task1.2_API_Liveness_detection https://github.com/Long965/IrisSample-IriAegis-26T.git "%SRC%" || goto :err
) else (
  git -C "%SRC%" pull --ff-only || echo Khong cap nhat duoc, dung ban dang co.
)

echo [2/3] Dong goi server vao Docker (lan dau mat vai phut)...
docker build -t nhom4-liveness -f "docker\nhom4-liveness\Dockerfile" "%SRC%\liveness_backend" || goto :err

echo [3/3] Server: http://127.0.0.1:8000  (Swagger: http://127.0.0.1:8000/docs)
echo Giu cua so nay mo trong luc dung web. Bam Ctrl+C hoac dong cua so de tat.
docker rm -f nhom4-liveness >nul 2>&1
docker run --rm --name nhom4-liveness -p 127.0.0.1:8000:8000 nhom4-liveness
echo.
echo ===== SERVER DA DUNG =====
exit /b 0

:err
echo.
echo ===== CO LOI =====
echo Chup man hinh cua so nay gui nhom truong.
exit /b 1
