# Limitaciones, seguridad y etica

## Limitaciones

- Los datos son sinteticos y no sustituyen historicos reales anonimizados.
- La etiqueta `fraud_label` es simulada, no una verdad judicial ni operativa.
- Las metricas del modelo pueden verse optimistas por la naturaleza sintetica
  del dataset.
- El modelo debe recalibrarse con datos reales, por ramo y cobertura.
- El agente de lenguaje natural usa intenciones simples, no razonamiento libre.
- El dashboard esta pensado para demo y priorizacion, no para produccion.

## Seguridad y privacidad

- No se incluyen datos personales reales.
- Los identificadores son anonimos o sinteticos.
- No se debe subir `.env` ni credenciales.
- El modelo no necesita APIs externas para la demo.
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

## Proximos pasos

1. Entrenar con historicos anonimizados y etiqueta validada.
2. Agregar validacion temporal para evitar fuga de informacion.
3. Usar NLP real para similitud de narrativas.
4. Integrar feedback de analistas como nueva fuente de entrenamiento.
5. Versionar modelos y umbrales por ramo/cobertura.
