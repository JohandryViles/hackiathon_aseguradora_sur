# Uso de Inteligencia Artificial

## Enfoque

La solucion usa un enfoque hibrido:

1. Modelo supervisado con scikit-learn.
2. Reglas explicables del negocio asegurador.
3. Analisis textual simple mediante similitud narrativa simulada.
4. Agente de consultas en lenguaje natural por intenciones.

## Modelo supervisado

Archivo principal:

```text
ml/train_fraud_model.py
```

Modelo:

```text
RandomForestClassifier
```

Entrada:

```text
data/synthetic/claims_training.csv
```

Salida:

```text
models/fraud_model.joblib
models/model_metrics.json
data/processed/claims_scored.csv
```

## Variable objetivo

La columna objetivo es:

```text
fraud_label
```

Es una etiqueta simulada 0/1, generada para entrenamiento y evaluacion del
prototipo. No representa fraude real.

## Metricas actuales

Dataset sintetico de 800 filas:

| Metrica | Valor |
| --- | ---: |
| Accuracy | 0.9700 |
| Precision | 0.9306 |
| Recall | 0.9853 |
| F1-score | 0.9571 |
| ROC-AUC | 0.9980 |

Matriz de confusion:

```text
[[127, 5],
 [1, 67]]
```

## Variables importantes

Segun `models/model_metrics.json`, las variables mas relevantes incluyen:

- `paid_amount`
- `narrative_similarity_max`
- `days_since_policy_start`
- `provider_observed_cases`
- `claim_status_Reserva`
- `incidents_last_18_months`
- `customer_score_simulated`
- `documents_inconsistent`
- `provider_watchlist`
- `days_between_occurrence_report`

## Agente de consultas

El agente responde preguntas como:

- 10 siniestros con mayor riesgo.
- Por que un siniestro fue marcado.
- Proveedores con mas alertas.
- Ciudades con mayor concentracion.
- Ramos o coberturas con mas alertas.
- Documentos faltantes o inconsistentes.
- Casos cercanos a inicio o fin de vigencia.
- Resumen ejecutivo de casos criticos.

No usa un LLM externo en esta version para mantener la demo reproducible. La
capa de lenguaje natural se implementa por intenciones y respuestas basadas en
datos.

## Trazabilidad

Cada caso muestra:

- score de IA,
- score de reglas,
- score final,
- nivel de riesgo,
- alertas activadas,
- accion recomendada.
