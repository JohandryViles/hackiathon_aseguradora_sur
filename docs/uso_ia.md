# Uso de Inteligencia Artificial

## Enfoque

La solucion usa un enfoque hibrido:

1. Modelo supervisado con scikit-learn.
2. Reglas explicables del negocio asegurador.
3. Analisis textual simple mediante similitud narrativa simulada.
4. Agente local por intenciones.
5. Agente de IA generativa opcional mediante OpenAI desde Convex.

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

Interpretacion rapida:

- 127 negativos correctamente clasificados.
- 5 falsos positivos.
- 1 falso negativo.
- 67 positivos correctamente clasificados.

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

## Score hibrido

El score final se calcula en Convex:

```text
score_final = 0.55 * score_ml + 0.45 * score_reglas
```

Si un siniestro importado no trae `mlRiskScore` o `fraud_probability`, Convex
usa el score de reglas.

Semaforo:

| Rango | Nivel | Accion |
| --- | --- | --- |
| 0-40 | Verde Bajo | Continuar flujo normal |
| 41-75 | Amarillo Medio | Revision documental |
| 76-100 | Rojo Alto | Revision especializada antifraude |

## Agente de consultas

El proyecto tiene dos capas:

1. `askAnalystAssistant`: query local basada en intenciones y datos de Convex.
2. `askAnalystAssistantWithLLM`: action que usa OpenAI si existe
   `OPENAI_API_KEY`.

El frontend usa la action con LLM. Si no hay API key configurada, la action
devuelve automaticamente la respuesta local por reglas.

Consultas soportadas:

- 10 siniestros con mayor riesgo.
- Por que un siniestro fue marcado.
- Proveedores con mas alertas.
- Ciudades con mayor concentracion.
- Ramos o coberturas con mas alertas.
- Documentos faltantes o inconsistentes.
- Casos cercanos a inicio o fin de vigencia.
- Resumen ejecutivo de casos criticos.

## Configuracion OpenAI

La key debe vivir en Convex, no en React:

```bash
npx convex env set OPENAI_API_KEY "sk-..."
npx convex env set OPENAI_MODEL "gpt-4.1-mini"
```

System message opcional:

```bash
npx convex env set OPENAI_SYSTEM_MESSAGE "Eres un analista antifraude de seguros..."
```

System message por defecto:

```text
Eres un analista antifraude de seguros para Aseguradora del Sur. Responde en espanol, de forma clara y breve. Usa solo los datos entregados en el contexto. No acuses fraude como hecho confirmado; habla de posibles alertas, riesgo y pasos de revision humana. Devuelve recomendaciones accionables para el analista.
```

## Trazabilidad

Cada caso muestra:

- score de IA,
- score de reglas,
- score final,
- nivel de riesgo,
- alertas activadas,
- accion recomendada.

La respuesta del agente muestra si uso IA generativa o fallback local.
