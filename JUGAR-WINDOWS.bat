@echo off
title MOSTASA'S RAGE - Ciudad de la Furia
cd /d "%~dp0"

echo.
echo   ===========================================
echo    MOSTASA'S RAGE: CIUDAD DE LA FURIA
echo   ===========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Falta Node.js, que es lo unico que el juego necesita.
  echo.
  echo   Te abro la pagina de descarga. Instalalo con las
  echo   opciones por defecto, cerra esta ventana y volve a
  echo   hacer doble clic en este archivo.
  echo.
  start https://nodejs.org/es/download
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   Primera vez: preparando el juego.
  echo   Esto tarda unos minutos y pasa una sola vez.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   La preparacion fallo. Copiame el error de arriba.
    pause
    exit /b 1
  )
)

echo.
echo   Arrancando. Se abre solo en el navegador.
echo   Si no se abre solo, entra a:  http://localhost:3000
echo   Para cerrar el juego, cerra esta ventana negra.
echo.
call npm run jugar
pause
