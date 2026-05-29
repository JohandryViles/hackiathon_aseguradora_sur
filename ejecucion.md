# Guia de ejecucion del proyecto

Este documento explica como preparar y levantar todo el prototipo de
FraudIA Claims en una maquina nueva. La idea es que un companero pueda ejecutar
frontend, Convex y FastAPI sin tener que reconstruir el flujo del proyecto.

## 1. Requisitos

Instalar antes de ejecutar:

- Node.js 20 o superior.
- Bun.
- Python 3.10 o superior.
- Git.
- Cuenta o acceso a Convex para el despliegue de desarrollo.

Comandos rapidos para validar:

```powershell
node --version
bun --version
python --version
git --version
```

## 2. Preparacion inicial

Abrir PowerShell en la carpeta raiz del proyecto:

```powershell
cd C:\ruta\al\proyecto\hackiathon_aseguradora_sur
```

Instalar dependencias JavaScript:

```powershell
bun install
```

Instalar dependencias Python dentro del proyecto, sin tocar el Python global:

```powershell
python -m pip install --target .python_deps -r requirements.txt
```

Crear el archivo de variables de entorno si todavia no existe:

```powershell
Copy-Item .env.example .env
```

Si el archivo `.env` ya existe, no lo sobrescribas. Solo revisa que tenga al
menos estas variables:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
VITE_API_URL=http://localhost:8000
AI_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## 3. Configurar Convex

La primera vez, iniciar Convex desde la raiz del proyecto:

```powershell
npx convex dev
```

Si Convex pide login o crear/configurar un deployment, seguir el asistente en
la terminal. Al terminar, Convex debe completar las variables:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
```

Para publicar funciones una sola vez y salir:

```powershell
npx convex dev --once
```

## 4. Configurar IA opcional

El proyecto funciona sin OpenAI porque tiene fallback local por reglas. Para
activar el agente con IA en FastAPI, completar en `.env`:

```text
AI_ENABLED=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Para activar OpenAI en Convex, guardar la llave como variable segura de Convex,
no como variable `VITE_`:

```powershell
npx convex env set OPENAI_API_KEY "sk-..."
npx convex env set OPENAI_MODEL "gpt-4.1-mini"
```

Si no se configura `OPENAI_API_KEY`, el dashboard y el agente siguen funcionando
con respuestas deterministicas locales.

## 5. Ejecutar todo de una sola vez

Desde la raiz del proyecto, ejecutar este bloque completo en PowerShell:

```powershell
$ROOT = (Get-Location).Path

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

if (!(Test-Path "node_modules")) {
  bun install
}

if (!(Test-Path ".python_deps")) {
  python -m pip install --target .python_deps -r requirements.txt
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT`"; npx convex dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT`"; `$env:PYTHONPATH='.python_deps;.'; python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$ROOT`"; bun run dev"
```

Este bloque abre tres terminales:

- Convex: backend y base de datos local/remota de desarrollo.
- FastAPI: API opcional de analisis en `http://localhost:8000`.
- Vite/React: aplicacion web en `http://localhost:3000`.

Cuando las tres terminales esten arriba, abrir:

```text
http://localhost:3000
```

Swagger de FastAPI:

```text
http://localhost:8000/docs
```

Health check de FastAPI:

```text
http://localhost:8000/health
```

## 6. Ejecucion manual por terminales separadas

Si el bloque anterior falla o prefieres ver cada servicio por separado, abrir
tres terminales en la raiz del proyecto.

Terminal 1 - Convex:

```powershell
npx convex dev
```

Terminal 2 - FastAPI:

```powershell
$env:PYTHONPATH=".python_deps;."
python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 3 - Frontend:

```powershell
bun run dev
```

## 7. Entrenar o regenerar datos del modelo

Esto no es obligatorio para la demo si ya existen los archivos en `data/` y
`models/`. Usarlo solo cuando se quiera regenerar el dataset sintetico y el
modelo:

```powershell
$env:PYTHONPATH=".python_deps;."
python ml/generate_synthetic_claims.py --rows 800 --seed 2026
python ml/train_fraud_model.py
```

Archivos generados:

```text
data/synthetic/claims_training.csv
data/processed/claims_scored.csv
models/fraud_model.joblib
models/model_metrics.json
```

## 8. Flujo sugerido para la demo

1. Abrir `http://localhost:3000`.
2. Entrar a `Importacion`.
3. Cargar los CSV de `data/import_ready/evento/` en este orden:

```text
01_siniestros_import.csv
02_polizas_import.csv
03_asegurados_import.csv
04_proveedores_import.csv
05_documentos_import.csv
```

4. Revisar el dashboard principal.
5. Abrir `Casos` para revisar todos los siniestros procesados.
6. Abrir `ML_AGENTE` para explicar el enfoque hibrido.
7. Probar preguntas al agente:

```text
10 casos de mayor riesgo
por que CLM-00001 fue marcado
proveedores con mas alertas
ciudades con mayor concentracion
documentos faltantes
resumen ejecutivo
```

8. Exportar CSV desde la interfaz si se necesita entregar reporte.

## 9. Pruebas y validaciones

Ejecutar pruebas de frontend:

```powershell
bun run test
```

Ejecutar pruebas Python:

```powershell
$env:PYTHONPATH=".python_deps;."
python -m pytest
```

Validar build de produccion:

```powershell
bun run build
```

Validar lint/formato:

```powershell
bun run lint
bun run check
```

Nota: `bun run check` puede pedir ajustes de formato segun finales de linea o
orden de imports. Para una demo local, lo minimo recomendable es que pasen:

```powershell
bun run test
python -m pytest
bun run build
```

## 10. Problemas comunes

### PowerShell no reconoce `bun`

Instalar Bun y cerrar/abrir PowerShell. Luego validar:

```powershell
bun --version
```

### Convex pide login

Ejecutar:

```powershell
npx convex dev
```

Seguir el enlace o instrucciones de la terminal. Despues revisar que `.env`
tenga `CONVEX_DEPLOYMENT` y `VITE_CONVEX_URL`.

### El frontend abre pero no hay datos

Verificar que `npx convex dev` siga corriendo. Luego importar los CSV desde
`data/import_ready/evento/`.

### La IA no responde con OpenAI

El sistema puede responder con fallback local. Para usar OpenAI, verificar:

```text
OPENAI_API_KEY=
AI_ENABLED=true
```

Y si se usa Convex para el agente:

```powershell
npx convex env set OPENAI_API_KEY "sk-..."
```

### FastAPI no encuentra modulos de Python

Ejecutar FastAPI con `PYTHONPATH` apuntando a `.python_deps`:

```powershell
$env:PYTHONPATH=".python_deps;."
python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000
```

### El puerto 3000 u 8000 esta ocupado

Cerrar procesos anteriores o cambiar puertos:

```powershell
bun run dev -- --port 3001
python -m uvicorn src.app.main:app --reload --port 8001
```

Si cambias FastAPI a `8001`, tambien actualizar `.env`:

```text
VITE_API_URL=http://localhost:8001
```

## 11. Resumen de comandos principales

```powershell
bun install
python -m pip install --target .python_deps -r requirements.txt
npx convex dev
$env:PYTHONPATH=".python_deps;."; python -m uvicorn src.app.main:app --reload
bun run dev
bun run test
python -m pytest
bun run build
```
