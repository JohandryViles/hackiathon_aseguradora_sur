import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({ component: Home })

type PayloadFormat = 'json' | 'csv'
type ClaimSortKey = 'claim' | 'cliente' | 'monto' | 'score' | 'nivel' | 'alertas'
type SortDirection = 'asc' | 'desc'
type SortRule = { key: ClaimSortKey; direction: SortDirection }
const CSV_TEMPLATE_FILENAME = 'plantilla_siniestros_publicos.csv'
const CSV_TEMPLATE_CONTENT = `claim_id,policy_id,customer_id,claim_amount,estimated_damage_amount,claim_type,incidents_last_12_months,days_since_policy_start,region,report_channel,incident_date,report_date,insured_age,vehicle_year,night_claim,description
PUB-001,P-7782,CUST-9001,11250,6500,theft,2,45,Quito,callcenter,2026-04-29T23:14:00Z,2026-05-01T09:00:00Z,38,2017,true,Vehiculo sustraido en zona urbana.
PUB-002,P-7783,CUST-9012,2400,2600,collision,0,390,Guayaquil,app,2026-04-10T16:00:00Z,2026-04-10T16:45:00Z,29,2020,false,Colision leve con danos de pintura.
`

function parseCsvValue(value: string): string | number | boolean {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  const maybeNumber = Number(trimmed)
  if (Number.isFinite(maybeNumber)) return maybeNumber
  return trimmed
}

function parseCsvRows(input: string): Array<Record<string, unknown>> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(separator).map((header) => header.trim())
  const rows: Array<Record<string, unknown>> = []

  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(separator)
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j += 1) {
      const header = headers[j]
      if (!header) continue
      row[header] = parseCsvValue(cells[j] ?? '')
    }
    rows.push(row)
  }
  return rows
}

function parsePayload(
  payloadFormat: PayloadFormat,
  payload: string,
): Array<Record<string, unknown>> {
  if (payloadFormat === 'csv') return parseCsvRows(payload)
  const parsed = JSON.parse(payload) as unknown
  if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un arreglo de objetos')
  return parsed
    .filter((item) => typeof item === 'object' && item !== null)
    .map((item) => item as Record<string, unknown>)
}

function Home() {
  const apiRef = api as any
  const [riskFilter, setRiskFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all')
  const [search, setSearch] = useState('')
  const [nlQuestion, setNlQuestion] = useState('')
  const [submittedQuestion, setSubmittedQuestion] = useState('')
  const [isSeeding, setIsSeeding] = useState(false)
  const [payloadFormat, setPayloadFormat] = useState<PayloadFormat>('json')
  const [publicPayload, setPublicPayload] = useState('')
  const [datasetName, setDatasetName] = useState('public-claims')
  const [selectedCsvFileName, setSelectedCsvFileName] = useState<string | null>(null)
  const [seedFeedback, setSeedFeedback] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [importFeedback, setImportFeedback] = useState<{
    inserted: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: 'score', direction: 'desc' },
  ])
  const csvFileInputRef = useRef<HTMLInputElement | null>(null)

  const summary = useQuery(apiRef.claims.getSummary, {})
  const claims = useQuery(apiRef.claims.listWithRisk, {
    riskLevel: riskFilter === 'all' ? undefined : riskFilter,
    search: search.trim() ? search.trim() : undefined,
    limit: 60,
  })
  const assistantResponse = useQuery(
    apiRef.claims.askAnalystAssistant,
    submittedQuestion.trim() ? { question: submittedQuestion } : 'skip',
  )
  const seedData = useMutation(apiRef.claims.seedSyntheticData)
  const importPublicClaims = useMutation(apiRef.claims.importPublicClaims)

  const riskPillStyles = useMemo(
    () => ({
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
    }),
    [],
  )
  const riskLevelLabels = useMemo(
    () => ({
      green: 'Bajo',
      yellow: 'Medio',
      red: 'Alto',
    }),
    [],
  )

  const sortedClaims = useMemo(() => {
    if (!claims) return []

    const levelRank: Record<'green' | 'yellow' | 'red', number> = {
      green: 0,
      yellow: 1,
      red: 2,
    }
    const rows = [...claims]

    const compareByRule = (a: (typeof rows)[number], b: (typeof rows)[number], rule: SortRule) => {
      const direction = rule.direction === 'asc' ? 1 : -1
      switch (rule.key) {
        case 'claim':
          return direction * a.claimNumber.localeCompare(b.claimNumber)
        case 'cliente':
          return direction * a.customerId.localeCompare(b.customerId)
        case 'monto':
          return direction * (a.claimAmount - b.claimAmount)
        case 'score':
          return direction * (a.riskScore - b.riskScore)
        case 'nivel':
          return direction * (levelRank[a.riskLevel] - levelRank[b.riskLevel])
        case 'alertas':
          return direction * (a.anomalyFlags.length - b.anomalyFlags.length)
        default:
          return 0
      }
    }

    rows.sort((a, b) => {
      for (const rule of sortRules) {
        const result = compareByRule(a, b, rule)
        if (result !== 0) return result
      }
      return a.claimNumber.localeCompare(b.claimNumber)
    })

    return rows
  }, [claims, sortRules])

  const defaultDirection = (key: ClaimSortKey): SortDirection =>
    key === 'monto' || key === 'score' || key === 'nivel' || key === 'alertas'
      ? 'desc'
      : 'asc'

  const onSortTable = (key: ClaimSortKey, additive: boolean) => {
    setSortRules((current) => {
      const existingIndex = current.findIndex((rule) => rule.key === key)
      if (!additive) {
        if (existingIndex === 0) {
          return [
            {
              key,
              direction: current[0].direction === 'asc' ? 'desc' : 'asc',
            },
          ]
        }
        return [{ key, direction: defaultDirection(key) }]
      }

      if (existingIndex >= 0) {
        const next = [...current]
        next[existingIndex] = {
          key,
          direction: next[existingIndex].direction === 'asc' ? 'desc' : 'asc',
        }
        return next
      }

      return [...current, { key, direction: defaultDirection(key) }]
    })
  }

  const sortIndicator = (key: ClaimSortKey) => {
    const idx = sortRules.findIndex((rule) => rule.key === key)
    if (idx === -1) return ' -'
    return ` ${idx + 1}${sortRules[idx].direction === 'asc' ? '↑' : '↓'}`
  }

  const onSeedData = async () => {
    try {
      setSeedError(null)
      setSeedFeedback(null)
      setIsSeeding(true)
      const result = await seedData({})
      setSeedFeedback(
        `Datos sinteticos cargados: ${result.inserted} insertados, ${result.skippedExisting ?? 0} omitidos por duplicado.`,
      )
    } catch (error) {
      setSeedError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar datos sinteticos',
      )
    } finally {
      setIsSeeding(false)
    }
  }

  const onAsk = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmittedQuestion(nlQuestion.trim())
  }

  const onImportPublic = async () => {
    try {
      setImportError(null)
      setImportFeedback(null)
      setIsImporting(true)
      const rows = parsePayload(payloadFormat, publicPayload)
      if (rows.length === 0) {
        setImportError('No se detectaron filas para importar')
        return
      }
      const result = await importPublicClaims({
        datasetName: datasetName.trim() || undefined,
        rows,
      })
      setImportFeedback({
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
      })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No fue posible importar los datos')
    } finally {
      setIsImporting(false)
    }
  }

  const onPickCsvFile = () => {
    csvFileInputRef.current?.click()
  }

  const onCsvFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImportError(null)
      const content = await file.text()
      setPayloadFormat('csv')
      setPublicPayload(content)
      setSelectedCsvFileName(file.name)
      if (!datasetName.trim() || datasetName === 'public-claims') {
        setDatasetName(file.name.replace(/\.[^/.]+$/, ''))
      }
    } catch {
      setImportError('No se pudo leer el archivo CSV seleccionado')
    } finally {
      event.target.value = ''
    }
  }

  const onDownloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_CONTENT], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = CSV_TEMPLATE_FILENAME
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const loadExamplePayload = () => {
    setPayloadFormat('json')
    setPublicPayload(`[
  {
    "claim_id": "PUB-001",
    "policy_id": "P-7782",
    "customer_id": "CUST-9001",
    "claim_amount": 11250,
    "estimated_damage_amount": 6500,
    "claim_type": "theft",
    "incidents_last_12_months": 2,
    "days_since_policy_start": 45,
    "region": "Quito",
    "report_channel": "callcenter",
    "incident_date": "2026-04-29T23:14:00Z",
    "description": "Vehiculo sustraido en zona urbana."
  },
  {
    "claim_id": "PUB-002",
    "policy_id": "P-7783",
    "customer_id": "CUST-9012",
    "claim_amount": 2400,
    "estimated_damage_amount": 2600,
    "claim_type": "collision",
    "incidents_last_12_months": 0,
    "days_since_policy_start": 390,
    "region": "Guayaquil",
    "report_channel": "app",
    "incident_date": "2026-04-10T16:00:00Z",
    "description": "Colision leve con danos de pintura."
  }
]`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Prototipo IA para Analisis de Siniestros</h1>
        <p className="text-sm text-gray-700">
          Deteccion de patrones anormales, scoring de riesgo, alertas explicables y consultas en
          lenguaje natural para apoyar a analistas.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={isSeeding}
            onClick={onSeedData}
            type="button"
          >
            {isSeeding ? 'Cargando datos...' : 'Cargar datos sinteticos'}
          </button>
          <input
            className="min-w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por claim, cliente, tipo o region"
            type="text"
            value={search}
          />
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            onChange={(event) => setRiskFilter(event.target.value as 'all' | 'green' | 'yellow' | 'red')}
            value={riskFilter}
          >
            <option value="all">Todos los riesgos</option>
            <option value="green">Verde</option>
            <option value="yellow">Amarillo</option>
            <option value="red">Rojo</option>
          </select>
        </div>
        {seedError ? <p className="mt-2 text-sm text-red-700">{seedError}</p> : null}
        {seedFeedback ? (
          <p className="mt-2 text-sm text-emerald-700">{seedFeedback}</p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total siniestros" value={summary?.total ?? 0} />
        <MetricCard label="Score promedio" value={summary?.averageRiskScore ?? 0} />
        <MetricCard label="Nivel alto (rojo)" value={summary?.byLevel.red ?? 0} />
        <MetricCard label="Nivel medio (amarillo)" value={summary?.byLevel.yellow ?? 0} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard label="Origen sintetico" value={summary?.bySource.synthetic ?? 0} />
        <MetricCard label="Origen publico" value={summary?.bySource.public ?? 0} />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Importar informacion publica</h2>
            <p className="text-xs text-gray-600">
              Pega datos en JSON o CSV para incorporarlos al analisis junto a los sinteticos.
            </p>
          </div>
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium"
            onClick={loadExamplePayload}
            type="button"
          >
            Cargar ejemplo
          </button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr_150px]">
          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            onChange={(event) => setDatasetName(event.target.value)}
            placeholder="Nombre dataset"
            type="text"
            value={datasetName}
          />
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            onChange={(event) => setPayloadFormat(event.target.value as PayloadFormat)}
            value={payloadFormat}
          >
            <option value="json">Formato JSON</option>
            <option value="csv">Formato CSV</option>
          </select>
          <button
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={isImporting}
            onClick={onImportPublic}
            type="button"
          >
            {isImporting ? 'Importando...' : 'Importar'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={onCsvFileSelected}
            ref={csvFileInputRef}
            type="file"
          />
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium"
            onClick={onPickCsvFile}
            type="button"
          >
            Cargar CSV desde archivo
          </button>
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium"
            onClick={onDownloadCsvTemplate}
            type="button"
          >
            Descargar plantilla CSV
          </button>
          {selectedCsvFileName ? (
            <span className="text-xs text-gray-600">
              Archivo cargado: {selectedCsvFileName}
            </span>
          ) : null}
        </div>

        <textarea
          className="mt-3 min-h-40 w-full rounded-md border border-gray-300 p-3 font-mono text-xs"
          onChange={(event) => setPublicPayload(event.target.value)}
          placeholder={
            payloadFormat === 'json'
              ? '[{"claim_amount": 1200, "claim_type": "collision"}]'
              : 'claim_amount,claim_type,customer_id\n1200,collision,CUST-1'
          }
          value={publicPayload}
        />

        {importError ? <p className="mt-2 text-sm text-red-700">{importError}</p> : null}
        {importFeedback ? (
          <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            <p>
              Importacion completada: {importFeedback.inserted} insertados / {importFeedback.skipped}{' '}
              omitidos.
            </p>
            {importFeedback.errors.length > 0 ? (
              <p className="mt-1 text-xs">Advertencias: {importFeedback.errors.join(' | ')}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold">Siniestros evaluados</h2>
            <p className="text-xs text-gray-600">
              Cada caso incluye score, nivel y explicacion de alertas.
            </p>
            <p className="text-xs text-gray-500">
              Clic ordena por una columna. Shift+clic agrega orden secundario/terciario.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('claim', event.shiftKey)} type="button">
                      Claim{sortIndicator('claim')}
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('cliente', event.shiftKey)} type="button">
                      Cliente{sortIndicator('cliente')}
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('monto', event.shiftKey)} type="button">
                      Monto{sortIndicator('monto')}
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('score', event.shiftKey)} type="button">
                      Score{sortIndicator('score')}
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('nivel', event.shiftKey)} type="button">
                      Nivel{sortIndicator('nivel')}
                    </button>
                  </th>
                  <th className="px-4 py-2 font-medium">
                    <button onClick={(event) => onSortTable('alertas', event.shiftKey)} type="button">
                      Alertas{sortIndicator('alertas')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedClaims.map((claim) => (
                  <tr className="border-t border-gray-100 align-top" key={claim._id}>
                    <td className="px-4 py-2 font-medium">{claim.claimNumber}</td>
                    <td className="px-4 py-2">{claim.customerId}</td>
                    <td className="px-4 py-2">${claim.claimAmount.toLocaleString('en-US')}</td>
                    <td className="px-4 py-2">{claim.riskScore}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${riskPillStyles[claim.riskLevel]}`}
                      >
                        {riskLevelLabels[claim.riskLevel]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {claim.anomalyFlags.length > 0
                        ? claim.anomalyFlags.slice(0, 2).join(' | ')
                        : 'Sin alertas relevantes'}
                    </td>
                  </tr>
                ))}
                {claims && sortedClaims.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-gray-600" colSpan={6}>
                      No hay resultados para el filtro actual.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Top patrones detectados</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {(summary?.topAnomalies ?? []).map((item) => (
                <li className="rounded-md bg-gray-50 p-2" key={item.flag}>
                  <strong>{item.count}</strong> - {item.flag}
                </li>
              ))}
              {(summary?.topAnomalies ?? []).length === 0 ? <li>Sin datos todavia.</li> : null}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold">Consultas en lenguaje natural</h3>
            <p className="mt-1 text-xs text-gray-600">
              Ejemplos: "casos rojos", "patrones anomalos", "cliente CUST-401".
            </p>
            <form className="mt-3 space-y-2" onSubmit={onAsk}>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                onChange={(event) => setNlQuestion(event.target.value)}
                placeholder="Escribe tu pregunta"
                type="text"
                value={nlQuestion}
              />
              <button
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                type="submit"
              >
                Consultar
              </button>
            </form>
            {assistantResponse ? (
              <div className="mt-3 space-y-2 rounded-md bg-indigo-50 p-3 text-sm">
                <p>
                  <strong>Respuesta:</strong> {assistantResponse.answer}
                </p>
                <p>
                  <strong>Siguiente accion:</strong> {assistantResponse.recommendedAction}
                </p>
                <p>
                  <strong>Casos relacionados:</strong> {assistantResponse.claims.length}
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString('en-US')}</p>
    </article>
  )
}
