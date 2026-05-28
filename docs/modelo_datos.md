# Modelo de datos

## Tablas Convex

### claims

Tabla principal de siniestros. Campos clave:

- `claimNumber`, `policyId`, `customerId`, `vehicleId`, `driverId`,
  `providerId`.
- `lineOfBusiness`, `coverage`, `claimType`, `channel`, `locationRegion`.
- `claimAmount`, `estimatedDamageAmount`, `paidAmount`, `sumInsured`,
  `deductible`.
- `daysSincePolicyStart`, `daysUntilPolicyEnd`,
  `daysBetweenOccurrenceReport`.
- `incidentsLast12Months`, `incidentsLast18Months`,
  `vehicleIncidentsLast18Months`, `driverIncidentsLast18Months`.
- `documentsComplete`, `missingCriticalDocument`,
  `documentsInconsistent`.
- `providerObservedCases`, `providerInWatchlist`.
- `narrativeSimilarityMax`, `narrativeGroup`.
- `fraudLabelSimulated`, `mlFraudProbability`, `mlRiskScore`,
  `mlModelVersion`.

### policies

Polizas sinteticas relacionadas por `policyId`:

- `policyId`, `customerId`, `vehicleId` opcional,
- ramo, vigencia, prima, suma asegurada, deducible, canal, ciudad y estado.

### insureds

Asegurados anonimos relacionados por `customerId`:

- segmento, antiguedad, ciudad, numero de polizas, reclamos recientes, mora y
  score cliente simulado.

### vehicles

Vehiculos sinteticos relacionados por `vehicleId`:

- hashes de placa/chasis/motor, marca, modelo y anio.

### providers

Beneficiarios o proveedores relacionados por `providerId`:

- tipo, ciudad, reclamos asociados, monto promedio, tasa observada,
  antiguedad y lista restrictiva simulada.

### claimDocuments

Documentos relacionados por `claimNumber`:

- tipo, entregado, legible, fecha de emision, inconsistencia y observacion.

## Dataset Python

`data/synthetic/claims_training.csv` contiene 800 filas sinteticas con la
columna objetivo `fraud_label`.

`data/processed/claims_scored.csv` agrega:

- `fraud_probability`,
- `ml_risk_score`,
- `model_version`.

## Privacidad

Todos los identificadores son anonimos o sinteticos. No se usan nombres,
cedulas, placas reales, telefonos, direcciones ni informacion confidencial.

## Importacion CSV/JSON

La ruta `/importacion_csv` permite importar datos con encabezados en espanol o
en formato interno. Los campos minimos esperados por tabla son:

### Siniestros

```text
id_siniestro, id_poliza, id_asegurado, monto_reclamado
```

### Polizas

```text
id_poliza, id_asegurado, ramo, fecha_inicio, fecha_fin, prima,
suma_asegurada, deducible, canal_venta, ciudad, estado_poliza
```

`id_vehiculo` es opcional.

### Asegurados

```text
id_asegurado, segmento, antiguedad, ciudad, numero_polizas,
reclamos_ultimos_12_meses, mora_actual, score_cliente_simulado
```

### Beneficiarios

```text
id_proveedor, tipo, ciudad, reclamos_asociados,
monto_promedio_reclamado, porcentaje_de_casos_observados, antiguedad
```

### Documentos

```text
id_documento, id_siniestro, tipo_documento, entregado, legible,
fecha_emision, inconsistencia_detectada, observacion
```

Las mutaciones de importacion normalizan campos, omiten filas invalidas, evitan
duplicados y devuelven `inserted`, `skipped`, `totalReceived`, `errors` y
`message`.
