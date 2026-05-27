# FraudIA Claims - Reto Aseguradora del Sur

Prototipo funcional para detectar posibles fraudes en siniestros usando un
enfoque hibrido:

- modelo supervisado con scikit-learn,
- reglas de negocio explicables,
- dashboard web para analistas,
- agente de consultas en lenguaje natural basado en intenciones,
- datos sinteticos anonimizados para demo.

La solucion genera alertas de revision humana. No acusa fraude, no rechaza
siniestros y no toma decisiones automaticas de pago.

## Stack

- Frontend: React, TanStack Start, TanStack Router, Tailwind CSS.
- Backend/demo data: Convex.
- Modelo IA: Python, pandas, scikit-learn, RandomForestClassifier.
- Persistencia del modelo: joblib.

## Estructura principal

```text
convex/                  Funciones, schema y scoring hibrido
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

- precision: 0.9306
- recall: 0.9853
- F1-score: 0.9571
- ROC-AUC: 0.9980

Estas metricas son de una etiqueta simulada y deben validarse con datos
historicos reales antes de uso productivo.

## Ejecutar la aplicacion

Configurar variables en `.env` o `.env.local`:

```text
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
```

Levantar Convex y la app:

```bash
bunx --bun convex dev
bun --bun run dev
```

La app corre en:

```text
http://localhost:3000
```

## Demo sugerida

1. Abrir el dashboard.
2. Click en `Regenerar demo` para cargar siniestros, polizas, asegurados,
   vehiculos, proveedores y documentos sinteticos.
3. Revisar la bandeja de casos priorizados.
4. Filtrar por riesgo rojo.
5. Preguntar al agente:
   - `10 casos de mayor riesgo`
   - `por que CLM-00001 fue marcado`
   - `proveedores con mas alertas`
   - `ciudades con mayor concentracion`
   - `documentos faltantes en casos criticos`
6. Exportar el reporte CSV.

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
bun --bun run dev
bun --bun run build
bun --bun run test
bun --bun run check
python ml/generate_synthetic_claims.py
python ml/train_fraud_model.py
```
