# Pitch ejecutivo - 10 minutos

## 1 min - Problema

Las aseguradoras revisan miles de siniestros con reglas dispersas, documentos,
proveedores, fechas y narrativas. Esto hace lenta la priorizacion de posibles
casos irregulares.

## 1 min - Solucion

FraudIA Claims prioriza siniestros con un score hibrido:

- modelo entrenado con scikit-learn,
- reglas explicables,
- semaforo verde/amarillo/rojo,
- importacion CSV/JSON por tabla,
- agente de consultas con IA generativa opcional y fallback local.

## 4 min - Demo

1. Abrir el dashboard principal.
2. Entrar a `Importacion`.
3. Cargar o mostrar plantillas CSV/JSON de siniestros, polizas, asegurados,
   beneficiarios y documentos.
4. Volver al dashboard para mostrar metricas, score ML promedio y prioridades.
5. Abrir `Casos` para ver todos los casos en verde, amarillo y rojo.
6. Preguntar al agente:
   - `10 casos de mayor riesgo`
   - `por que CLM-00001 fue marcado`
   - `proveedores con mas alertas`
7. Exportar reporte CSV.

## 2 min - Arquitectura e IA

- Python genera dataset sintetico.
- scikit-learn entrena RandomForestClassifier.
- Convex guarda datos, calcula reglas y score final.
- React muestra dashboard, importacion, casos y agente.
- El score final mezcla 55% ML y 45% reglas.
- El agente usa OpenAI si existe `OPENAI_API_KEY`; si no, usa respuestas
  locales por reglas.

## 1 min - Impacto

- Priorizacion rapida de revision.
- Mejor trazabilidad de alertas.
- Concentracion de proveedores/ciudades/coberturas.
- Posible ahorro operativo por foco en casos rojos y amarillos.

## 1 min - Limitaciones y proximos pasos

- Datos sinteticos.
- No acusa fraude.
- Requiere validacion con historicos reales.
- Siguiente etapa: similitud textual real, feedback de analistas, versionado de
  prompts/modelos y API de scoring.

## Preguntas esperadas

### Como detectan similitud textual?

En esta version se simula `narrative_similarity_max` y se incluye como feature
del modelo y regla explicable. El siguiente paso es calcularla con embeddings o
TF-IDF/cosine similarity sobre narrativas reales anonimizadas.

### Como evita acusar injustamente?

El sistema solo genera alertas, muestra factores explicables y mantiene
revision humana obligatoria antes de cualquier decision.

### Que modelo entrenaron?

RandomForestClassifier con variables de montos, fechas, documentos,
proveedores, historial, vehiculo, conductor y narrativa.

### Donde esta la IA generativa?

En Convex existe `askAnalystAssistantWithLLM`, una action que lee
`OPENAI_API_KEY` desde variables seguras de Convex. El frontend nunca recibe la
API key. Si la key no existe, el agente responde con logica local.
