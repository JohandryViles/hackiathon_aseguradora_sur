# Reglas de negocio

Las reglas generan senales explicables para el analista. No son acusaciones,
solo alertas para priorizar revision.

## Reglas implementadas

| Senal | Criterio | Efecto |
| --- | --- | --- |
| Monto inflado | Monto reclamado muy superior al estimado | Sube score y explica posible inconsistencia |
| Reclamos frecuentes | Asegurado con 2 o mas reclamos recientes | Prioriza historial del cliente |
| Frecuencia de vehiculo | Vehiculo con multiples siniestros | Cruce operativo por activo |
| Frecuencia de conductor | Conductor aparece en multiples siniestros | Cruce operativo por conductor |
| Solo RC recurrente | Alta frecuencia de responsabilidad civil | Alerta de patron repetitivo |
| Inicio de vigencia | Siniestro dentro de primeros 30 dias | Alerta por borde de vigencia |
| Fin de vigencia | Siniestro cerca del fin de poliza | Alerta por borde de vigencia |
| Robo con demora | Denuncia tardia en cobertura de robo | Alerta documental |
| Reporte tardio | Ocurrencia y reporte separados por varios dias | Alerta de oportunidad |
| Proveedor recurrente | Proveedor con varios casos observados | Ranking de concentracion |
| Lista restrictiva simulada | Proveedor marcado en watchlist sintetica | Escala a rojo/amarillo |
| Documentos incompletos | Falta soporte critico | Escala revision documental |
| Documentos inconsistentes | Fechas o valores no coinciden | Alerta critica |
| Dinamica sospechosa | Relato o tipo de accidente no consistente | Revision minuciosa |
| Tercero no identificado | Evento sin tercero ubicable | Alerta adicional |
| Narrativa similar | Texto parecido a otros reclamos | Senal NLP/similitud |
| Suma asegurada | Reclamo cercano al valor asegurado | Alerta financiera |
| Nocturno call center | Reporte nocturno por canal telefonico | Senal contextual |
| Vehiculo antiguo + monto alto | Monto alto en activo antiguo | Alerta de proporcionalidad |

## Score final

El score final se calcula en Convex como:

```text
score_final = 0.55 * score_ml + 0.45 * score_reglas
```

Si un siniestro importado no trae `mlRiskScore` o `fraud_probability`, se usa
solo el score de reglas.

La API FastAPI opcional calcula:

```text
score_final = score_reglas * 0.50 + score_patrones * 0.25 + score_ia * 0.25
```

Componentes:

- `score_reglas`: reglas auditables de negocio.
- `score_patrones`: comparacion contra dataset, proveedor, asegurado, montos y
  documentos.
- `score_ia`: modelo preentrenado via API con OpenAI/LangChain o fallback local.

El resultado se expresa como alerta preventiva y requiere revision humana.

## Semaforo

| Rango | Nivel | Accion |
| --- | --- | --- |
| 0-40 | Verde | Continuar flujo normal |
| 41-75 | Amarillo | Revision documental |
| 76-100 | Rojo | Revision especializada antifraude |
