import { action, mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'

type RiskLevel = 'green' | 'yellow' | 'red'
type ClaimType = 'collision' | 'theft' | 'injury' | 'glass' | 'fire' | 'other'
type Channel = 'app' | 'broker' | 'callcenter' | 'web'
type ClaimSource = 'synthetic' | 'public'
type LineOfBusiness = 'vehicles' | 'health' | 'life' | 'home' | 'general'

type ClaimInput = {
  claimNumber: string
  policyId: string
  customerId: string
  vehicleId?: string
  driverId?: string
  providerId?: string
  customerAge: number
  lineOfBusiness?: LineOfBusiness
  coverage?: string
  claimType: ClaimType
  channel: Channel
  locationRegion: string
  branch?: string
  vehicleYear: number
  vehicleMake?: string
  vehicleModel?: string
  licensePlateHash?: string
  claimAmount: number
  estimatedDamageAmount: number
  paidAmount?: number
  claimStatus?: string
  sumInsured?: number
  deductible?: number
  incidentsLast12Months: number
  incidentsLast18Months?: number
  vehicleIncidentsLast18Months?: number
  driverIncidentsLast18Months?: number
  priorRcClaims?: number
  daysSincePolicyStart: number
  daysUntilPolicyEnd?: number
  daysBetweenOccurrenceReport?: number
  occurredAt: number
  submittedAt: number
  isNightClaim: boolean
  documentsComplete?: boolean
  missingCriticalDocument?: boolean
  documentsInconsistent?: boolean
  beneficiaryType?: string
  providerObservedCases?: number
  providerInWatchlist?: boolean
  accidentDynamics?: string
  unidentifiedThirdParty?: boolean
  narrativeSimilarityMax?: number
  narrativeGroup?: string
  customerSegment?: string
  customerTenureMonths?: number
  customerPoliciesCount?: number
  customerDelinquent?: boolean
  customerScoreSimulated?: number
  fraudLabelSimulated?: number
  mlFraudProbability?: number
  mlRiskScore?: number
  mlModelVersion?: string
  reportNarrative: string
  source?: ClaimSource
  sourceDataset?: string
}

type ClaimDoc = Doc<'claims'>

type EnrichedClaim = ClaimDoc & {
  riskScore: number
  ruleRiskScore: number
  mlScore: number | null
  riskLevel: RiskLevel
  anomalyFlags: string[]
  explanation: string
  recommendedAction: string
}

type AssistantIntent =
  | 'red'
  | 'yellow'
  | 'green'
  | 'anomalies'
  | 'amount'
  | 'customer'
  | 'provider'
  | 'city'
  | 'line'
  | 'documents'
  | 'near_start'
  | 'why'
  | 'summary'
  | 'help'

type AnalystAssistantResponse = {
  intent: AssistantIntent
  answer: string
  recommendedAction: string
  claims: EnrichedClaim[]
}

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
const DEFAULT_ANALYST_SYSTEM_MESSAGE =
  'Eres un analista antifraude de seguros para Aseguradora del Sur. Responde en espanol, de forma clara y breve. Usa solo los datos entregados en el contexto. No acuses fraude como hecho confirmado; habla de posibles alertas, riesgo y pasos de revision humana. Devuelve recomendaciones accionables para el analista.'

const askAnalystAssistantQuery = makeFunctionReference<'query', { question: string }, AnalystAssistantResponse>(
  'claims:askAnalystAssistant',
)
const getSummaryQuery = makeFunctionReference<'query', Record<string, never>, unknown>('claims:getSummary')
const listWithRiskQuery = makeFunctionReference<'query', { limit: number }, EnrichedClaim[]>('claims:listWithRisk')

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 76) return 'red'
  if (score >= 41) return 'yellow'
  return 'green'
}

function seedRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function pick<T>(seed: number, values: T[]): T {
  return values[Math.floor(seedRandom(seed) * values.length)]
}

function daysBetween(start: number, end: number) {
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)))
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value))
}

function calculateSyntheticMlProbability(index: number, claim: ClaimInput) {
  const amountRatio = claim.claimAmount / Math.max(claim.estimatedDamageAmount, 1)
  const reportDelay = claim.daysBetweenOccurrenceReport ?? daysBetween(claim.occurredAt, claim.submittedAt)
  const vehicleAge = new Date().getFullYear() - claim.vehicleYear
  let logit = -2.3

  if (amountRatio >= 1.7) logit += 1.25
  else if (amountRatio >= 1.35) logit += 0.7
  if (claim.daysSincePolicyStart <= 10) logit += 1.0
  else if (claim.daysSincePolicyStart <= 30) logit += 0.55
  if ((claim.daysUntilPolicyEnd ?? 999) <= 10) logit += 0.55
  if (reportDelay > 7) logit += 0.65
  if (claim.claimType === 'theft' && reportDelay > 2) logit += 0.95
  if ((claim.incidentsLast18Months ?? claim.incidentsLast12Months) >= 3) logit += 0.9
  if ((claim.vehicleIncidentsLast18Months ?? 0) >= 3) logit += 0.65
  if ((claim.driverIncidentsLast18Months ?? 0) >= 3) logit += 0.65
  if ((claim.priorRcClaims ?? 0) > 2) logit += 0.55
  if (claim.providerInWatchlist) logit += 1.2
  else if ((claim.providerObservedCases ?? 0) > 2) logit += 0.6
  if (claim.documentsInconsistent) logit += 1.25
  if (claim.missingCriticalDocument) logit += 0.55
  if ((claim.narrativeSimilarityMax ?? 0) >= 0.85) logit += 0.85
  if (claim.unidentifiedThirdParty) logit += 0.4
  if (claim.accidentDynamics === 'illogical') logit += 0.75
  if (claim.claimAmount / Math.max(claim.sumInsured ?? claim.claimAmount * 2, 1) >= 0.95) logit += 0.5
  if (vehicleAge > 15 && claim.claimAmount > 14000) logit += 0.35

  logit += (seedRandom(index + 700) - 0.5) * 0.8
  return round(sigmoid(logit), 4)
}

function buildSyntheticClaim(index: number): ClaimInput {
  const now = Date.now()
  const suspicious = index % 9 === 0 || index % 14 === 0
  const critical = index % 37 === 0
  const highSeverity = index % 20 === 0
  const daysAgo = Math.floor(seedRandom(index + 11) * 150)
  const reportDelayDays = suspicious
    ? Math.floor(2 + seedRandom(index + 21) * 9)
    : Math.floor(seedRandom(index + 22) * 4)
  const occurredAt = now - daysAgo * 24 * 60 * 60 * 1000
  const submittedAt = occurredAt + reportDelayDays * 24 * 60 * 60 * 1000
  const claimType = suspicious
    ? pick(index + 41, ['theft', 'injury', 'collision'] satisfies ClaimType[])
    : pick(index + 42, ['collision', 'glass', 'other', 'fire'] satisfies ClaimType[])
  const coverageByType: Record<ClaimType, string> = {
    collision: pick(index + 43, ['Choque', 'Responsabilidad Civil', 'Dano propio']),
    theft: pick(index + 44, ['Robo total', 'Robo parcial']),
    injury: 'Atencion medica',
    glass: 'Vidrios',
    fire: 'Incendio',
    other: 'Otros danos',
  }
  const baseDamage = 800 + Math.round(seedRandom(index + 31) * 18000)
  const inflation = suspicious
    ? 1.55 + seedRandom(index + 19) * 0.9
    : 0.8 + seedRandom(index + 18) * 0.7
  const estimatedDamageAmount = Math.round(highSeverity ? baseDamage * 1.4 : baseDamage)
  const claimAmount = Math.round(estimatedDamageAmount * inflation)
  const customerId = suspicious ? `CUST-${400 + (index % 7)}` : `CUST-${1000 + ((index * 13) % 900)}`
  const vehicleYear = suspicious
    ? Math.floor(1998 + seedRandom(index + 71) * 12)
    : Math.floor(2006 + seedRandom(index + 72) * 19)
  const providerObservedCases = suspicious ? Math.floor(3 + seedRandom(index + 80) * 7) : Math.floor(seedRandom(index + 81) * 3)
  const documentsInconsistent = critical || (suspicious && seedRandom(index + 83) > 0.58)
  const missingCriticalDocument = suspicious && seedRandom(index + 84) > 0.45
  const sumInsured = Math.round(claimAmount * (critical ? 1.01 : 1.55 + seedRandom(index + 86) * 2.6))

  const claim: ClaimInput = {
    claimNumber: `CLM-${String(index + 1).padStart(5, '0')}`,
    policyId: `POL-${10000 + ((index * 17) % 45000)}`,
    customerId,
    vehicleId: suspicious ? `VEH-${700 + (index % 9)}` : `VEH-${2000 + ((index * 29) % 1200)}`,
    driverId: suspicious ? `DRV-${300 + (index % 5)}` : `DRV-${1000 + ((index * 23) % 900)}`,
    providerId: suspicious ? `PROV-${20 + (index % 6)}` : `PROV-${100 + ((index * 11) % 80)}`,
    customerAge: Math.floor(20 + seedRandom(index + 3) * 55),
    lineOfBusiness: 'vehicles',
    coverage: coverageByType[claimType],
    claimType,
    channel: suspicious
      ? pick(index + 51, ['callcenter', 'web', 'broker'] satisfies Channel[])
      : pick(index + 52, ['app', 'broker', 'web'] satisfies Channel[]),
    locationRegion: pick(index + 61, [
      'Quito',
      'Guayaquil',
      'Cuenca',
      'Manta',
      'Loja',
      'Ambato',
    ]),
    branch: pick(index + 62, ['Norte', 'Costa', 'Austro', 'Sierra Centro']),
    vehicleYear,
    vehicleMake: pick(index + 73, ['Toyota', 'Chevrolet', 'Kia', 'Hyundai', 'Nissan']),
    vehicleModel: pick(index + 74, ['Sedan', 'SUV', 'Pickup', 'Hatchback']),
    licensePlateHash: `LP-${(index * 7919).toString(16).toUpperCase()}`,
    claimAmount,
    estimatedDamageAmount,
    paidAmount: suspicious ? 0 : Math.round(claimAmount * (0.55 + seedRandom(index + 77) * 0.35)),
    claimStatus: suspicious ? 'Reserva' : pick(index + 76, ['Pago Parcial', 'Liquidado', 'Reserva']),
    sumInsured,
    deductible: Math.round(250 + seedRandom(index + 78) * 850),
    incidentsLast12Months: suspicious
      ? Math.floor(2 + seedRandom(index + 81) * 4)
      : Math.floor(seedRandom(index + 82) * 3),
    incidentsLast18Months: suspicious
      ? Math.floor(2 + seedRandom(index + 181) * 5)
      : Math.floor(seedRandom(index + 182) * 3),
    vehicleIncidentsLast18Months: suspicious ? Math.floor(1 + seedRandom(index + 91) * 4) : Math.floor(seedRandom(index + 92) * 2),
    driverIncidentsLast18Months: suspicious ? Math.floor(1 + seedRandom(index + 93) * 4) : Math.floor(seedRandom(index + 94) * 2),
    priorRcClaims: coverageByType[claimType].includes('Responsabilidad') && suspicious ? 3 : Math.floor(seedRandom(index + 95) * 2),
    daysSincePolicyStart: suspicious
      ? Math.floor(1 + seedRandom(index + 96) * 45)
      : Math.floor(45 + seedRandom(index + 97) * 700),
    daysUntilPolicyEnd: critical ? Math.floor(1 + seedRandom(index + 98) * 12) : Math.floor(35 + seedRandom(index + 99) * 720),
    daysBetweenOccurrenceReport: reportDelayDays,
    occurredAt,
    submittedAt,
    isNightClaim: suspicious ? seedRandom(index + 101) > 0.25 : seedRandom(index + 102) > 0.78,
    documentsComplete: !missingCriticalDocument,
    missingCriticalDocument,
    documentsInconsistent,
    beneficiaryType: pick(index + 103, ['Taller', 'Clinica', 'Perito', 'Asegurado']),
    providerObservedCases,
    providerInWatchlist: critical || (suspicious && index % 18 === 0),
    accidentDynamics: critical ? 'illogical' : pick(index + 104, ['normal', 'frontal', 'posterior', 'multiple', 'volcadura']),
    unidentifiedThirdParty: claimType === 'collision' && suspicious && seedRandom(index + 105) > 0.35,
    narrativeSimilarityMax: suspicious ? round(0.72 + seedRandom(index + 106) * 0.26, 2) : round(seedRandom(index + 107) * 0.68, 2),
    narrativeGroup: suspicious ? `NARR-${index % 6}` : `NARR-${100 + index}`,
    customerSegment: pick(index + 108, ['Retail', 'Pyme', 'Preferente']),
    customerTenureMonths: suspicious ? Math.floor(1 + seedRandom(index + 109) * 18) : Math.floor(18 + seedRandom(index + 110) * 90),
    customerPoliciesCount: suspicious ? 1 + Math.floor(seedRandom(index + 111) * 2) : 1 + Math.floor(seedRandom(index + 112) * 5),
    customerDelinquent: suspicious && seedRandom(index + 113) > 0.7,
    customerScoreSimulated: suspicious ? Math.floor(420 + seedRandom(index + 114) * 170) : Math.floor(620 + seedRandom(index + 115) * 220),
    reportNarrative: suspicious
      ? 'Reclamo con danos altos, documentos por validar y patron similar a casos observados.'
      : 'Choque menor reportado por el asegurado con soporte fotografico inicial.',
    source: 'synthetic',
  }

  const mlFraudProbability = calculateSyntheticMlProbability(index, claim)
  return {
    ...claim,
    fraudLabelSimulated: mlFraudProbability >= 0.58 ? 1 : 0,
    mlFraudProbability,
    mlRiskScore: Math.round(mlFraudProbability * 100),
    mlModelVersion: 'sklearn-random-forest-v1',
  }
}

function buildYellowRiskClaim(index: number): ClaimInput {
  const now = Date.now()
  const occurredAt = now - (10 + index) * 24 * 60 * 60 * 1000
  const submittedAt = occurredAt + 2 * 24 * 60 * 60 * 1000
  const estimatedDamageAmount = 5400 + index * 180
  const claimAmount = Math.round(estimatedDamageAmount * 1.4)

  return {
    claimNumber: `YEL-${String(index + 1).padStart(4, '0')}`,
    policyId: `POL-YEL-${7000 + index}`,
    customerId: `CUST-YEL-${6000 + index}`,
    customerAge: 28 + (index % 21),
    claimType: index % 3 === 0 ? 'theft' : 'collision',
    channel: index % 2 === 0 ? 'web' : 'broker',
    locationRegion: index % 2 === 0 ? 'Quito' : 'Guayaquil',
    vehicleYear: 2011 + (index % 9),
    claimAmount,
    estimatedDamageAmount,
    incidentsLast12Months: 2,
    daysSincePolicyStart: 70,
    occurredAt,
    submittedAt,
    isNightClaim: false,
    reportNarrative: 'Caso de riesgo medio para revision documental en unidad antifraude.',
    source: 'synthetic',
    sourceDataset: 'yellow-risk-seed',
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null
  return value as Record<string, unknown>
}

function normalizeImportKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function readField(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (alias in row && row[alias] !== undefined && row[alias] !== null) {
      return row[alias]
    }
  }
  const normalizedAliases = new Set(aliases.map(normalizeImportKey))
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) continue
    if (normalizedAliases.has(normalizeImportKey(key))) return value
  }
  return undefined
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  let cleaned = value.trim().replaceAll('$', '').replaceAll('%', '').replace(/\s/g, '')
  if (!cleaned) return null
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  if (hasComma && hasDot) {
    cleaned =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '')
  } else if (hasComma) {
    const parts = cleaned.split(',')
    cleaned =
      parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2
        ? `${parts[0]}.${parts[1]}`
        : cleaned.replace(/,/g, '')
  }
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'si', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return null
}

function optionalNumber(value: unknown) {
  return toNumber(value) ?? undefined
}

function optionalText(value: unknown) {
  return toText(value) ?? undefined
}

function optionalBoolean(value: unknown) {
  return toBoolean(value) ?? undefined
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) return value
    if (value > 1_000_000_000) return Math.round(value * 1000)
  }
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapClaimType(value: unknown): ClaimType {
  const text = (toText(value) ?? '').toLowerCase()
  if (text.includes('theft') || text.includes('hurto') || text.includes('robo')) return 'theft'
  if (text.includes('injur') || text.includes('lesion')) return 'injury'
  if (text.includes('glass') || text.includes('parabrisas') || text.includes('vidrio')) return 'glass'
  if (text.includes('fire') || text.includes('incendio')) return 'fire'
  if (text.includes('colli') || text.includes('choque') || text.includes('accident')) return 'collision'
  return 'other'
}

function mapChannel(value: unknown): Channel {
  const text = (toText(value) ?? '').toLowerCase()
  if (text.includes('broker') || text.includes('agente') || text.includes('asesor')) return 'broker'
  if (text.includes('call') || text.includes('telefono')) return 'callcenter'
  if (text.includes('app') || text.includes('mobile')) return 'app'
  return 'web'
}

function mapLineOfBusiness(value: unknown): LineOfBusiness {
  const text = (toText(value) ?? '').toLowerCase()
  if (text.includes('salud') || text.includes('health')) return 'health'
  if (text.includes('vida') || text.includes('life')) return 'life'
  if (text.includes('hogar') || text.includes('home')) return 'home'
  if (text.includes('general') || text.includes('otro')) return 'general'
  return 'vehicles'
}

function normalizePublicClaim(
  row: Record<string, unknown>,
  index: number,
  datasetName: string,
): { claim: ClaimInput | null; reason?: string } {
  const now = Date.now()
  const claimAmount = toNumber(
    readField(row, ['claimAmount', 'claim_amount', 'total_claim_amount', 'amount', 'claim_value', 'monto_reclamado']),
  )
  if (claimAmount === null || claimAmount <= 0) {
    return { claim: null, reason: `Fila ${index + 1}: claimAmount invalido` }
  }

  const estimatedDamageAmount =
    toNumber(readField(row, ['estimatedDamageAmount', 'estimated_damage_amount', 'damage_amount', 'monto_estimado'])) ??
    Math.round(claimAmount * 0.72)
  const occurredAt =
    toTimestamp(readField(row, ['occurredAt', 'incident_date', 'loss_date', 'occurrence_date', 'fecha_ocurrencia'])) ??
    now - 5 * 24 * 60 * 60 * 1000
  const submittedAt =
    toTimestamp(readField(row, ['submittedAt', 'report_date', 'reported_at', 'submission_date', 'fecha_reporte'])) ??
    now

  const rawNight = toBoolean(readField(row, ['isNightClaim', 'is_night_claim', 'night_claim']))
  const hour = new Date(occurredAt).getHours()
  const daysBetweenReport = toNumber(readField(row, ['daysBetweenOccurrenceReport', 'dias_entre_ocurrencia_reporte'])) ??
    daysBetween(occurredAt, submittedAt)
  const claimType = mapClaimType(readField(row, ['claimType', 'claim_type', 'loss_type', 'cobertura']))
  const providerObservedCases = toNumber(readField(row, ['providerObservedCases', 'provider_observed_cases', 'reclamos_asociados']))

  const claim: ClaimInput = {
    claimNumber:
      toText(readField(row, ['claimNumber', 'claim_id', 'claim_no', 'id', 'id_siniestro'])) ??
      `PUB-${Date.now()}-${index + 1}`,
    policyId:
      toText(readField(row, ['policyId', 'policy_id', 'policy_number', 'id_poliza'])) ?? `POL-PUBLIC-${index + 1}`,
    customerId:
      toText(readField(row, ['customerId', 'customer_id', 'insured_id', 'id_asegurado'])) ??
      `CUST-PUBLIC-${index + 1}`,
    vehicleId: optionalText(readField(row, ['vehicleId', 'vehicle_id', 'id_vehiculo'])),
    driverId: optionalText(readField(row, ['driverId', 'driver_id', 'id_conductor'])),
    providerId: optionalText(readField(row, ['providerId', 'provider_id', 'id_proveedor', 'beneficiario'])),
    customerAge: clamp(Math.round(toNumber(readField(row, ['customerAge', 'age', 'insured_age'])) ?? 37), 18, 90),
    lineOfBusiness: mapLineOfBusiness(readField(row, ['lineOfBusiness', 'line_of_business', 'ramo'])),
    coverage: toText(readField(row, ['coverage', 'cobertura', 'ramo'])) ?? claimType,
    claimType,
    channel: mapChannel(readField(row, ['channel', 'report_channel', 'submission_channel'])),
    locationRegion:
      toText(readField(row, ['locationRegion', 'region', 'state', 'city', 'sucursal', 'ciudad'])) ?? 'Unknown',
    branch: optionalText(readField(row, ['branch', 'sucursal'])),
    vehicleYear: clamp(Math.round(toNumber(readField(row, ['vehicleYear', 'vehicle_year', 'car_year'])) ?? 2014), 1990, new Date().getFullYear()),
    vehicleMake: optionalText(readField(row, ['vehicleMake', 'marca'])),
    vehicleModel: optionalText(readField(row, ['vehicleModel', 'modelo'])),
    licensePlateHash: optionalText(readField(row, ['licensePlateHash', 'placa_hash'])),
    claimAmount: round(claimAmount),
    estimatedDamageAmount: round(estimatedDamageAmount),
    paidAmount: optionalNumber(readField(row, ['paidAmount', 'monto_pagado'])),
    claimStatus: optionalText(readField(row, ['claimStatus', 'estado'])),
    sumInsured: optionalNumber(readField(row, ['sumInsured', 'suma_asegurada'])),
    deductible: optionalNumber(readField(row, ['deductible', 'deducible'])),
    incidentsLast12Months: clamp(
      Math.round(toNumber(readField(row, ['incidentsLast12Months', 'incidents_last_12_months', 'prior_claims', 'historial_siniestros_asegurado'])) ?? 0),
      0,
      12,
    ),
    incidentsLast18Months: optionalNumber(readField(row, ['incidentsLast18Months', 'incidents_last_18_months'])),
    vehicleIncidentsLast18Months: optionalNumber(readField(row, ['vehicleIncidentsLast18Months', 'vehicle_incidents_last_18_months'])),
    driverIncidentsLast18Months: optionalNumber(readField(row, ['driverIncidentsLast18Months', 'driver_incidents_last_18_months'])),
    priorRcClaims: optionalNumber(readField(row, ['priorRcClaims', 'prior_rc_claims'])),
    daysSincePolicyStart: clamp(
      Math.round(toNumber(readField(row, ['daysSincePolicyStart', 'days_since_policy_start', 'dias_desde_inicio_poliza'])) ?? 180),
      0,
      4000,
    ),
    daysUntilPolicyEnd: optionalNumber(readField(row, ['daysUntilPolicyEnd', 'dias_desde_fin_poliza'])),
    daysBetweenOccurrenceReport: daysBetweenReport,
    occurredAt,
    submittedAt,
    isNightClaim: rawNight ?? (hour <= 5 || hour >= 21),
    documentsComplete: optionalBoolean(readField(row, ['documentsComplete', 'documentos_completos'])),
    missingCriticalDocument: optionalBoolean(readField(row, ['missingCriticalDocument', 'missing_critical_document'])),
    documentsInconsistent: optionalBoolean(readField(row, ['documentsInconsistent', 'documentos_inconsistentes', 'inconsistencia_detectada'])),
    beneficiaryType: optionalText(readField(row, ['beneficiaryType', 'beneficiario'])),
    providerObservedCases: providerObservedCases ?? undefined,
    providerInWatchlist: optionalBoolean(readField(row, ['providerInWatchlist', 'provider_watchlist', 'lista_restrictiva'])),
    accidentDynamics: optionalText(readField(row, ['accidentDynamics', 'dinamica_accidente'])),
    unidentifiedThirdParty: optionalBoolean(readField(row, ['unidentifiedThirdParty', 'sin_tercero_identificado'])),
    narrativeSimilarityMax: optionalNumber(readField(row, ['narrativeSimilarityMax', 'similitud_narrativa'])),
    narrativeGroup: optionalText(readField(row, ['narrativeGroup', 'grupo_narrativa'])),
    customerSegment: optionalText(readField(row, ['customerSegment', 'segmento'])),
    customerTenureMonths: optionalNumber(readField(row, ['customerTenureMonths', 'antiguedad_meses'])),
    customerPoliciesCount: optionalNumber(readField(row, ['customerPoliciesCount', 'numero_polizas'])),
    customerDelinquent: optionalBoolean(readField(row, ['customerDelinquent', 'mora_actual'])),
    customerScoreSimulated: optionalNumber(readField(row, ['customerScoreSimulated', 'score_cliente_simulado'])),
    fraudLabelSimulated: optionalNumber(readField(row, ['fraudLabelSimulated', 'etiqueta_fraude_simulada', 'fraud_label'])),
    mlFraudProbability: optionalNumber(readField(row, ['mlFraudProbability', 'fraud_probability', 'probabilidad_fraude'])),
    mlRiskScore: optionalNumber(readField(row, ['mlRiskScore', 'ml_risk_score'])),
    mlModelVersion: toText(readField(row, ['mlModelVersion', 'model_version'])) ?? 'external-import',
    reportNarrative:
      toText(readField(row, ['reportNarrative', 'description', 'narrative', 'incident_description', 'descripcion'])) ??
      'Registro importado desde dataset publico.',
    source: 'public',
    sourceDataset: datasetName,
  }

  return { claim }
}

function evaluateRuleRisk(claim: ClaimInput, duplicatesByCustomer: number, amountOutlier: boolean) {
  let score = 0
  const flags: string[] = []

  const amountRatio = claim.claimAmount / Math.max(claim.estimatedDamageAmount, 1)
  if (amountRatio >= 1.7) {
    score += 18
    flags.push('Monto reclamado muy superior al dano estimado')
  } else if (amountRatio >= 1.35) {
    score += 10
    flags.push('Monto reclamado superior al dano estimado')
  }

  const recentClaims = claim.incidentsLast18Months ?? claim.incidentsLast12Months
  if (recentClaims >= 3) {
    score += 8
    flags.push('Alta frecuencia de reclamos del asegurado')
  } else if (recentClaims === 2) {
    score += 4
    flags.push('Frecuencia moderada de reclamos recientes')
  }

  if ((claim.vehicleIncidentsLast18Months ?? 0) >= 3) {
    score += 6
    flags.push('Vehiculo con multiples siniestros recientes')
  } else if ((claim.vehicleIncidentsLast18Months ?? 0) === 2) {
    score += 3
    flags.push('Vehiculo con frecuencia moderada de siniestros')
  }

  if ((claim.driverIncidentsLast18Months ?? 0) >= 3) {
    score += 8
    flags.push('Conductor con multiples siniestros recientes')
  } else if ((claim.driverIncidentsLast18Months ?? 0) === 2) {
    score += 4
    flags.push('Conductor con frecuencia moderada de siniestros')
  }

  if ((claim.priorRcClaims ?? 0) > 2) {
    score += 6
    flags.push('Frecuencia atipica de reclamos solo RC')
  } else if ((claim.priorRcClaims ?? 0) === 1) {
    score += 3
    flags.push('Antecedente de reclamo de responsabilidad civil')
  }

  if (claim.daysSincePolicyStart <= 10) {
    score += 8
    flags.push('Siniestro extremo cerca del inicio de vigencia')
  } else if (claim.daysSincePolicyStart <= 30) {
    score += 4
    flags.push('Siniestro cercano al inicio de vigencia')
  }

  if ((claim.daysUntilPolicyEnd ?? 9999) <= 10) {
    score += 8
    flags.push('Siniestro extremo cerca del fin de vigencia')
  } else if ((claim.daysUntilPolicyEnd ?? 9999) <= 30) {
    score += 4
    flags.push('Siniestro cercano al fin de vigencia')
  }

  const reportDelay = claim.daysBetweenOccurrenceReport ?? daysBetween(claim.occurredAt, claim.submittedAt)
  if (claim.claimType === 'theft' && reportDelay > 4) {
    score += 8
    flags.push('Demora atipica en denuncia de robo')
  } else if (claim.claimType === 'theft' && reportDelay >= 2) {
    score += 4
    flags.push('Demora moderada en denuncia de robo')
  }

  if (reportDelay > 7) {
    score += 5
    flags.push('Reporte tardio del evento')
  } else if (reportDelay >= 4) {
    score += 3
    flags.push('Reporte con demora frente a la ocurrencia')
  }

  if (claim.providerInWatchlist) {
    score += 10
    flags.push('Proveedor o beneficiario en lista restrictiva simulada')
  } else if ((claim.providerObservedCases ?? 0) > 2) {
    score += 5
    flags.push('Proveedor recurrente en casos observados')
  }

  if (claim.documentsInconsistent) {
    score += 10
    flags.push('Documentos inconsistentes o con fechas no coincidentes')
  } else if (claim.missingCriticalDocument || claim.documentsComplete === false) {
    score += 4
    flags.push('Documentos incompletos para revision')
  }

  if (claim.accidentDynamics === 'illogical') {
    score += 6
    flags.push('Dinamica del accidente requiere revision minuciosa')
  } else if (claim.isNightClaim && ['multiple', 'volcadura'].includes(claim.accidentDynamics ?? '')) {
    score += 3
    flags.push('Accidente complejo reportado de madrugada')
  }

  if (claim.unidentifiedThirdParty) {
    score += 5
    flags.push('Evento sin tercero identificado')
  }

  if ((claim.narrativeSimilarityMax ?? 0) > 0.85) {
    score += 8
    flags.push('Narrativa muy similar a otros reclamos')
  } else if ((claim.narrativeSimilarityMax ?? 0) >= 0.7) {
    score += 4
    flags.push('Narrativa parecida a otros reclamos')
  }

  if (claim.claimAmount / Math.max(claim.sumInsured ?? claim.claimAmount * 2, 1) >= 0.95) {
    score += 5
    flags.push('Monto cercano a la suma asegurada')
  }

  if (claim.isNightClaim && claim.channel === 'callcenter') {
    score += 6
    flags.push('Reporte nocturno por call center')
  }

  if (claim.vehicleYear < 2006 && claim.claimAmount > 14000) {
    score += 5
    flags.push('Monto alto para vehiculo antiguo')
  }

  if (claim.claimType === 'theft') {
    score += 5
    flags.push('Cobertura de robo con mayor exposicion historica')
  }

  if (duplicatesByCustomer >= 2) {
    score += 10
    flags.push('Multiples siniestros recientes del mismo cliente')
  } else if (duplicatesByCustomer === 1) {
    score += 4
    flags.push('Otro siniestro cercano del mismo cliente')
  }

  if (amountOutlier) {
    score += 7
    flags.push('Monto atipico frente al universo de reclamos')
  }

  return { score: clamp(score, 0, 100), flags }
}

function evaluateClaimRisk(claim: ClaimInput, duplicatesByCustomer: number, amountOutlier: boolean) {
  const ruleRisk = evaluateRuleRisk(claim, duplicatesByCustomer, amountOutlier)
  const mlScore =
    typeof claim.mlRiskScore === 'number'
      ? claim.mlRiskScore
      : typeof claim.mlFraudProbability === 'number'
        ? claim.mlFraudProbability * 100
        : null
  const score = clamp(Math.round(mlScore === null ? ruleRisk.score : ruleRisk.score * 0.45 + mlScore * 0.55), 0, 100)
  const level = riskLevelFromScore(score)
  const flags = [...ruleRisk.flags]

  if (mlScore !== null && mlScore >= 76) {
    flags.unshift('Modelo scikit-learn predice probabilidad alta de posible fraude')
  } else if (mlScore !== null && mlScore >= 41) {
    flags.unshift('Modelo scikit-learn predice riesgo medio')
  }

  const explanation =
    flags.length === 0
      ? 'No se detectaron senales relevantes fuera del comportamiento esperado.'
      : `Score combinado IA/reglas ${score}/100. Senales principales: ${flags.slice(0, 3).join('; ')}.`
  const recommendedAction =
    level === 'red'
      ? 'Escalar a Unidad Antifraude para revision especializada de campo.'
      : level === 'yellow'
        ? 'Escalar a revision documental y validar soportes.'
        : 'Continuar flujo normal con monitoreo automatizado.'

  return {
    score,
    ruleScore: ruleRisk.score,
    mlScore: mlScore === null ? null : Math.round(mlScore),
    level,
    flags,
    explanation,
    recommendedAction,
  }
}

function enrichClaims(rawClaims: ClaimDoc[]): EnrichedClaim[] {
  if (rawClaims.length === 0) return []

  const sortedAmounts = rawClaims.map((claim) => claim.claimAmount).sort((a, b) => a - b)
  const highAmountThreshold =
    sortedAmounts[Math.floor(sortedAmounts.length * 0.9)] ?? sortedAmounts[sortedAmounts.length - 1] ?? 0

  const byCustomerRecentCount = new Map<string, number>()
  for (const claim of rawClaims) {
    byCustomerRecentCount.set(claim.customerId, (byCustomerRecentCount.get(claim.customerId) ?? 0) + 1)
  }

  return rawClaims.map((claim) => {
    const duplicatesByCustomer = Math.max((byCustomerRecentCount.get(claim.customerId) ?? 1) - 1, 0)
    const risk = evaluateClaimRisk(claim, duplicatesByCustomer, claim.claimAmount >= highAmountThreshold)

    return {
      ...claim,
      riskScore: risk.score,
      ruleRiskScore: risk.ruleScore,
      mlScore: risk.mlScore,
      riskLevel: risk.level,
      anomalyFlags: risk.flags,
      explanation: risk.explanation,
      recommendedAction: risk.recommendedAction,
    }
  })
}

function parseRiskIntent(question: string): AssistantIntent {
  const q = question.toLowerCase()
  if (q.includes('por que') || q.includes('porque') || q.includes('explica') || q.includes('marcado')) return 'why'
  if (q.includes('proveedor') || q.includes('beneficiario') || q.includes('taller')) return 'provider'
  if (q.includes('ciudad') || q.includes('sucursal') || q.includes('region')) return 'city'
  if (q.includes('ramo') || q.includes('cobertura')) return 'line'
  if (q.includes('documento') || q.includes('faltan') || q.includes('incomplet')) return 'documents'
  if (q.includes('inicio') || q.includes('vigencia') || q.includes('poliza')) return 'near_start'
  if (q.includes('resumen') || q.includes('ejecutivo') || q.includes('recomienda') || q.includes('primero')) return 'summary'
  if (q.includes('rojo') || q.includes('alto riesgo') || q.includes('fraude') || q.includes('mayor riesgo')) return 'red'
  if (q.includes('amarillo') || q.includes('medio riesgo')) return 'yellow'
  if (q.includes('verde') || q.includes('bajo riesgo')) return 'green'
  if (q.includes('anom') || q.includes('patron') || q.includes('atipic')) return 'anomalies'
  if (q.includes('monto') || q.includes('costoso') || q.includes('alto valor')) return 'amount'
  if (q.includes('cliente') || q.includes('customer') || q.includes('cust-')) return 'customer'
  return 'help'
}

function extractCustomerId(question: string) {
  const match = question.toUpperCase().match(/CUST-[A-Z0-9-]+/)
  return match ? match[0] : null
}

function extractClaimNumber(question: string) {
  const match = question.toUpperCase().match(/(?:CLM|PUB)-[A-Z0-9-]+/)
  return match ? match[0] : null
}

function topBy<T extends string>(
  claims: EnrichedClaim[],
  select: (claim: EnrichedClaim) => T | undefined | null,
  limit = 5,
) {
  const counts = new Map<string, number>()
  for (const claim of claims) {
    const key = select(claim) ?? 'Sin dato'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

export const seedSyntheticData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const shouldForce = args.force === true
    const existingClaims = await ctx.db.query('claims').collect()
    const existingPolicies = await ctx.db.query('policies').collect()
    const existingInsureds = await ctx.db.query('insureds').collect()
    const existingVehicles = await ctx.db.query('vehicles').collect()
    const existingProviders = await ctx.db.query('providers').collect()
    const existingDocuments = await ctx.db.query('claimDocuments').collect()

    const existingClaimNumbers = new Set(existingClaims.map((claim) => claim.claimNumber))
    const existingPolicyIds = new Set(existingPolicies.map((policy) => policy.policyId))
    const existingCustomerIds = new Set(existingInsureds.map((insured) => insured.customerId))
    const existingVehicleIds = new Set(existingVehicles.map((vehicle) => vehicle.vehicleId))
    const existingProviderIds = new Set(existingProviders.map((provider) => provider.providerId))
    const existingDocumentIds = new Set(existingDocuments.map((document) => document.documentId))

    let inserted = 0
    let skippedExisting = 0
    let yellowInserted = 0

    const ensureRelatedData = async (claim: ClaimInput, i: number) => {
      const startAt = claim.occurredAt - claim.daysSincePolicyStart * 24 * 60 * 60 * 1000
      const endAt = claim.occurredAt + (claim.daysUntilPolicyEnd ?? 365) * 24 * 60 * 60 * 1000

      if (!existingCustomerIds.has(claim.customerId)) {
        await ctx.db.insert('insureds', {
          customerId: claim.customerId,
          segment: claim.customerSegment ?? 'Retail',
          tenureMonths: claim.customerTenureMonths ?? 24,
          city: claim.locationRegion,
          policiesCount: claim.customerPoliciesCount ?? 1,
          claimsLast12Months: claim.incidentsLast12Months,
          delinquent: claim.customerDelinquent ?? false,
          customerScoreSimulated: claim.customerScoreSimulated ?? 650,
        })
        existingCustomerIds.add(claim.customerId)
      }

      if (claim.vehicleId && !existingVehicleIds.has(claim.vehicleId)) {
        await ctx.db.insert('vehicles', {
          vehicleId: claim.vehicleId,
          customerId: claim.customerId,
          licensePlateHash: claim.licensePlateHash ?? `LP-${i}`,
          chassisHash: `CH-${(i * 3571).toString(16).toUpperCase()}`,
          engineHash: `EN-${(i * 1999).toString(16).toUpperCase()}`,
          make: claim.vehicleMake ?? 'Generica',
          model: claim.vehicleModel ?? 'Modelo',
          year: claim.vehicleYear,
        })
        existingVehicleIds.add(claim.vehicleId)
      }

      if (claim.providerId && !existingProviderIds.has(claim.providerId)) {
        await ctx.db.insert('providers', {
          providerId: claim.providerId,
          type: claim.beneficiaryType ?? 'Taller',
          city: claim.locationRegion,
          associatedClaims: claim.providerObservedCases ?? 0,
          averageClaimAmount: claim.claimAmount,
          observedCaseRate: round((claim.providerObservedCases ?? 0) / 20),
          tenureMonths: Math.floor(6 + seedRandom(i + 300) * 72),
          inWatchlist: claim.providerInWatchlist ?? false,
        })
        existingProviderIds.add(claim.providerId)
      }

      if (!existingPolicyIds.has(claim.policyId)) {
        await ctx.db.insert('policies', {
          policyId: claim.policyId,
          customerId: claim.customerId,
          lineOfBusiness: claim.lineOfBusiness ?? 'vehicles',
          startAt,
          endAt,
          premium: Math.round((claim.sumInsured ?? claim.claimAmount * 2) * 0.035),
          sumInsured: claim.sumInsured ?? claim.claimAmount * 2,
          deductible: claim.deductible ?? 450,
          salesChannel: claim.channel,
          city: claim.locationRegion,
          status: 'Activa',
        })
        existingPolicyIds.add(claim.policyId)
      }

      const documentTypes = ['denuncia', 'factura', 'informe_pericial']
      for (let j = 0; j < documentTypes.length; j += 1) {
        const documentId = `DOC-${claim.claimNumber}-${j + 1}`
        if (existingDocumentIds.has(documentId)) continue
        const isMissingCritical = claim.missingCriticalDocument && j === 0
        await ctx.db.insert('claimDocuments', {
          documentId,
          claimNumber: claim.claimNumber,
          documentType: documentTypes[j],
          delivered: !isMissingCritical,
          legible: !claim.documentsInconsistent,
          issuedAt: claim.submittedAt - j * 24 * 60 * 60 * 1000,
          inconsistencyDetected: claim.documentsInconsistent ?? false,
          observation: isMissingCritical ? 'Documento legal obligatorio pendiente' : undefined,
        })
        existingDocumentIds.add(documentId)
      }
    }

    for (let i = 0; i < 120; i += 1) {
      const claim = buildSyntheticClaim(i)
      if (existingClaimNumbers.has(claim.claimNumber)) {
        skippedExisting += 1
        continue
      }
      await ensureRelatedData(claim, i)
      await ctx.db.insert('claims', claim)
      existingClaimNumbers.add(claim.claimNumber)
      inserted += 1
    }

    for (let i = 0; i < 24; i += 1) {
      const claim = buildYellowRiskClaim(i)
      if (existingClaimNumbers.has(claim.claimNumber)) {
        skippedExisting += 1
        continue
      }
      await ensureRelatedData(claim, 10_000 + i)
      await ctx.db.insert('claims', claim)
      existingClaimNumbers.add(claim.claimNumber)
      inserted += 1
      yellowInserted += 1
    }

    return {
      inserted,
      skippedExisting,
      yellowInserted,
      message:
        shouldForce
          ? 'Datos sinteticos cargados sin reemplazo; force activo solo mantiene compatibilidad.'
          : 'Datos sinteticos cargados; los siniestros existentes se omitieron automaticamente.',
    }
  },
})

export const listWithRisk = query({
  args: {
    riskLevel: v.optional(v.union(v.literal('green'), v.literal('yellow'), v.literal('red'))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rawClaims = await ctx.db.query('claims').withIndex('by_submitted_at').order('desc').collect()
    const enriched = enrichClaims(rawClaims)

    const text = args.search?.trim().toLowerCase()
    const filtered = enriched.filter((claim) => {
      if (args.riskLevel && claim.riskLevel !== args.riskLevel) return false
      if (!text) return true
      const haystack = [
        claim.claimNumber,
        claim.customerId,
        claim.policyId,
        claim.providerId,
        claim.vehicleId,
        claim.claimType,
        claim.coverage,
        claim.locationRegion,
        claim.reportNarrative,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(text)
    })

    const limit = clamp(Math.floor(args.limit ?? 50), 1, 200)
    return filtered.slice(0, limit)
  },
})

export const importPublicClaims = mutation({
  args: {
    datasetName: v.optional(v.string()),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const datasetName = args.datasetName?.trim() || 'public-dataset'
    const existingClaims = await ctx.db.query('claims').collect()
    const existingClaimNumbers = new Set(
      existingClaims.map((claim) => claim.claimNumber),
    )
    const incomingClaimNumbers = new Set<string>()
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < args.rows.length; i += 1) {
      const row = asRecord(args.rows[i])
      if (!row) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: estructura invalida`)
        continue
      }

      const normalized = normalizePublicClaim(row, i, datasetName)
      if (!normalized.claim) {
        skipped += 1
        if (normalized.reason && errors.length < 8) errors.push(normalized.reason)
        continue
      }

      const claimNumber = normalized.claim.claimNumber
      if (
        existingClaimNumbers.has(claimNumber) ||
        incomingClaimNumbers.has(claimNumber)
      ) {
        skipped += 1
        if (errors.length < 8) {
          errors.push(
            `Fila ${i + 1}: siniestro duplicado (${claimNumber}), se omitio`,
          )
        }
        continue
      }

      await ctx.db.insert('claims', normalized.claim)
      existingClaimNumbers.add(claimNumber)
      incomingClaimNumbers.add(claimNumber)
      inserted += 1
    }

    return {
      inserted,
      skipped,
      totalReceived: args.rows.length,
      errors,
      message: inserted > 0 ? 'Carga de datos publicos completada.' : 'No se pudo importar ningun registro.',
    }
  },
})

function normalizePolicyImport(row: Record<string, unknown>, index: number) {
  const policyId = toText(readField(row, ['policyId', 'policy_id', 'policy_number', 'id_poliza', 'poliza_id']))
  const customerId = toText(readField(row, ['customerId', 'customer_id', 'insured_id', 'id_asegurado']))
  const lineOfBusiness = toText(readField(row, ['lineOfBusiness', 'line_of_business', 'ramo']))
  const startAt = toTimestamp(readField(row, ['startAt', 'start_at', 'policy_start', 'fecha_inicio']))
  const endAt = toTimestamp(readField(row, ['endAt', 'end_at', 'policy_end', 'fecha_fin']))
  const premium = toNumber(readField(row, ['premium', 'prima']))
  const sumInsured = toNumber(readField(row, ['sumInsured', 'sum_insured', 'suma_asegurada']))
  const deductible = toNumber(readField(row, ['deductible', 'deducible']))
  const salesChannel = toText(readField(row, ['salesChannel', 'sales_channel', 'canal_venta']))
  const city = toText(readField(row, ['city', 'ciudad', 'locationRegion', 'region']))
  const status = toText(readField(row, ['status', 'estado', 'estado_poliza']))
  const missing = [
    !policyId ? 'id_poliza' : null,
    !customerId ? 'id_asegurado' : null,
    !lineOfBusiness ? 'ramo' : null,
    startAt === null ? 'fecha_inicio' : null,
    endAt === null ? 'fecha_fin' : null,
    premium === null ? 'prima' : null,
    sumInsured === null ? 'suma_asegurada' : null,
    deductible === null ? 'deducible' : null,
    !salesChannel ? 'canal_venta' : null,
    !city ? 'ciudad' : null,
    !status ? 'estado_poliza' : null,
  ].filter(Boolean)

  if (
    missing.length > 0 ||
    !policyId ||
    !customerId ||
    !lineOfBusiness ||
    startAt === null ||
    endAt === null ||
    premium === null ||
    sumInsured === null ||
    deductible === null ||
    !salesChannel ||
    !city ||
    !status
  ) {
    return { value: null, reason: `Fila ${index + 1}: faltan campos minimos (${missing.join(', ')})` }
  }

  return {
    value: {
      policyId,
      customerId,
      vehicleId: optionalText(readField(row, ['vehicleId', 'vehicle_id', 'id_vehiculo'])),
      lineOfBusiness,
      startAt,
      endAt,
      premium,
      sumInsured,
      deductible,
      salesChannel,
      city,
      status,
    },
  }
}

function normalizeInsuredImport(row: Record<string, unknown>, index: number) {
  const customerId = toText(readField(row, ['customerId', 'customer_id', 'insured_id', 'id_asegurado']))
  const segment = toText(readField(row, ['segment', 'segmento']))
  const tenureMonths = toNumber(readField(row, ['tenureMonths', 'tenure_months', 'antiguedad_meses', 'antiguedad']))
  const city = toText(readField(row, ['city', 'ciudad', 'locationRegion', 'region']))
  const policiesCount = toNumber(readField(row, ['policiesCount', 'policies_count', 'numero_polizas', 'numero_de_polizas']))
  const claimsLast12Months = toNumber(
    readField(row, [
      'claimsLast12Months',
      'claims_last_12_months',
      'reclamos_12m',
      'reclamos_ultimos_12_meses',
    ]),
  )
  const delinquent = toBoolean(readField(row, ['delinquent', 'mora_actual', 'en_mora']))
  const customerScoreSimulated = toNumber(
    readField(row, ['customerScoreSimulated', 'customer_score_simulated', 'score_cliente_simulado']),
  )
  const missing = [
    !customerId ? 'id_asegurado' : null,
    !segment ? 'segmento' : null,
    tenureMonths === null ? 'antiguedad' : null,
    !city ? 'ciudad' : null,
    policiesCount === null ? 'numero_polizas' : null,
    claimsLast12Months === null ? 'reclamos_ultimos_12_meses' : null,
    delinquent === null ? 'mora_actual' : null,
    customerScoreSimulated === null ? 'score_cliente_simulado' : null,
  ].filter(Boolean)

  if (
    missing.length > 0 ||
    !customerId ||
    !segment ||
    tenureMonths === null ||
    !city ||
    policiesCount === null ||
    claimsLast12Months === null ||
    delinquent === null ||
    customerScoreSimulated === null
  ) {
    return { value: null, reason: `Fila ${index + 1}: faltan campos minimos (${missing.join(', ')})` }
  }

  return {
    value: {
      customerId,
      segment,
      tenureMonths: Math.round(tenureMonths),
      city,
      policiesCount: Math.round(policiesCount),
      claimsLast12Months: Math.round(claimsLast12Months),
      delinquent,
      customerScoreSimulated: Math.round(customerScoreSimulated),
    },
  }
}

function normalizeProviderImport(row: Record<string, unknown>, index: number) {
  const providerId = toText(
    readField(row, ['providerId', 'provider_id', 'beneficiaryId', 'beneficiary_id', 'id_proveedor', 'id_beneficiario']),
  )
  const type = toText(readField(row, ['type', 'tipo', 'beneficiaryType', 'beneficiario']))
  const city = toText(readField(row, ['city', 'ciudad', 'locationRegion', 'region']))
  const associatedClaims = toNumber(readField(row, ['associatedClaims', 'associated_claims', 'reclamos_asociados']))
  const averageClaimAmount = toNumber(
    readField(row, ['averageClaimAmount', 'average_claim_amount', 'monto_promedio', 'monto_promedio_reclamado']),
  )
  const observedCaseRateRaw = toNumber(
    readField(row, [
      'observedCaseRate',
      'observed_case_rate',
      'tasa_observada',
      'porcentaje_casos_observados',
      'porcentaje_de_casos_observados',
    ]),
  )
  const tenureMonths = toNumber(readField(row, ['tenureMonths', 'tenure_months', 'antiguedad_meses', 'antiguedad']))
  const missing = [
    !providerId ? 'id_proveedor' : null,
    !type ? 'tipo' : null,
    !city ? 'ciudad' : null,
    associatedClaims === null ? 'reclamos_asociados' : null,
    averageClaimAmount === null ? 'monto_promedio_reclamado' : null,
    observedCaseRateRaw === null ? 'porcentaje_de_casos_observados' : null,
    tenureMonths === null ? 'antiguedad' : null,
  ].filter(Boolean)

  if (
    missing.length > 0 ||
    !providerId ||
    !type ||
    !city ||
    associatedClaims === null ||
    averageClaimAmount === null ||
    observedCaseRateRaw === null ||
    tenureMonths === null
  ) {
    return { value: null, reason: `Fila ${index + 1}: faltan campos minimos (${missing.join(', ')})` }
  }

  return {
    value: {
      providerId,
      type,
      city,
      associatedClaims: Math.round(associatedClaims),
      averageClaimAmount,
      observedCaseRate: observedCaseRateRaw > 1 ? round(observedCaseRateRaw / 100, 4) : observedCaseRateRaw,
      tenureMonths: Math.round(tenureMonths),
      inWatchlist: toBoolean(readField(row, ['inWatchlist', 'in_watchlist', 'provider_watchlist', 'lista_restrictiva'])) ?? false,
    },
  }
}

function normalizeDocumentImport(row: Record<string, unknown>, index: number) {
  const claimNumber = toText(readField(row, ['claimNumber', 'claim_number', 'claim_id', 'id_siniestro']))
  const documentType = toText(readField(row, ['documentType', 'document_type', 'tipo_documento']))
  const documentId = toText(readField(row, ['documentId', 'document_id', 'id_documento']))
  const delivered = toBoolean(readField(row, ['delivered', 'entregado']))
  const legible = toBoolean(readField(row, ['legible']))
  const issuedAt = toTimestamp(readField(row, ['issuedAt', 'issued_at', 'fecha_emision']))
  const inconsistencyDetected = toBoolean(
    readField(row, ['inconsistencyDetected', 'inconsistency_detected', 'inconsistencia_detectada']),
  )
  const missing = [
    !documentId ? 'id_documento' : null,
    !claimNumber ? 'id_siniestro' : null,
    !documentType ? 'tipo_documento' : null,
    delivered === null ? 'entregado' : null,
    legible === null ? 'legible' : null,
    issuedAt === null ? 'fecha_emision' : null,
    inconsistencyDetected === null ? 'inconsistencia_detectada' : null,
  ].filter(Boolean)

  if (
    missing.length > 0 ||
    !documentId ||
    !claimNumber ||
    !documentType ||
    delivered === null ||
    legible === null ||
    issuedAt === null ||
    inconsistencyDetected === null
  ) {
    return { value: null, reason: `Fila ${index + 1}: faltan campos minimos (${missing.join(', ')})` }
  }

  return {
    value: {
      documentId,
      claimNumber,
      documentType,
      delivered,
      legible,
      issuedAt,
      inconsistencyDetected,
      observation: optionalText(readField(row, ['observation', 'observacion'])),
    },
  }
}

function buildImportResult(inserted: number, skipped: number, totalReceived: number, errors: string[], label: string) {
  return {
    inserted,
    skipped,
    totalReceived,
    errors,
    message: inserted > 0 ? `${label} importados correctamente.` : `No se importaron ${label.toLowerCase()}.`,
  }
}

export const importPolicies = mutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('policies').collect()
    const existingIds = new Set(existing.map((policy) => policy.policyId))
    const incomingIds = new Set<string>()
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < args.rows.length; i += 1) {
      const row = asRecord(args.rows[i])
      if (!row) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: estructura invalida`)
        continue
      }
      const normalized = normalizePolicyImport(row, i)
      if (!normalized.value) {
        skipped += 1
        if (normalized.reason && errors.length < 8) errors.push(normalized.reason)
        continue
      }
      if (existingIds.has(normalized.value.policyId) || incomingIds.has(normalized.value.policyId)) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: poliza duplicada (${normalized.value.policyId})`)
        continue
      }
      await ctx.db.insert('policies', normalized.value)
      existingIds.add(normalized.value.policyId)
      incomingIds.add(normalized.value.policyId)
      inserted += 1
    }

    return buildImportResult(inserted, skipped, args.rows.length, errors, 'Polizas')
  },
})

export const importInsureds = mutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('insureds').collect()
    const existingIds = new Set(existing.map((insured) => insured.customerId))
    const incomingIds = new Set<string>()
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < args.rows.length; i += 1) {
      const row = asRecord(args.rows[i])
      if (!row) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: estructura invalida`)
        continue
      }
      const normalized = normalizeInsuredImport(row, i)
      if (!normalized.value) {
        skipped += 1
        if (normalized.reason && errors.length < 8) errors.push(normalized.reason)
        continue
      }
      if (existingIds.has(normalized.value.customerId) || incomingIds.has(normalized.value.customerId)) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: asegurado duplicado (${normalized.value.customerId})`)
        continue
      }
      await ctx.db.insert('insureds', normalized.value)
      existingIds.add(normalized.value.customerId)
      incomingIds.add(normalized.value.customerId)
      inserted += 1
    }

    return buildImportResult(inserted, skipped, args.rows.length, errors, 'Asegurados')
  },
})

export const importProviders = mutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('providers').collect()
    const existingIds = new Set(existing.map((provider) => provider.providerId))
    const incomingIds = new Set<string>()
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < args.rows.length; i += 1) {
      const row = asRecord(args.rows[i])
      if (!row) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: estructura invalida`)
        continue
      }
      const normalized = normalizeProviderImport(row, i)
      if (!normalized.value) {
        skipped += 1
        if (normalized.reason && errors.length < 8) errors.push(normalized.reason)
        continue
      }
      if (existingIds.has(normalized.value.providerId) || incomingIds.has(normalized.value.providerId)) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: beneficiario duplicado (${normalized.value.providerId})`)
        continue
      }
      await ctx.db.insert('providers', normalized.value)
      existingIds.add(normalized.value.providerId)
      incomingIds.add(normalized.value.providerId)
      inserted += 1
    }

    return buildImportResult(inserted, skipped, args.rows.length, errors, 'Beneficiarios')
  },
})

export const importClaimDocuments = mutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('claimDocuments').collect()
    const existingIds = new Set(existing.map((document) => document.documentId))
    const incomingIds = new Set<string>()
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < args.rows.length; i += 1) {
      const row = asRecord(args.rows[i])
      if (!row) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: estructura invalida`)
        continue
      }
      const normalized = normalizeDocumentImport(row, i)
      if (!normalized.value) {
        skipped += 1
        if (normalized.reason && errors.length < 8) errors.push(normalized.reason)
        continue
      }
      if (existingIds.has(normalized.value.documentId) || incomingIds.has(normalized.value.documentId)) {
        skipped += 1
        if (errors.length < 8) errors.push(`Fila ${i + 1}: documento duplicado (${normalized.value.documentId})`)
        continue
      }
      await ctx.db.insert('claimDocuments', normalized.value)
      existingIds.add(normalized.value.documentId)
      incomingIds.add(normalized.value.documentId)
      inserted += 1
    }

    return buildImportResult(inserted, skipped, args.rows.length, errors, 'Documentos')
  },
})

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const claims = await ctx.db.query('claims').collect()
    const policies = await ctx.db.query('policies').collect()
    const insureds = await ctx.db.query('insureds').collect()
    const vehicles = await ctx.db.query('vehicles').collect()
    const providers = await ctx.db.query('providers').collect()
    const documents = await ctx.db.query('claimDocuments').collect()

    if (claims.length === 0) {
      return {
        total: 0,
        averageRiskScore: 0,
        averageMlRiskScore: 0,
        byLevel: { green: 0, yellow: 0, red: 0 },
        bySource: { synthetic: 0, public: 0 },
        modelVersion: 'sklearn-random-forest-v1',
        dataModelCounts: { claims: 0, policies: 0, insureds: 0, vehicles: 0, providers: 0, documents: 0 },
        topAnomalies: [] as Array<{ flag: string; count: number }>,
        topProviders: [] as Array<{ label: string; count: number }>,
        topCities: [] as Array<{ label: string; count: number }>,
        topLines: [] as Array<{ label: string; count: number }>,
        criticalDocumentsMissing: 0,
        estimatedSavingsOpportunity: 0,
      }
    }

    const enriched = enrichClaims(claims)
    let totalScore = 0
    let totalMlScore = 0
    let mlCount = 0
    const byLevel: Record<RiskLevel, number> = { green: 0, yellow: 0, red: 0 }
    const bySource: Record<ClaimSource, number> = { synthetic: 0, public: 0 }
    const flagCount = new Map<string, number>()

    for (const claim of enriched) {
      totalScore += claim.riskScore
      if (claim.mlScore !== null) {
        totalMlScore += claim.mlScore
        mlCount += 1
      }
      byLevel[claim.riskLevel] += 1
      if (claim.source === 'public') bySource.public += 1
      else bySource.synthetic += 1
      for (const flag of claim.anomalyFlags) flagCount.set(flag, (flagCount.get(flag) ?? 0) + 1)
    }

    const topAnomalies = [...flagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flag, count]) => ({ flag, count }))

    return {
      total: claims.length,
      averageRiskScore: Number((totalScore / claims.length).toFixed(1)),
      averageMlRiskScore: mlCount > 0 ? Number((totalMlScore / mlCount).toFixed(1)) : 0,
      byLevel,
      bySource,
      modelVersion: enriched.find((claim) => claim.mlModelVersion)?.mlModelVersion ?? 'sklearn-random-forest-v1',
      dataModelCounts: {
        claims: claims.length,
        policies: policies.length,
        insureds: insureds.length,
        vehicles: vehicles.length,
        providers: providers.length,
        documents: documents.length,
      },
      topAnomalies,
      topProviders: topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.providerId),
      topCities: topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.locationRegion),
      topLines: topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.coverage ?? claim.lineOfBusiness),
      criticalDocumentsMissing: enriched.filter((claim) => claim.riskLevel === 'red' && claim.documentsComplete === false).length,
      estimatedSavingsOpportunity: Math.round(byLevel.red * 1400 + byLevel.yellow * 420),
    }
  },
})

export const askAnalystAssistant = query({
  args: { question: v.string() },
  handler: async (ctx, args) => {
    const question = args.question.trim()
    if (!question) {
      return {
        intent: 'help',
        answer: 'Escribe una consulta para analizar siniestros.',
        recommendedAction: 'Prueba: "10 casos de mayor riesgo" o "proveedores con mas alertas".',
        claims: [],
      }
    }

    const rawClaims = await ctx.db.query('claims').withIndex('by_submitted_at').order('desc').collect()
    const enriched = enrichClaims(rawClaims).sort((a, b) => b.riskScore - a.riskScore)
    const intent = parseRiskIntent(question)

    if (intent === 'red' || intent === 'yellow' || intent === 'green') {
      const claims = enriched.filter((claim) => claim.riskLevel === intent).slice(0, 10)
      return {
        intent,
        answer: `Se encontraron ${claims.length} casos principales en nivel ${intent}.`,
        recommendedAction:
          intent === 'red'
            ? 'Revisar primero soportes, proveedor, documentos y consistencia narrativa.'
            : 'Validar contexto documental y monitorear recurrencia.',
        claims,
      }
    }

    if (intent === 'why') {
      const claimNumber = extractClaimNumber(question)
      const claim = claimNumber ? enriched.find((item) => item.claimNumber === claimNumber) : enriched[0]
      return {
        intent,
        answer: claim
          ? `${claim.claimNumber} fue clasificado ${claim.riskLevel} con score ${claim.riskScore}. ${claim.explanation}`
          : 'No encontre el siniestro solicitado.',
        recommendedAction: claim?.recommendedAction ?? 'Consulta sugerida: "por que CLM-00001 fue marcado".',
        claims: claim ? [claim] : [],
      }
    }

    if (intent === 'amount') {
      const claims = [...enriched].sort((a, b) => b.claimAmount - a.claimAmount).slice(0, 10)
      return {
        intent,
        answer: 'Estos son los siniestros con mayor monto reclamado.',
        recommendedAction: 'Verifica coherencia entre valor reclamado, peritaje, suma asegurada y antiguedad del activo.',
        claims,
      }
    }

    if (intent === 'customer') {
      const customerId = extractCustomerId(question)
      const claims = customerId ? enriched.filter((claim) => claim.customerId === customerId).slice(0, 20) : []
      return {
        intent,
        answer: customerId ? `Se encontraron ${claims.length} siniestros para ${customerId}.` : 'No identifique un customerId (ejemplo: CUST-401).',
        recommendedAction: 'Revisa frecuencia, fechas de vigencia y similitud narrativa del asegurado.',
        claims,
      }
    }

    if (intent === 'provider') {
      const top = topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.providerId, 6)
      return {
        intent,
        answer: `Proveedores con mas alertas: ${top.map((item) => `${item.label} (${item.count})`).join(', ')}.`,
        recommendedAction: 'Cruzar proveedor contra lista restrictiva, montos promedio y documentos inconsistentes.',
        claims: enriched.filter((claim) => claim.providerId === top[0]?.label).slice(0, 8),
      }
    }

    if (intent === 'city') {
      const top = topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.locationRegion, 6)
      return {
        intent,
        answer: `Ciudades con mayor concentracion de alertas: ${top.map((item) => `${item.label} (${item.count})`).join(', ')}.`,
        recommendedAction: 'Priorizar auditoria por concentracion territorial y canal de reporte.',
        claims: enriched.filter((claim) => claim.locationRegion === top[0]?.label).slice(0, 8),
      }
    }

    if (intent === 'line') {
      const top = topBy(enriched.filter((claim) => claim.riskLevel !== 'green'), (claim) => claim.coverage ?? claim.lineOfBusiness, 6)
      return {
        intent,
        answer: `Ramos o coberturas con mas alertas: ${top.map((item) => `${item.label} (${item.count})`).join(', ')}.`,
        recommendedAction: 'Calibrar umbrales por cobertura para evitar sesgos y falsos positivos.',
        claims: enriched.filter((claim) => (claim.coverage ?? claim.lineOfBusiness) === top[0]?.label).slice(0, 8),
      }
    }

    if (intent === 'documents') {
      const claims = enriched.filter((claim) => claim.documentsComplete === false || claim.documentsInconsistent).slice(0, 10)
      return {
        intent,
        answer: `Hay ${claims.length} casos principales con documentos faltantes o inconsistentes.`,
        recommendedAction: 'Solicitar denuncia, factura e informe pericial antes de cualquier decision.',
        claims,
      }
    }

    if (intent === 'near_start') {
      const claims = enriched.filter((claim) => claim.daysSincePolicyStart <= 30 || (claim.daysUntilPolicyEnd ?? 9999) <= 30).slice(0, 10)
      return {
        intent,
        answer: `Se detectaron ${claims.length} casos cercanos al inicio o fin de vigencia.`,
        recommendedAction: 'Validar fecha de emision, vigencia, pago de prima y consistencia del evento.',
        claims,
      }
    }

    if (intent === 'anomalies') {
      const anomalyCount = new Map<string, number>()
      for (const claim of enriched) {
        for (const flag of claim.anomalyFlags) anomalyCount.set(flag, (anomalyCount.get(flag) ?? 0) + 1)
      }
      const summary = [...anomalyCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([flag, count]) => `${flag}: ${count}`)
        .join(' | ')

      return {
        intent,
        answer: summary.length > 0 ? `Patrones anomalos principales -> ${summary}.` : 'No se encontraron patrones anomalos relevantes.',
        recommendedAction: 'Usar estos patrones para priorizar revision documental y calibrar el modelo supervisado.',
        claims: enriched.slice(0, 8),
      }
    }

    if (intent === 'summary') {
      const red = enriched.filter((claim) => claim.riskLevel === 'red')
      const yellow = enriched.filter((claim) => claim.riskLevel === 'yellow')
      return {
        intent,
        answer: `Resumen ejecutivo: ${red.length} casos rojos y ${yellow.length} amarillos. Los principales factores son monto atipico, vigencia cercana, documentos y proveedor recurrente.`,
        recommendedAction: 'Revisar primero los 10 casos con mayor score combinado IA/reglas.',
        claims: enriched.slice(0, 10),
      }
    }

    return {
      intent,
      answer: 'Puedo responder sobre mayor riesgo, explicaciones por siniestro, proveedores, ciudades, ramos, documentos, montos y resumen ejecutivo.',
      recommendedAction: 'Ejemplos: "10 siniestros con mayor riesgo", "por que CLM-00001", "proveedores con mas alertas".',
      claims: [],
    }
  },
})

function pickAgentClaimFields(claim: EnrichedClaim) {
  return {
    claimNumber: claim.claimNumber,
    customerId: claim.customerId,
    providerId: claim.providerId ?? null,
    policyId: claim.policyId,
    riskLevel: claim.riskLevel,
    riskScore: claim.riskScore,
    mlScore: claim.mlScore,
    ruleRiskScore: claim.ruleRiskScore,
    claimAmount: claim.claimAmount,
    estimatedDamageAmount: claim.estimatedDamageAmount,
    locationRegion: claim.locationRegion,
    coverage: claim.coverage ?? claim.lineOfBusiness ?? null,
    claimStatus: claim.claimStatus ?? null,
    anomalyFlags: claim.anomalyFlags.slice(0, 5),
    explanation: claim.explanation,
    recommendedAction: claim.recommendedAction,
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

function stringFromUnknown(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function openAITextFromResponse(data: unknown) {
  const response = asRecord(data)
  const outputText = response ? stringFromUnknown(response.output_text) : null
  if (outputText) return outputText

  const choices = response?.choices
  if (Array.isArray(choices)) {
    const firstChoice = asRecord(choices[0])
    const message = asRecord(firstChoice?.message)
    const content = stringFromUnknown(message?.content)
    if (content) return content
  }

  const output = response?.output
  if (Array.isArray(output)) {
    const parts: string[] = []
    for (const item of output) {
      const content = asRecord(item)?.content
      if (!Array.isArray(content)) continue
      for (const part of content) {
        const text = stringFromUnknown(asRecord(part)?.text)
        if (text) parts.push(text)
      }
    }
    if (parts.length > 0) return parts.join('\n')
  }

  return null
}

export const askAnalystAssistantWithLLM = action({
  args: { question: v.string() },
  handler: async (ctx, args) => {
    const question = args.question.trim()
    const localResponse = await ctx.runQuery(askAnalystAssistantQuery, { question })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return {
        ...localResponse,
        usedLLM: false,
        model: 'local-rules',
        answer: `${localResponse.answer}\n\nNota: OPENAI_API_KEY no esta configurada en Convex; esta respuesta usa el agente local basado en reglas.`,
      }
    }

    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    const systemMessage = process.env.OPENAI_SYSTEM_MESSAGE || DEFAULT_ANALYST_SYSTEM_MESSAGE
    const [summary, claims] = await Promise.all([
      ctx.runQuery(getSummaryQuery, {}),
      ctx.runQuery(listWithRiskQuery, { limit: 40 }),
    ])
    const contextClaims = claims.slice(0, 16).map(pickAgentClaimFields)

    const userMessage = [
      `Pregunta del analista: ${question || 'Resumen ejecutivo'}`,
      '',
      'Respuesta base del sistema local:',
      JSON.stringify(localResponse),
      '',
      'Resumen operativo:',
      JSON.stringify(summary),
      '',
      'Casos disponibles para contexto:',
      JSON.stringify(contextClaims),
      '',
      'Devuelve exclusivamente un JSON con esta forma:',
      '{"answer":"respuesta para el analista","recommendedAction":"siguiente accion concreta"}',
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      const errorMessage =
        stringFromUnknown(asRecord(asRecord(data)?.error)?.message) ??
        `OpenAI respondio con estado ${response.status}`
      return {
        ...localResponse,
        usedLLM: false,
        model,
        answer: `${localResponse.answer}\n\nNota: no fue posible usar OpenAI (${errorMessage}). Se muestra la respuesta local.`,
      }
    }

    const rawText = openAITextFromResponse(data)
    const parsed = rawText ? extractJsonObject(rawText) : null
    const answer = stringFromUnknown(parsed?.answer) ?? rawText ?? localResponse.answer
    const recommendedAction = stringFromUnknown(parsed?.recommendedAction) ?? localResponse.recommendedAction

    return {
      ...localResponse,
      answer,
      recommendedAction,
      usedLLM: true,
      model,
    }
  },
})
