# Guía de inicio local

## Requisitos

- Windows y PowerShell.
- Python 3.12 o 3.13.
- PostgreSQL 16 y acceso a psql o pgAdmin.
- Un navegador web.

Los comandos usan Python 3.13. Si tienes Python 3.12, sustituye py -3.13 por py -3.12.

## 1. Preparar la base de datos

Crea una base vacía llamada wuf_predict_db. Desde la raíz del repositorio, ejecuta el esquema final una sola vez:

    psql -U postgres -d wuf_predict_db -f .\backend\schema_wuf_predict_db_final.sql

También puedes abrir backend/schema_wuf_predict_db_final.sql en el Query Tool de pgAdmin, conectado a wuf_predict_db. El archivo crea las tablas, pero no crea la base de datos. No lo ejecutes sobre una base que ya tenga datos.

## 2. Configurar e iniciar el backend

Desde la raíz del repositorio, copia la plantilla de configuración si todavía no existe backend/.env:

    Copy-Item .\backend\.env.example .\backend\.env

Edita backend/.env: configura DATABASE_URL con el usuario, contraseña y nombre de tu PostgreSQL. Cambia JWT_SECRET por un secreto aleatorio de al menos 32 caracteres. Puedes generarlo con:

    python -c "import secrets; print(secrets.token_urlsafe(48))"

En una terminal, ejecuta:

    cd .\backend
    py -3.13 -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install --upgrade pip
    python -m pip install -e .
    python -m scripts.create_user
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Activar .venv hace que python y pip usen las dependencias instaladas en ese entorno; por eso se activa antes de instalarlas. Si PowerShell bloquea Activate.ps1, ejecuta esto en esa misma terminal y vuelve a activar el entorno:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    .\.venv\Scripts\Activate.ps1

El cambio de política dura solo mientras esa terminal permanezca abierta. Si no quieres activar el entorno, puedes ejecutar cada comando con .\.venv\Scripts\python.exe en lugar de python. El comando para crear el usuario solicita nombre, correo, rol (analista, marketing o ayuda) y contraseña. No hay una cuenta predeterminada. Deja esta terminal abierta mientras uses el sistema. Comprueba la API en <http://127.0.0.1:8000/healthz>; debe responder {"status":"ok"}.

## 3. Configurar e iniciar el frontend

En otra terminal, desde la raíz del repositorio, copia la configuración del frontend si todavía no existe frontend/public/config.js:

    Copy-Item .\frontend\public\config.js.example .\frontend\public\config.js

La URL de API predeterminada es http://127.0.0.1:8000/api/v1. Si config.js ya existe, no lo sobrescribas; revisa que apiBaseUrl apunte a la API local.

    cd .\frontend
    py -m http.server 5500 --bind 127.0.0.1

Deja esta terminal abierta y abre <http://127.0.0.1:5500>. El servidor debe iniciarse desde frontend/ para servir tanto index.html como las carpetas src/ y public/.

## Datos de ejemplo

Las capturas CSV de prueba están en data/capturas/. Se importan desde la sección Recolección de la aplicación.

## Orden de inicio y cierre

Inicia PostgreSQL, luego el backend y finalmente el frontend. Para cerrar el entorno, detén los servidores con Ctrl+C; la base de datos conserva sus datos.

El backend consulta la configuración de backend/.env al iniciarse. Si cambias esa configuración, reinicia el backend.
