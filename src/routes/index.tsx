import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { createFileRoute } from '@tanstack/react-router'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({ component: Home })

type PayloadFormat = 'json' | 'csv'

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
  const [importFeedback, setImportFeedback] = useState<{
    inserted: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

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

  const onSeedData = async () => {
    try {
      setIsSeeding(true)
      await seedData({})
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
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total siniestros" value={summary?.total ?? 0} />
        <MetricCard label="Score promedio" value={summary?.averageRiskScore ?? 0} />
        <MetricCard label="Riesgo rojo" value={summary?.byLevel.red ?? 0} />
        <MetricCard label="Riesgo amarillo" value={summary?.byLevel.yellow ?? 0} />
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
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Claim</th>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Nivel</th>
                  <th className="px-4 py-2 font-medium">Alertas</th>
                </tr>
              </thead>
              <tbody>
                {(claims ?? []).map((claim) => (
                  <tr className="border-t border-gray-100 align-top" key={claim._id}>
                    <td className="px-4 py-2 font-medium">{claim.claimNumber}</td>
                    <td className="px-4 py-2">{claim.customerId}</td>
                    <td className="px-4 py-2">${claim.claimAmount.toLocaleString('en-US')}</td>
                    <td className="px-4 py-2">{claim.riskScore}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${riskPillStyles[claim.riskLevel]}`}
                      >
                        {claim.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {claim.anomalyFlags.length > 0
                        ? claim.anomalyFlags.slice(0, 2).join(' | ')
                        : 'Sin alertas relevantes'}
                    </td>
                  </tr>
                ))}
                {claims && claims.length === 0 ? (
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
