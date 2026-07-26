#!/bin/bash
# Doble clic para jugar. macOS y Linux.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  ==========================================="
echo "   MOSTASA'S RAGE: CIUDAD DE LA FURIA"
echo "  ==========================================="
echo ""

open_url() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
  else echo "  Abri a mano: $1"; fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "  Falta Node.js, que es lo unico que el juego necesita."
  echo ""
  echo "  Te abro la pagina de descarga. Instalalo con las"
  echo "  opciones por defecto, cerra esta ventana y volve a"
  echo "  hacer doble clic en este archivo."
  echo ""
  open_url "https://nodejs.org/es/download"
  read -r -p "  (Enter para cerrar) " _
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Primera vez: preparando el juego."
  echo "  Esto tarda unos minutos y pasa una sola vez."
  echo ""
  if ! npm install; then
    echo ""
    echo "  La preparacion fallo. Copiame el error de arriba."
    read -r -p "  (Enter para cerrar) " _
    exit 1
  fi
fi

echo ""
echo "  Arrancando. Se abre solo en el navegador."
echo "  Si no se abre solo, entra a:  http://localhost:3000"
echo "  Para cerrar el juego, cerra esta ventana."
echo ""
npm run jugar
