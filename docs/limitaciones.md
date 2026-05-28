# Limitaciones, seguridad y etica

## Limitaciones

- Los datos son sinteticos y no sustituyen historicos reales anonimizados.
- La etiqueta `fraud_label` es simulada, no una verdad judicial ni operativa.
- Las metricas del modelo pueden verse optimistas por la naturaleza sintetica
  del dataset.
- El modelo debe recalibrarse con datos reales, por ramo y cobertura.
- La similitud narrativa actual se maneja como variable simulada.
- El agente local usa intenciones simples.
- El agente con LLM depende de `OPENAI_API_KEY` y de disponibilidad externa.
- El dashboard esta pensado para demo y priorizacion, no para produccion.

## Seguridad y privacidad

- No se incluyen datos personales reales.
- Los identificadores son anonimos o sinteticos.
- No se debe subir `.env` ni credenciales.
- `OPENAI_API_KEY` debe configurarse como variable segura de Convex, nunca como
  `VITE_` ni en el frontend.
- El contexto enviado al LLM debe limitarse a datos necesarios del caso y
  resumen operativo.
- Las salidas son alertas de revision humana.

## Etica

La solucion evita lenguaje acusatorio. Se usan expresiones como:

- posible fraude,
- alerta,
- requiere revision,
- caso priorizado,
- senal de riesgo.

No se debe usar para:

- rechazar automaticamente un siniestro,
- acusar formalmente a un asegurado,
- tomar decisiones legales,
- reemplazar al analista humano.

## Mitigacion de falsos positivos

- Mostrar reglas activadas y factores principales.
- Mantener revision humana obligatoria.
- Medir precision, recall y F1 con datos separados.
- Registrar feedback de analistas.
- Auditar sesgos por ciudad, canal, proveedor y cobertura.
- Revisar periodicamente prompts y respuestas del agente.

## Proximos pasos

1. Entrenar con historicos anonimizados y etiqueta validada.
2. Agregar validacion temporal para evitar fuga de informacion.
3. Usar NLP real para similitud de narrativas.
4. Integrar feedback de analistas como nueva fuente de entrenamiento.
5. Versionar modelos, prompts, datasets y umbrales por ramo/cobertura.
