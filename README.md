# FraudIA Claims - Reto Aseguradora del Sur

Prototipo funcional para detectar y priorizar posibles alertas de fraude en
siniestros usando un enfoque hibrido:

- modelo supervisado con scikit-learn,
- reglas de negocio explicables,
- dashboard web para analistas,
- importacion CSV/JSON por tabla,
- agente de consultas en lenguaje natural con IA generativa opcional,
- datos sinteticos anonimizados para demo.

La solucion genera alertas para revision humana. No acusa fraude, no rechaza
siniestros y no toma decisiones automaticas de pago.

## Stack

- Frontend: React, TanStack Start, TanStack Router, Tailwind CSS.
- Backend y persistencia: Convex.
- Modelo ML: Python, pandas, scikit-learn, RandomForestClassifier.
- Persistencia del modelo: joblib.
- Agente IA: Convex action con OpenAI opcional y fallback local por reglas.

## Estructura principal

```text
convex/                  Funciones, schema, scoring hibrido e IA
data/synthetic/          Dataset sintetico de entrenamiento
data/processed/          Dataset puntuado por el modelo
docs/                    Arquitectura, datos, reglas, IA y limitaciones
ml/                      Generacion de datos y entrenamiento scikit-learn
models/                  Modelo joblib y metricas JSON
presentation/            Guion ejecutivo para pitch
sql/                     DDL relacional de referencia
src/                     Aplicacion web
```

## Instalacion

```bash
bun install
python -m pip install -r requirements.txt
```

Si se quiere instalar Python dentro del workspace sin tocar el entorno global:

```bash
python -m pip install --target .python_deps -r requirements.txt
```

Los scripts Python detectan automaticamente `.python_deps`.

## Entrenar el modelo

```bash
python ml/generate_synthetic_claims.py --rows 800 --seed 2026
python ml/train_fraud_model.py
```

Salidas generadas:

- `data/synthetic/claims_training.csv`
- `data/processed/claims_scored.csv`
- `models/fraud_model.joblib`
- `models/model_metrics.json`

Metricas actuales con dataset sintetico:

- accuracy: 0.9700
- precision: 0.9306
- recall: 0.9853
- F1-score: 0.9571
- ROC-AUC: 0.9980
- matriz de confusion: `[[127, 5], [1, 67]]`

Estas metricas son de una etiqueta simulada y deben validarse con datos
historicos reales antes de uso productivo.

## Configurar Convex

Configurar variables en `.env` o `.env.local`:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
```

Levantar o publicar funciones Convex:

```bash
npx convex dev
```

Para publicar una vez y salir:

```bash
npx convex dev --once
```

## Configurar OpenAI para el agente

La API key no debe ir en React ni en variables `VITE_`. Debe configurarse como
variable segura de Convex:

```bash
npx convex env set OPENAI_API_KEY "sk-..."
npx convex env set OPENAI_MODEL "gpt-4.1-mini"
```

Opcionalmente se puede ajustar el system message:

```bash
npx convex env set OPENAI_SYSTEM_MESSAGE "Eres un analista antifraude de seguros..."
```

Si `OPENAI_API_KEY` no esta configurada, el dashboard sigue funcionando con el
agente local basado en reglas e intenciones.

## Ejecutar la aplicacion

En una terminal:

```bash
npx convex dev
```

En otra terminal:

```bash
bun run dev
```

La app corre en:

```text
http://localhost:3000
```

## Rutas principales

- `/`: dashboard principal.
- `/importacion_csv`: carga CSV/JSON por tabla.
- `/casos`: todos los casos procesados con filtro y exportacion.
- `/ML_AGENTE`: explicacion del enfoque ML + agente.

## Importacion de datos

La pantalla `/importacion_csv` permite cargar:

- Siniestros -> `claims`
- Polizas -> `policies`
- Asegurados -> `insureds`
- Beneficiarios -> `providers`
- Documentos -> `claimDocuments`

Cada importador valida campos minimos, omite filas invalidas, evita duplicados y
devuelve:

- `inserted`
- `skipped`
- `totalReceived`
- `errors`
- `message`

Tambien se pueden descargar plantillas CSV desde la interfaz.

## Demo sugerida

1. Ejecutar `npx convex dev`.
2. Ejecutar `bun run dev`.
3. Abrir `http://localhost:3000`.
4. Entrar a `Importacion`.
5. Cargar CSV/JSON de siniestros, polizas, asegurados, beneficiarios y documentos.
6. Revisar el dashboard principal: resumen, semaforo y ultimos casos por revisar.
7. Abrir `Casos` para ver todos los casos procesados.
8. Preguntar al agente:
   - `10 casos de mayor riesgo`
   - `por que CLM-00001 fue marcado`
   - `proveedores con mas alertas`
   - `ciudades con mayor concentracion`
   - `documentos faltantes`
   - `resumen ejecutivo`
9. Exportar el reporte CSV.

## Entregables cubiertos

- Prototipo funcional: dashboard web.
- Codigo fuente: este repositorio.
- Dataset: `data/synthetic/claims_training.csv`.
- Modelo entrenado: `models/fraud_model.joblib`.
- Metricas: `models/model_metrics.json`.
- Modelo de datos: `docs/modelo_datos.md`.
- Arquitectura: `docs/arquitectura.md`.
- Reglas de negocio: `docs/reglas_negocio.md`.
- Uso de IA: `docs/uso_ia.md`.
- Limitaciones y etica: `docs/limitaciones.md`.
- Pitch: `presentation/pitch_outline.md`.
- SQL de referencia: `sql/oracle_schema.sql`.

## Scripts utiles

```bash
bun run dev
bun run build
bun run test
bun run lint
bun run check
python ml/generate_synthetic_claims.py
python ml/train_fraud_model.py
```

Nota: `bun run check` puede fallar si los archivos estan con finales CRLF o si
Biome necesita ordenar imports/formato. `bun run lint`, `bun run test`,
`bunx --bun tsc --noEmit` y `bun run build` pasan en el estado actual.
