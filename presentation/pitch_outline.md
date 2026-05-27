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
- agente de consultas para analistas.

## 4 min - Demo

1. Regenerar dataset demo.
2. Mostrar metricas: rojos, amarillos, score ML promedio.
3. Filtrar casos rojos.
4. Abrir explicacion de alertas en la tabla.
5. Preguntar:
   - `10 casos de mayor riesgo`
   - `por que CLM-00001 fue marcado`
   - `proveedores con mas alertas`
6. Exportar reporte CSV.

## 2 min - Arquitectura e IA

- Python genera dataset sintetico.
- scikit-learn entrena RandomForestClassifier.
- Convex calcula reglas y score final.
- React muestra dashboard y agente.
- El score final mezcla 55% ML y 45% reglas.

## 1 min - Impacto

- Priorizacion rapida de revision.
- Mejor trazabilidad de alertas.
- Concentracion de proveedores/ciudades/coberturas.
- Posible ahorro operativo por foco en casos rojos y amarillos.

## 1 min - Limitaciones y proximos pasos

- Datos sinteticos.
- No acusa fraude.
- Requiere validacion con historicos reales.
- Siguiente etapa: NLP real, feedback de analistas y despliegue de API de
  scoring.

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
