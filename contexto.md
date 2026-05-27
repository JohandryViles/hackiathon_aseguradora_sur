# Contexto del proyecto

## Proyecto

Nombre del repo: `hackiathon_aseguradora_sur`

Objetivo: construir un prototipo funcional para el reto de Aseguradora del Sur:
detectar posibles fraudes en siniestros usando Inteligencia Artificial.

Principio clave del reto: la solucion debe generar alertas para revision humana,
no acusaciones automaticas de fraude ni rechazos automaticos de siniestros.

## Reto solicitado

El PDF del reto pide un detector de posibles fraudes en siniestros con:

- carga de datos sinteticos o publicos,
- datos de siniestros, polizas, asegurados, vehiculos, proveedores y documentos,
- score de riesgo por siniestro,
- clasificacion verde, amarillo y rojo,
- alertas explicables,
- modelo de IA, idealmente con scikit-learn,
- consultas en lenguaje natural,
- dashboard o interfaz funcional,
- documentacion,
- dataset,
- codigo fuente,
- arquitectura,
- modelo de datos,
- reglas de negocio,
- demo y presentacion ejecutiva.

## Estado original encontrado

El proyecto ya tenia:

- React + TanStack Start + Vite.
- Convex como backend.
- Dashboard en `src/routes/index.tsx`.
- Tabla `claims` en Convex.
- Carga de datos sinteticos.
- Importacion JSON/CSV.
- Score por reglas.
- Semaforo verde/amarillo/rojo.
- Consultas simples en lenguaje natural.
- Documento `docs/ai-fraud-prototype.md`.

Limitaciones iniciales:

- no tenia modelo entrenado con scikit-learn,
- no tenia dataset versionado en `data/`,
- no tenia `models/fraud_model.joblib`,
- no tenia metricas del modelo,
- tenia reglas, pero no ML real,
- modelo de datos reducido solo a `claims`,
- faltaban tablas complementarias,
- faltaban docs formales del reto,
- README era de plantilla TanStack,
- habia restos de plantilla,
- no habia tests,
- `bun --bun run test` fallaba por no encontrar tests,
- `bunx --bun tsc --noEmit` fallaba por tipos derivados de `api as any`.

## Cambios implementados

Se amplio el proyecto para alinearlo mejor con el reto.

### 1. Dataset sintetico

Se agrego:

```text
ml/generate_synthetic_claims.py
data/synthetic/claims_training.csv
```

El dataset tiene 800 filas mas header.

Incluye variables como:

- `claim_id`
- `policy_id`
- `insured_id`
- `vehicle_id`
- `driver_id`
- `provider_id`
- `line_of_business`
- `coverage`
- `claim_type`
- `channel`
- `city`
- `branch`
- `vehicle_year`
- `claim_amount`
- `estimated_damage_amount`
- `sum_insured`
- `incidents_last_12_months`
- `incidents_last_18_months`
- `vehicle_incidents_last_18_months`
- `driver_incidents_last_18_months`
- `days_since_policy_start`
- `days_until_policy_end`
- `days_between_occurrence_report`
- `documents_complete`
- `missing_critical_document`
- `documents_inconsistent`
- `provider_observed_cases`
- `provider_watchlist`
- `narrative_similarity_max`
- `fraud_label`

La columna objetivo para entrenar el modelo es:

```text
fraud_label
```

Es una etiqueta simulada 0/1, no fraude real.

### 2. Modelo scikit-learn

Se agrego:

```text
ml/train_fraud_model.py
models/fraud_model.joblib
models/model_metrics.json
data/processed/claims_scored.csv
```

Modelo usado:

```text
RandomForestClassifier
```

Pipeline:

- imputacion de valores numericos,
- escalado numerico,
- imputacion de categoricas,
- one-hot encoding,
- Random Forest balanceado.

El modelo genera:

- `fraud_probability`
- `ml_risk_score`
- `model_version`

Version actual:

```text
sklearn-random-forest-v1
```

### 3. Metricas actuales del modelo

Archivo:

```text
models/model_metrics.json
```

Metricas actuales:

```text
accuracy: 0.9700
precision: 0.9306
recall: 0.9853
f1: 0.9571
rocAuc: 0.9980
```

Matriz de confusion:

```text
[[127, 5],
 [1, 67]]
```

Nota: las metricas son sobre datos sinteticos. Se deben validar con historicos
anonimizados antes de uso productivo.

### 4. Backend Convex ampliado

Archivos principales:

```text
convex/schema.ts
convex/claims.ts
```

Se agregaron campos opcionales en `claims` para no romper datos existentes.

Se agregaron tablas:

```text
policies
insureds
vehicles
providers
claimDocuments
```

El seed ahora genera 160 siniestros demo y tablas complementarias.

Funciones principales:

- `seedSyntheticData`
- `listWithRisk`
- `importPublicClaims`
- `getSummary`
- `askAnalystAssistant`

### 5. Score hibrido

El score final ahora combina:

```text
55% score ML + 45% score por reglas
```

Si un registro importado no trae score ML, se calcula con reglas.

Rangos:

```text
0-40: verde
41-75: amarillo
76-100: rojo
```

### 6. Reglas explicables implementadas

El backend evalua senales como:

- monto reclamado superior al estimado,
- alta frecuencia de reclamos del asegurado,
- multiples siniestros por vehiculo,
- multiples siniestros por conductor,
- reclamos solo RC recurrentes,
- siniestro cerca del inicio de vigencia,
- siniestro cerca del fin de vigencia,
- demora en denuncia de robo,
- reporte tardio,
- proveedor recurrente,
- proveedor en lista restrictiva simulada,
- documentos incompletos,
- documentos inconsistentes,
- dinamica sospechosa,
- tercero no identificado,
- narrativa similar,
- monto cercano a suma asegurada,
- reporte nocturno por call center,
- monto alto para vehiculo antiguo,
- cobertura de robo.

### 7. Dashboard actualizado

Archivo:

```text
src/routes/index.tsx
```

Ahora muestra:

- total de siniestros,
- score promedio,
- score ML promedio,
- ahorro simulado,
- casos rojos,
- casos amarillos,
- documentos criticos faltantes,
- version del modelo,
- conteo de polizas, proveedores y documentos,
- ranking de proveedores,
- ranking de ciudades,
- ranking de coberturas,
- tabla con score IA, score reglas y score final,
- filtro por riesgo,
- busqueda,
- importacion JSON/CSV,
- exportacion CSV del reporte,
- agente de analisis.

Tambien se corrigio un error en runtime:

```text
Cannot read properties of undefined (reading 'policies')
```

Causa: `summary.dataModelCounts` podia venir indefinido si Convex/cliente aun
respondia con forma anterior.

Correccion: se usan accesos seguros:

```ts
summary?.dataModelCounts?.policies ?? 0
```

### 8. Agente de consultas

El agente responde preguntas como:

- `10 casos de mayor riesgo`
- `por que CLM-00001 fue marcado`
- `proveedores con mas alertas`
- `ciudades con mayor concentracion`
- `ramos o coberturas con mas alertas`
- `documentos faltantes`
- `casos cerca del inicio de poliza`
- `resumen ejecutivo`
- `cliente CUST-401`
- `montos altos`

No usa LLM externo. Es por intenciones y datos internos para mantener demo
reproducible.

### 9. Importacion

Se movio el parser a:

```text
src/lib/importPayload.ts
```

Se agrego test:

```text
src/lib/importPayload.test.ts
```

Soporta:

- JSON,
- CSV con comillas y separadores simples.

### 10. Documentacion agregada

Archivos:

```text
README.md
docs/arquitectura.md
docs/modelo_datos.md
docs/reglas_negocio.md
docs/uso_ia.md
docs/limitaciones.md
docs/ai-fraud-prototype.md
presentation/pitch_outline.md
sql/oracle_schema.sql
```

Contenido:

- instrucciones de instalacion,
- entrenamiento del modelo,
- ejecucion de la app,
- demo sugerida,
- arquitectura,
- modelo de datos,
- reglas de negocio,
- uso de IA,
- metricas,
- limitaciones,
- etica,
- privacidad,
- guion de pitch,
- DDL SQL de referencia.

### 11. SQL de referencia

Archivo:

```text
sql/oracle_schema.sql
```

Incluye tablas relacionales de referencia:

- `insureds`
- `vehicles`
- `policies`
- `providers`
- `claims`
- `claim_documents`

Sirve para explicar una futura implementacion en Oracle/PostgreSQL.

## Archivos importantes

### Frontend

```text
src/routes/index.tsx
src/routes/__root.tsx
src/router.tsx
src/integrations/convex/provider.tsx
src/lib/importPayload.ts
src/lib/importPayload.test.ts
```

### Backend Convex

```text
convex/schema.ts
convex/claims.ts
convex/todos.ts
```

Nota: `convex/todos.ts` sigue siendo resto de plantilla/demo. No es parte del
flujo principal.

### ML

```text
ml/generate_synthetic_claims.py
ml/train_fraud_model.py
data/synthetic/claims_training.csv
data/processed/claims_scored.csv
models/fraud_model.joblib
models/model_metrics.json
```

### Docs

```text
README.md
docs/arquitectura.md
docs/modelo_datos.md
docs/reglas_negocio.md
docs/uso_ia.md
docs/limitaciones.md
presentation/pitch_outline.md
sql/oracle_schema.sql
```

## Comandos utiles

Instalar JS:

```bash
bun install
```

Instalar Python global:

```bash
python -m pip install -r requirements.txt
```

Instalar Python en carpeta local del repo:

```bash
python -m pip install --target .python_deps -r requirements.txt
```

Generar dataset:

```bash
python ml/generate_synthetic_claims.py --rows 800 --seed 2026
```

Entrenar modelo:

```bash
python ml/train_fraud_model.py
```

Levantar app:

```bash
bun --bun run dev
```

Convex:

```bash
bunx --bun convex dev
```

Build:

```bash
bun --bun run build
```

Tests:

```bash
bun --bun run test
```

Check:

```bash
bun --bun run check
```

Typecheck:

```bash
bunx --bun tsc --noEmit
```

## Validaciones realizadas

Pasaron:

```text
bun --bun run check
bun --bun run test
bunx --bun tsc --noEmit
bun --bun run build
```

Tambien se hizo verificacion HTTP local:

```text
http://localhost:3000
StatusCode: 200
```

## Dependencias Python

Archivo:

```text
requirements.txt
```

Contenido:

```text
numpy
pandas
scikit-learn
joblib
```

Durante el trabajo se instalo scikit-learn y joblib en:

```text
.python_deps
```

La carpeta esta en `.gitignore`.

## Variables de entorno

Archivo de ejemplo:

```text
.env.example
```

Variables:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
```

El archivo `.env` existe localmente pero esta ignorado por git.

## Demo recomendada

1. Ejecutar Convex:

```bash
bunx --bun convex dev
```

2. Ejecutar la app:

```bash
bun --bun run dev
```

3. Abrir:

```text
http://localhost:3000
```

4. Click en `Regenerar demo`.

5. Mostrar:

- metricas,
- score ML,
- score reglas,
- score final,
- rankings,
- casos rojos,
- explicaciones.

6. Preguntar al agente:

```text
10 casos de mayor riesgo
por que CLM-00001 fue marcado
proveedores con mas alertas
ciudades con mayor concentracion
documentos faltantes
resumen ejecutivo
```

7. Exportar reporte CSV.

## Puntos fuertes actuales

- Ya hay modelo scikit-learn entrenado.
- Ya hay dataset sintetico versionado.
- Ya hay metricas.
- Ya hay dashboard funcional.
- Ya hay score hibrido.
- Ya hay reglas explicables.
- Ya hay agente de consultas.
- Ya hay docs de arquitectura, datos, reglas, IA y limitaciones.
- Ya hay SQL de referencia.
- Ya pasan build, tests, check y typecheck.

## Pendientes recomendados

Para mejorar aun mas antes de presentar:

1. Correr `bunx --bun convex dev` para regenerar tipos de Convex si hace falta.
2. Cargar demo con `Regenerar demo`.
3. Revisar visualmente el dashboard completo.
4. Si el jurado insiste en NLP real, agregar TF-IDF/cosine similarity para
   narrativas.
5. Si el jurado insiste en API Python, exponer el modelo con FastAPI.
6. Quitar o ignorar `convex/todos.ts` si se quiere limpiar restos de plantilla.
7. Preparar una presentacion PDF final basada en `presentation/pitch_outline.md`.

## Mensaje corto para explicar al jurado

FraudIA Claims es un prototipo funcional que prioriza siniestros con un score
hibrido. Entrenamos un Random Forest con scikit-learn sobre datos sinteticos
anonimizados, generamos probabilidad de posible fraude y la combinamos con
reglas explicables del negocio asegurador. El dashboard permite revisar casos,
entender las alertas, consultar por lenguaje natural y exportar reportes. La
solucion no acusa fraude ni rechaza automaticamente; solo ayuda a que el
analista humano revise primero los casos de mayor riesgo.
