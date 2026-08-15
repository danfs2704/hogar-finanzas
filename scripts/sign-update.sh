#!/bin/bash
# sign-update.sh - Firmar archivos de actualizacion para Tauri v2 updater
# USO: ./scripts/sign-update.sh <ruta-al-archivo-nsis-o-msi>
#
# Este script firma el instalador y genera el archivo latest.json
# que se debe subir como asset del release en GitHub.

set -e

KEY_FILE=""
# Buscar la clave privada en ubicaciones comunes
for candidate in \
  "updater-key.pem" \
  "$HOME/.tauri/hogar-finanzas.key" \
  "src-tauri/updater-key.pem"; do
  if [ -f "$candidate" ]; then
    KEY_FILE="$candidate"
    break
  fi
done

if [ -z "$KEY_FILE" ]; then
  echo "ERROR: No se encontro la clave privada de firma."
  echo "Buscada en: updater-key.pem, ~/.tauri/hogar-finanzas.key, src-tauri/updater-key.pem"
  echo ""
  echo "Para generar una nueva clave ejecuta:"
  echo "  openssl genrsa -out updater-key.pem 2048"
  exit 1
fi

if [ -z "$1" ]; then
  echo "USO: $0 <archivo-a-firmar>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 src-tauri/target/release/bundle/nsis/Hogar-Finanzas_1.3.3_x64-setup.exe"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe el archivo: $FILE"
  exit 1
fi

FILENAME=$(basename "$FILE")
echo "Firmando: $FILENAME"
echo "Clave: $KEY_FILE"

# Firmar el archivo (formato requerido por Tauri updater v2)
SIGNATURE=$(openssl dgst -sha256 -sign "$KEY_FILE" -out /dev/stdin "$FILE" | base64 -w 0)

# Obtener el tamanio del archivo
FILESIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE" 2>/dev/null)

echo ""
echo "Archivo: $FILENAME"
echo "Tamanio: $FILESIZE bytes"
echo "Firma: $SIGNATURE"
echo ""
echo "=== Contenido para latest.json ==="
echo "Subi este archivo como asset en GitHub Releases junto con el instalador."
echo ""

# Leer version desde tauri.conf.json si existe
VERSION=$(grep -o '"version": *"[^"]*"' src-tauri/tauri.conf.json 2>/dev/null | head -1 | grep -o '[0-9][^"]*')
if [ -z "$VERSION" ]; then
  VERSION="0.0.0"
fi

NOTE_URL="https://github.com/danfs2704/hogar-finanzas/releases/tag/v${VERSION}"

cat <<EOF
{
  "version": "${VERSION}",
  "notes": "Novedades en v${VERSION}: ver notas del release en GitHub.",
  "pub_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "windows-x86_64": {
      "signature": "${SIGNATURE}",
      "url": "https://github.com/danfs2704/hogar-finanzas/releases/download/v${VERSION}/${FILENAME}"
    }
  }
}
EOF

echo ""
echo "NOTA IMPORTANTE:"
echo "1. Crea un release en GitHub con tag v${VERSION}"
echo "2. Subi como assets:"
echo "   - El instalador (.exe o .msi)"
echo "   - El archivo latest.json generado arriba"
echo ""
echo "GUARDA ESTA CLAVE PRIVADA DE FORMA SEGURA:"
echo "  Si la perdes, no podras firmar futuras actualizaciones."
echo "  Si se filtra, cualquiera podria publicar actualizaciones falsas."
