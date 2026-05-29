# API FastAPI de analisis

La API expone endpoints REST para analizar siniestros sin reemplazar Convex.
Todos los resultados son alertas para revision humana.

## Ejecutar

```bash
python -m pip install -r requirements.txt
uvicorn src.app.main:app --reload
```

Con dependencias locales:

```powershell
$env:PYTHONPATH=".python_deps;."
python -m uvicorn src.app.main:app --reload
```

Swagger:

```text
http://localhost:8000/docs
```

## Variables

```text
AI_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Si no hay API key, se usa fallback local.

## Analizar un siniestro

```bash
curl -X POST http://localhost:8000/api/analysis/claim \
  -H "Content-Type: application/json" \
  -d '{
    "id_siniestro": "SIN-001",
    "id_poliza": "POL-1001",
    "id_asegurado": "ASEG-001",
    "ramo": "Vehiculos",
    "cobertura": "Robo",
    "fecha_ocurrencia": "2026-05-01",
    "fecha_reporte": "2026-05-08",
    "monto_reclamado": 12000,
    "monto_estimado": 7000,
    "monto_pagado": 0,
    "estado": "Reserva",
    "sucursal": "Quito",
    "ciudad": "Quito",
    "descripcion": "El asegurado reporta robo del vehiculo pocos dias despues de contratar la poliza.",
    "documentos_completos": false,
    "beneficiario": "PROV-001",
    "dias_desde_inicio_poliza": 8,
    "dias_desde_fin_poliza": 300,
    "dias_entre_ocurrencia_reporte": 7,
    "historial_siniestros_asegurado": 3
  }'
```

## Endpoints

- `GET /health`
- `POST /api/analysis/claim`
- `POST /api/analysis/batch`
- `GET /api/agent/top-risk`
- `GET /api/agent/explain/{claim_id}`
- `GET /api/agent/providers-alerts`
- `GET /api/agent/executive-summary`
