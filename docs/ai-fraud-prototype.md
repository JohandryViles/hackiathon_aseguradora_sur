# Prototipo funcional IA para analisis de siniestros

## Objetivo

Este prototipo implementa un flujo de analitica explicable para apoyar a analistas de seguros en:

- deteccion de patrones atipicos o posibles senales de fraude,
- asignacion de score de riesgo por siniestro,
- clasificacion operativa en verde, amarillo y rojo,
- consulta guiada en lenguaje natural para priorizacion.

## Fuente de datos

- **Tabla principal:** `claims` en Convex.
- **Carga de datos:** `seedSyntheticData` genera 120 siniestros sinteticos reproducibles.
- **Carga de datos publicos:** `importPublicClaims` permite importar lotes JSON/CSV (parseados desde la UI) y etiquetarlos por `sourceDataset`.
- **Atributos incluidos:** monto reclamado, dano estimado, historial del cliente, tiempo desde inicio de poliza, canal, tipo de siniestro, region, antiguedad del vehiculo y narrativa corta.

## Modelo de riesgo hibrido

El prototipo ahora incluye un modelo supervisado entrenado con scikit-learn:

- script de generacion: `ml/generate_synthetic_claims.py`,
- script de entrenamiento: `ml/train_fraud_model.py`,
- dataset: `data/synthetic/claims_training.csv`,
- modelo serializado: `models/fraud_model.joblib`,
- metricas: `models/model_metrics.json`,
- predicciones: `data/processed/claims_scored.csv`.

El score final combina 55% modelo ML y 45% reglas explicables. Si un registro
importado no trae score ML, el sistema usa solo reglas.

## Reglas explicables

La evaluacion se hace por reglas con puntaje acumulado y tope [0, 100]:

1. Ratio monto reclamado vs dano estimado (inflado).
2. Frecuencia de siniestros recientes.
3. Siniestro temprano despues de activar poliza.
4. Reporte nocturno por call center.
5. Monto alto en vehiculo antiguo.
6. Tipo de siniestro hurto.
7. Multiples casos para el mismo cliente.
8. Monto atipico respecto al percentil 90.

Cada regla activada se devuelve como **alerta explicable** en `anomalyFlags`.

## Clasificacion

- **Verde:** score < 40
- **Amarillo:** score entre 40 y 69
- **Rojo:** score >= 70

## Consultas en lenguaje natural

`askAnalystAssistant` interpreta consultas por intencion:

- riesgo alto/rojo/fraude,
- riesgo amarillo o verde,
- patrones anomales,
- montos altos,
- busqueda por cliente (`CUST-xxx`).

No usa un LLM externo: es una capa de interpretacion por reglas para mantener trazabilidad.

## Interfaz (dashboard)

La ruta principal incluye:

- carga de datos sinteticos,
- filtros por nivel de riesgo y busqueda textual,
- resumen de metricas y top anomalias,
- tabla de casos con score y alertas,
- panel de consultas en lenguaje natural.

## Limitaciones

1. Datos sinteticos, no validados contra historicos reales.
2. La etiqueta de fraude es simulada y debe validarse con historicos reales.
3. Umbrales estaticos, no calibrados por negocio por linea de producto.
4. NLP basado en intenciones simples; no entiende preguntas complejas.
5. No reemplaza decision humana: sirve para priorizacion y apoyo.

## Proximos pasos recomendados

1. Incorporar datos historicos etiquetados (fraude/no fraude).
2. Calibrar umbrales con precision/recall y costo operacional.
3. Agregar feedback de analistas para mejora continua.
4. Evolucionar a modelo hibrido: reglas + modelo supervisado.
5. Medir drift por region, canal, tipo de siniestro y temporada.
