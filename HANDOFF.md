# Hogar Finanzas - Documento de Continuidad

> **IMPORTANTE**: Si un agente/canal deja de responder, abrí un chat nuevo y seguí las instrucciones de abajo.

---

## INFORMACION CLAVE DEL PROYECTO

- **Repositorio**: https://github.com/danfs2704/hogar-finanzas
- **Rama principal**: `main`
- **Stack**: Tauri v2 + Next.js 15 + Prisma + SQLite
- **Lenguaje del usuario**: Español (responder SIEMPRE en español)
- **Usuario no es programador**: Explicar todo simple, paso a paso

## ACCESO

### GitHub Token
- El token esta guardado en un lugar seguro por el usuario
- Al iniciar un chat nuevo, el usuario debe proporcionar el token
- Permisos necesarios: repo (lectura/escritura), actions (disparar workflows)
- Formato de uso: `git push https://danfs2704:TOKEN_AQUI@github.com/danfs2704/hogar-finanzas.git main`
- Se usa en API calls: `curl -H "Authorization: token TOKEN" https://api.github.com/...`

### Clave Privada del Updater
- **Ubicacion en el servidor**: `/home/z/my-project/hogar-finanzas/updater-private.pem`
- **NO esta en el repo** (en .gitignore)
- Se usa para firmar actualizaciones con: `openssl dgst -sha256 -sign updater-private.pem`
- La clave PUBLICA esta en `src-tauri/tauri.conf.json` en `plugins.updater.pubkey`

## ESTRUCTURA DEL PROYECTO

```
hogar-finanzas/
├── src-tauri/               # Backend Rust (Tauri)
│   ├── src/main.rs          # Punto de entrada, inicia Node.js
│   ├── tauri.conf.json      # Config Tauri + updater + CSP
│   ├── Cargo.toml           # Dependencias Rust
│   ├── capabilities/default.json  # Permisos de plugins
│   └── nsis/nsis-hooks.nsi  # Hooks del instalador (mata Node.js)
├── src/                     # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx         # Pagina principal
│   │   └── api/             # API routes
│   │       ├── accounts/    # Cuentas bancarias
│   │       ├── transactions/# Transacciones
│   │       ├── db-lock/     # Lock por tabla SQLite
│   │       ├── file-lock/   # Lock por archivo (OneDrive)
│   │       ├── settings/db-path/ # Cambiar ubicacion DB
│   │       └── health/      # Health check
│   ├── components/finance/  # Componentes de la app
│   │   ├── AccountsView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── TransactionsView.tsx
│   │   ├── AnalyticsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── DbLockCheck.tsx  # Aviso de DB en uso
│   │   └── UpdateBanner.tsx  # Banner de actualizaciones
│   └── lib/
│       ├── db.ts            # Prisma client + schema auto-migration
│       ├── format.ts        # Formato de numeros (latinoamericano)
│       └── icons.ts         # Iconos dinamicos
├── scripts/
│   ├── server-entry.js      # Entry point del servidor Node.js (produccion)
│   ├── server-wrapper.js    # Wrapper con logging
│   ├── sign-update.sh       # Script para firmar actualizaciones
│   └── seed.ts              # Datos iniciales de ejemplo
├── prisma/
│   └── schema.prisma        # Schema de la base de datos
└── .github/workflows/
    └── release.yml           # Build Windows en GitHub Actions
```

## COMO COMPILAR Y SUBIR ACTUALIZACION

### 1. Hacer cambios y pushear
```bash
cd /home/z/my-project/hogar-finanzas
git add -A
git commit -m "descripcion del cambio"
git push https://danfs2704:TOKEN@github.com/danfs2704/hogar-finanzas.git main
```

### 2. Esperar a que compile en GitHub Actions
- Se dispara automaticamente al hacer push a main
- Si no se dispara, disparar manualmente con curl al workflow dispatch (ID: 320261669)
- Verificar estado: `curl -H "Authorization: token TOKEN" https://api.github.com/repos/danfs2704/hogar-finanzas/actions/runs?per_page=1`

### 3. Descargar el exe compilado
```bash
# Obtener artifact ID del ultimo run exitoso
# Luego descargarlo
curl -sL -H "Authorization: token TOKEN" \
  "https://api.github.com/repos/danfs2704/hogar-finanzas/actions/artifacts/ARTIFACT_ID/zip" \
  -o build-output/windows-installer.zip
unzip build-output/windows-installer.zip -d build-output/extracted
```

### 4. Firmar el exe y crear latest.json
```bash
EXE="build-output/extracted/nsis/Hogar Finanzas_0.3.0_x64-setup.exe"
SIG_FILE=$(mktemp)
openssl dgst -sha256 -sign updater-private.pem -out "$SIG_FILE" "$EXE"
SIGNATURE=$(base64 -w 0 "$SIG_FILE")
rm -f "$SIG_FILE"
```

### 5. Crear/actualizar release en GitHub
```bash
# Crear release
DATA='{"tag_name":"vX.Y.Z","name":"vX.Y.Z - descripcion","body":"cambios","prerelease":false,"make_latest":true}'
curl -X POST -H "Authorization: token TOKEN" -H "Content-Type: application/json" \
  -d "$DATA" https://api.github.com/repos/danfs2704/hogar-finanzas/releases

# Subir exe
RELEASE_ID=ID_DEL_RELEASE
curl -X POST -H "Authorization: token TOKEN" -H "Content-Type: application/octet-stream" \
  --data-binary "@$EXE" \
  "https://uploads.github.com/repos/danfs2704/hogar-finanzas/releases/RELEASE_ID/assets?name=Hogar%20Finanzas_0.3.0_x64-setup.exe"

# Subir latest.json (con la firma y URL correcta)
curl -X POST -H "Authorization: token TOKEN" -H "Content-Type: application/json" \
  --data-binary @latest.json \
  "https://uploads.github.com/repos/danfs2704/hogar-finanzas/releases/RELEASE_ID/assets?name=latest.json"
```

### IMPORTANTE: Nombre del exe
- GitHub renombra espacios a puntos: "Hogar Finanzas_xxx.exe" se convierte en "Hogar.Finanzas_xxx.exe"
- La URL en latest.json debe usar el nombre que GitHub le da al subir

## ESTADO ACTUAL Y PENDIENTES

### Version actual: 0.3.0 (codigo) / 0.3.1 (ultimo release)

### Corregido:
- **Formato de numeros**: parseLatam() ahora detecta correctamente puntos como separador de miles (810.000, 2.000.000, etc.)
- **Lock de archivo para DB compartida**: Se agrego data.db.lock que se crea al lado de la base de datos

### Pendientes conocidos:
1. **Banner de actualizaciones no funciona**: CORS bloquea el fetch desde HTTP a HTTPS. Solucion: crear API interna.
2. **Version Android**: El usuario quiere hacer la version Android.
3. **Version Linux**: Ya tiene instrucciones de como compilar para Linux.

### Detalles tecnicos importantes:
- Formato latinoamericano: punto para miles, coma para decimales (1.234.567,89)
- Base de datos SQLite (archivo data.db)
- Servidor Node.js en puerto 3456
- PID de Node.js se guarda en %APPDATA%/HogarFinanzas/node.pid
- Instalador NSIS mata Node.js antes de instalar/desinstalar
- Ubicacion de la DB configurable desde Configuracion (config.json)
- Clave publica del updater en tauri.conf.json
- Workflow de GitHub Actions ID: 320261669

## PROMPT PARA UN NUEVO CHAT

Si abris un chat nuevo con un agente, pega esto:

---
Soy el dueño de la app Hogar Finanzas (https://github.com/danfs2704/hogar-finanzas).

Necesito que trabajes con mi repo. El repo ya esta clonado en `/home/z/my-project/hogar-finanzas/`.

**Stack**: Tauri v2 + Next.js 15 + Prisma + SQLite.
La app corre Node.js embebido en puerto 3456, el exe del instalador es NSIS.

**IMPORTANTE**:
- Responder SIEMPRE en español
- No soy programador, explicar todo simple
- Para pushear usá el token que te voy a dar
- Para firmar actualizaciones usá: `openssl dgst -sha256 -sign /home/z/my-project/hogar-finanzas/updater-private.pem`
- El workflow de build es el ID 320261669
- Leé el archivo HANDOFF.md del repo para contexto completo

[ACA PEGAR LO QUE NECESITES QUE HAGA]
---
