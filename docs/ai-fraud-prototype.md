# Prototipo funcional IA para analisis de siniestros

## Objetivo

Este prototipo implementa un flujo de analitica explicable para apoyar a
analistas de seguros en:

- deteccion de patrones atipicos o posibles senales de fraude,
- asignacion de score de riesgo por siniestro,
- clasificacion operativa en verde, amarillo y rojo,
- consulta guiada en lenguaje natural,
- importacion de datos por tabla desde CSV/JSON.

## Fuente de datos

- **Tabla principal:** `claims` en Convex.
- **Tablas relacionadas:** `policies`, `insureds`, `vehicles`, `providers`,
  `claimDocuments`.
- **Carga desde UI:** `/importacion_csv` permite cargar CSV/JSON por tabla.
- **Carga sintetica backend:** `seedSyntheticData` sigue disponible para demos
  internas o pruebas desde Convex.
- **Atributos incluidos:** monto reclamado, dano estimado, historial del
  cliente, tiempo desde inicio/fin de poliza, canal, tipo de siniestro, region,
  documentos, proveedor y narrativa corta.

## Modelo de riesgo hibrido

El prototipo incluye un modelo supervisado entrenado con scikit-learn:

- script de generacion: `ml/generate_synthetic_claims.py`,
- script de entrenamiento: `ml/train_fraud_model.py`,
- dataset: `data/synthetic/claims_training.csv`,
- modelo serializado: `models/fraud_model.joblib`,
- metricas: `models/model_metrics.json`,
- predicciones: `data/processed/claims_scored.csv`.

El score final combina 55% modelo ML y 45% reglas explicables. Si un registro
importado no trae score ML, el sistema usa solo reglas.

## Reglas explicables

La evaluacion se hace por reglas con puntaje acumulado y tope [0, 100].
Algunas senales implementadas:

1. Ratio monto reclamado vs dano estimado.
2. Frecuencia de siniestros recientes.
3. Siniestro cerca del inicio o fin de vigencia.
4. Reporte tardio o demora en denuncia de robo.
5. Proveedor recurrente o en lista restrictiva simulada.
6. Documentos incompletos o inconsistentes.
7. Narrativa similar a otros reclamos.
8. Monto cercano a suma asegurada.
9. Reporte nocturno por call center.
10. Monto alto en vehiculo antiguo.

Cada regla activada se devuelve como alerta explicable en `anomalyFlags`.

## Clasificacion

- **Verde Bajo:** score 0-40
- **Amarillo Medio:** score 41-75
- **Rojo Alto:** score 76-100

## Consultas en lenguaje natural

El sistema tiene dos niveles:

- `askAnalystAssistant`: interpretacion local por intenciones.
- `askAnalystAssistantWithLLM`: action con OpenAI si `OPENAI_API_KEY` esta
  configurada.

Si OpenAI no esta configurado o responde con error, la action devuelve el
resultado local para que la demo siga funcionando.

## Interfaz

Rutas principales:

- `/`: dashboard con resumen, semaforo, prioridades y agente.
- `/importacion_csv`: importacion CSV/JSON y descarga de plantillas.
- `/casos`: bandeja completa de casos procesados.
- `/ML_AGENTE`: explicacion del enfoque ML + reglas + agente.

## Limitaciones

1. Datos sinteticos, no validados contra historicos reales.
2. La etiqueta de fraude es simulada y debe validarse con historicos reales.
3. Umbrales estaticos, no calibrados por negocio por linea de producto.
4. La similitud narrativa aun es simulada.
5. El LLM ayuda a explicar y sintetizar, pero no decide ni acusa fraude.
6. No reemplaza decision humana: sirve para priorizacion y apoyo.

## Proximos pasos recomendados

1. Incorporar datos historicos etiquetados.
2. Calibrar umbrales con precision/recall y costo operacional.
3. Agregar feedback de analistas para mejora continua.
4. Calcular similitud real con embeddings o TF-IDF/cosine similarity.
5. Versionar modelos, prompts y evaluaciones.
