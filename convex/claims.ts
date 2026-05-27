import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'

type RiskLevel = 'green' | 'yellow' | 'red'
type ClaimType = 'collision' | 'theft' | 'injury' | 'glass' | 'fire' | 'other'
type Channel = 'app' | 'broker' | 'callcenter' | 'web'
type ClaimSource = 'synthetic' | 'public'

type ClaimInput = {
  claimNumber: string
  policyId: string
  customerId: string
  customerAge: number
  claimType: ClaimType
  channel: Channel
  locationRegion: string
  vehicleYear: number
  claimAmount: number
  estimatedDamageAmount: number
  incidentsLast12Months: number
  daysSincePolicyStart: number
  occurredAt: number
  submittedAt: number
  isNightClaim: boolean
  reportNarrative: string
  source?: ClaimSource
  sourceDataset?: string
}

type ClaimDoc = Doc<'claims'>

type EnrichedClaim = ClaimDoc & {
  riskScore: number
  riskLevel: RiskLevel
  anomalyFlags: string[]
  explanation: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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

function buildSyntheticClaim(index: number): ClaimInput {
  const now = Date.now()
  const daysAgo = Math.floor(seedRandom(index + 11) * 120)
  const occurredAt = now - daysAgo * 24 * 60 * 60 * 1000
  const submittedAt = occurredAt + Math.floor(seedRandom(index + 21) * 4) * 24 * 60 * 60 * 1000
  const suspicious = index % 9 === 0 || index % 14 === 0
  const highSeverity = index % 20 === 0
  const claimType = suspicious
    ? pick(index + 41, ['theft', 'injury', 'collision'] satisfies ClaimType[])
    : pick(index + 42, ['collision', 'glass', 'other', 'fire'] satisfies ClaimType[])
  const baseDamage = 800 + Math.round(seedRandom(index + 31) * 18000)
  const inflation = suspicious ? 1.55 + seedRandom(index + 19) * 0.9 : 0.8 + seedRandom(index + 18) * 0.7
  const estimatedDamageAmount = highSeverity ? baseDamage * 1.4 : baseDamage
  const claimAmount = Math.round(estimatedDamageAmount * inflation)

  return {
    claimNumber: `CLM-${String(index + 1).padStart(5, '0')}`,
    policyId: `POL-${10000 + ((index * 17) % 45000)}`,
    customerId: suspicious ? `CUST-${400 + (index % 7)}` : `CUST-${1000 + ((index * 13) % 900)}`,
    customerAge: Math.floor(20 + seedRandom(index + 3) * 55),
    claimType,
    channel: suspicious
      ? pick(index + 51, ['callcenter', 'web', 'broker'] satisfies Channel[])
      : pick(index + 52, ['app', 'broker', 'web'] satisfies Channel[]),
    locationRegion: pick(index + 61, [
      'Bogota',
      'Antioquia',
      'Valle del Cauca',
      'Atlantico',
      'Santander',
      'Cundinamarca',
    ]),
    vehicleYear: suspicious
      ? Math.floor(1998 + seedRandom(index + 71) * 12)
      : Math.floor(2006 + seedRandom(index + 72) * 19),
    claimAmount,
    estimatedDamageAmount: Math.round(estimatedDamageAmount),
    incidentsLast12Months: suspicious
      ? Math.floor(2 + seedRandom(index + 81) * 4)
      : Math.floor(seedRandom(index + 82) * 3),
    daysSincePolicyStart: suspicious
      ? Math.floor(1 + seedRandom(index + 91) * 45)
      : Math.floor(45 + seedRandom(index + 92) * 700),
    occurredAt,
    submittedAt,
    isNightClaim: suspicious ? seedRandom(index + 101) > 0.25 : seedRandom(index + 102) > 0.78,
    reportNarrative: suspicious
      ? 'Reclamo con daños altos para vehiculo antiguo y antecedentes recientes.'
      : 'Choque menor reportado por el asegurado con soporte fotografico inicial.',
    source: 'synthetic',
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

function readField(
  row: Record<string, unknown>,
  aliases: string[],
): unknown {
  for (const alias of aliases) {
    if (alias in row && row[alias] !== undefined && row[alias] !== null) {
      return row[alias]
    }
  }
  return undefined
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replaceAll(',', '').replaceAll('$', '')
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
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

function normalizePublicClaim(
  row: Record<string, unknown>,
  index: number,
  datasetName: string,
): { claim: ClaimInput | null; reason?: string } {
  const now = Date.now()
  const claimAmount = toNumber(
    readField(row, ['claimAmount', 'claim_amount', 'total_claim_amount', 'amount', 'claim_value']),
  )
  if (claimAmount === null || claimAmount <= 0) {
    return { claim: null, reason: `Fila ${index + 1}: claimAmount invalido` }
  }

  const estimatedDamageAmount =
    toNumber(readField(row, ['estimatedDamageAmount', 'estimated_damage_amount', 'damage_amount'])) ??
    Math.round(claimAmount * 0.72)
  const occurredAt =
    toTimestamp(readField(row, ['occurredAt', 'incident_date', 'loss_date', 'occurrence_date'])) ??
    now - 5 * 24 * 60 * 60 * 1000
  const submittedAt =
    toTimestamp(readField(row, ['submittedAt', 'report_date', 'reported_at', 'submission_date'])) ??
    now

  const rawNight = toBoolean(readField(row, ['isNightClaim', 'is_night_claim', 'night_claim']))
  const hour = new Date(occurredAt).getHours()

  return {
    claim: {
      claimNumber:
        toText(readField(row, ['claimNumber', 'claim_id', 'claim_no', 'id'])) ??
        `PUB-${Date.now()}-${index + 1}`,
      policyId:
        toText(readField(row, ['policyId', 'policy_id', 'policy_number'])) ?? `POL-PUBLIC-${index + 1}`,
      customerId:
        toText(readField(row, ['customerId', 'customer_id', 'insured_id'])) ??
        `CUST-PUBLIC-${index + 1}`,
      customerAge: clamp(
        Math.round(
          toNumber(readField(row, ['customerAge', 'age', 'insured_age'])) ?? 37,
        ),
        18,
        90,
      ),
      claimType: mapClaimType(readField(row, ['claimType', 'claim_type', 'loss_type'])),
      channel: mapChannel(readField(row, ['channel', 'report_channel', 'submission_channel'])),
      locationRegion:
        toText(readField(row, ['locationRegion', 'region', 'state', 'city'])) ?? 'Unknown',
      vehicleYear: clamp(
        Math.round(toNumber(readField(row, ['vehicleYear', 'vehicle_year', 'car_year'])) ?? 2014),
        1990,
        new Date().getFullYear(),
      ),
      claimAmount: Math.round(claimAmount * 100) / 100,
      estimatedDamageAmount: Math.round(estimatedDamageAmount * 100) / 100,
      incidentsLast12Months: clamp(
        Math.round(
          toNumber(
            readField(row, ['incidentsLast12Months', 'incidents_last_12_months', 'prior_claims']),
          ) ?? 0,
        ),
        0,
        12,
      ),
      daysSincePolicyStart: clamp(
        Math.round(
          toNumber(readField(row, ['daysSincePolicyStart', 'days_since_policy_start'])) ?? 180,
        ),
        0,
        4000,
      ),
      occurredAt,
      submittedAt,
      isNightClaim: rawNight ?? (hour <= 5 || hour >= 21),
      reportNarrative:
        toText(readField(row, ['reportNarrative', 'description', 'narrative', 'incident_description'])) ??
        'Registro importado desde dataset publico.',
      source: 'public',
      sourceDataset: datasetName,
    },
  }
}

function evaluateClaimRisk(
  claim: ClaimInput,
  duplicatesByCustomer: number,
  amountOutlier: boolean,
) {
  let score = 8
  const flags: string[] = []

  const amountRatio = claim.claimAmount / Math.max(claim.estimatedDamageAmount, 1)
  if (amountRatio >= 1.7) {
    score += 26
    flags.push('Monto reclamado muy superior al dano estimado')
  } else if (amountRatio >= 1.35) {
    score += 16
    flags.push('Monto reclamado superior al dano estimado')
  }

  if (claim.incidentsLast12Months >= 3) {
    score += 18
    flags.push('Frecuencia alta de siniestros en los ultimos 12 meses')
  } else if (claim.incidentsLast12Months === 2) {
    score += 8
    flags.push('Frecuencia moderada de siniestros recientes')
  }

  if (claim.daysSincePolicyStart <= 30) {
    score += 22
    flags.push('Siniestro reportado poco tiempo despues de activar la poliza')
  } else if (claim.daysSincePolicyStart <= 90) {
    score += 10
    flags.push('Siniestro temprano tras inicio de poliza')
  }

  if (claim.isNightClaim && claim.channel === 'callcenter') {
    score += 10
    flags.push('Reporte nocturno por call center')
  }

  if (claim.vehicleYear < 2006 && claim.claimAmount > 14000) {
    score += 10
    flags.push('Monto alto para vehiculo antiguo')
  }

  if (claim.claimType === 'theft') {
    score += 10
    flags.push('Tipo de siniestro con historial de mayor riesgo (hurto)')
  }

  if (duplicatesByCustomer >= 2) {
    score += 20
    flags.push('Multiples siniestros recientes del mismo cliente')
  } else if (duplicatesByCustomer === 1) {
    score += 8
    flags.push('Otro siniestro cercano del mismo cliente')
  }

  if (amountOutlier) {
    score += 14
    flags.push('Monto atipico frente al universo de reclamos')
  }

  score = clamp(score, 0, 100)
  const level = riskLevelFromScore(score)
  const explanation =
    flags.length === 0
      ? 'No se detectaron senales relevantes de riesgo fuera del comportamiento esperado.'
      : `Se detectaron ${flags.length} senales clave: ${flags.slice(0, 3).join('; ')}.`

  return { score, level, flags, explanation }
}

function enrichClaims(rawClaims: ClaimDoc[]): EnrichedClaim[] {
  if (rawClaims.length === 0) return []

  const sortedAmounts = rawClaims
    .map((claim: ClaimDoc) => claim.claimAmount)
    .sort((a: number, b: number) => a - b)
  const percentileIndex = Math.floor(sortedAmounts.length * 0.9)
  const highAmountThreshold =
    sortedAmounts[percentileIndex] ??
    sortedAmounts[sortedAmounts.length - 1] ??
    0

  const byCustomerRecentCount = new Map<string, number>()
  for (const claim of rawClaims) {
    const current = byCustomerRecentCount.get(claim.customerId) ?? 0
    byCustomerRecentCount.set(claim.customerId, current + 1)
  }

  return rawClaims.map((claim: ClaimDoc) => {
    const duplicatesByCustomer = Math.max(
      (byCustomerRecentCount.get(claim.customerId) ?? 1) - 1,
      0,
    )
    const amountOutlier = claim.claimAmount >= highAmountThreshold
    const risk = evaluateClaimRisk(claim, duplicatesByCustomer, amountOutlier)

    return {
      ...claim,
      riskScore: risk.score,
      riskLevel: risk.level,
      anomalyFlags: risk.flags,
      explanation: risk.explanation,
    }
  })
}

function parseRiskIntent(question: string): 'red' | 'yellow' | 'green' | 'anomalies' | 'amount' | 'customer' | 'help' {
  const q = question.toLowerCase()
  if (q.includes('rojo') || q.includes('alto riesgo') || q.includes('fraude')) return 'red'
  if (q.includes('amarillo') || q.includes('medio riesgo')) return 'yellow'
  if (q.includes('verde') || q.includes('bajo riesgo')) return 'green'
  if (q.includes('anom') || q.includes('patron') || q.includes('atipic')) return 'anomalies'
  if (q.includes('monto') || q.includes('costoso') || q.includes('alto valor')) return 'amount'
  if (q.includes('cliente') || q.includes('customer') || q.includes('cust-')) return 'customer'
  return 'help'
}

function extractCustomerId(question: string) {
  const match = question.toUpperCase().match(/CUST-\d+/)
  return match ? match[0] : null
}

export const seedSyntheticData = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx) => {
    const existing = await ctx.db.query('claims').collect()
    const existingClaimNumbers = new Set(
      existing.map((claim: ClaimDoc) => claim.claimNumber),
    )

    let inserted = 0
    let skippedExisting = 0
    for (let i = 0; i < 120; i += 1) {
      const claim = buildSyntheticClaim(i)
      if (existingClaimNumbers.has(claim.claimNumber)) {
        skippedExisting += 1
        continue
      }
      await ctx.db.insert('claims', claim)
      existingClaimNumbers.add(claim.claimNumber)
      inserted += 1
    }

    let yellowInserted = 0
    for (let i = 0; i < 24; i += 1) {
      const claim = buildYellowRiskClaim(i)
      if (existingClaimNumbers.has(claim.claimNumber)) {
        skippedExisting += 1
        continue
      }
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
        'Datos sinteticos cargados; los siniestros existentes se omitieron automaticamente.',
    }
  },
})

export const seedYellowRiskData = mutation({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const count = clamp(Math.floor(args.count ?? 12), 1, 200)
    let inserted = 0
    for (let i = 0; i < count; i += 1) {
      await ctx.db.insert('claims', buildYellowRiskClaim(i))
      inserted += 1
    }
    return {
      inserted,
      message:
        'Casos amarillos cargados. Nivel medio: escalar a unidad antifraude para revision documental.',
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
    const rawClaims = await ctx.db
      .query('claims')
      .withIndex('by_submitted_at')
      .order('desc')
      .collect()
    const enriched = enrichClaims(rawClaims)

    const text = args.search?.trim().toLowerCase()
    const filtered = enriched.filter((claim: EnrichedClaim) => {
      if (args.riskLevel && claim.riskLevel !== args.riskLevel) return false
      if (!text) return true
      const haystack = [
        claim.claimNumber,
        claim.customerId,
        claim.policyId,
        claim.claimType,
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

      await ctx.db.insert('claims', normalized.claim)
      inserted += 1
    }

    return {
      inserted,
      skipped,
      totalReceived: args.rows.length,
      errors,
      message:
        inserted > 0
          ? 'Carga de datos publicos completada.'
          : 'No se pudo importar ningun registro.',
    }
  },
})

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const claims = await ctx.db.query('claims').collect()
    if (claims.length === 0) {
      return {
        total: 0,
        averageRiskScore: 0,
        byLevel: { green: 0, yellow: 0, red: 0 },
        bySource: { synthetic: 0, public: 0 },
        topAnomalies: [] as Array<{ flag: string; count: number }>,
      }
    }

    const byCustomerCount = new Map<string, number>()
    for (const claim of claims) {
      byCustomerCount.set(claim.customerId, (byCustomerCount.get(claim.customerId) ?? 0) + 1)
    }
    const sortedAmounts = claims
      .map((claim: ClaimDoc) => claim.claimAmount)
      .sort((a: number, b: number) => a - b)
    const p90 =
      sortedAmounts[Math.floor(sortedAmounts.length * 0.9)] ??
      sortedAmounts[sortedAmounts.length - 1] ??
      0

    let totalScore = 0
    const byLevel: Record<RiskLevel, number> = { green: 0, yellow: 0, red: 0 }
    const bySource: Record<ClaimSource, number> = { synthetic: 0, public: 0 }
    const flagCount = new Map<string, number>()

    for (const claim of claims) {
      const duplicatesByCustomer = Math.max((byCustomerCount.get(claim.customerId) ?? 1) - 1, 0)
      const risk = evaluateClaimRisk(claim, duplicatesByCustomer, claim.claimAmount >= p90)
      totalScore += risk.score
      byLevel[risk.level] += 1
      if (claim.source === 'public') bySource.public += 1
      else bySource.synthetic += 1
      for (const flag of risk.flags) {
        flagCount.set(flag, (flagCount.get(flag) ?? 0) + 1)
      }
    }

    const topAnomalies = [...flagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([flag, count]) => ({ flag, count }))

    return {
      total: claims.length,
      averageRiskScore: Number((totalScore / claims.length).toFixed(1)),
      byLevel,
      bySource,
      topAnomalies,
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
        recommendedAction: 'Prueba: "muestrame los casos rojos" o "patrones anomalos".',
        claims: [],
      }
    }

    const rawClaims = await ctx.db
      .query('claims')
      .withIndex('by_submitted_at')
      .order('desc')
      .collect()
    const enriched = enrichClaims(rawClaims).slice(0, 200)
    const intent = parseRiskIntent(question)

    if (intent === 'red' || intent === 'yellow' || intent === 'green') {
      const claims = enriched
        .filter((claim: EnrichedClaim) => claim.riskLevel === intent)
        .sort((a: EnrichedClaim, b: EnrichedClaim) => b.riskScore - a.riskScore)
        .slice(0, 12)
      return {
        intent,
        answer: `Se encontraron ${claims.length} casos en nivel ${intent}.`,
        recommendedAction:
          intent === 'red'
            ? 'Prioriza revision manual inmediata y valida soportes de pago.'
            : 'Revisa historial, consistencia documental y contexto de poliza.',
        claims,
      }
    }

    if (intent === 'amount') {
      const claims = [...enriched]
        .sort((a: EnrichedClaim, b: EnrichedClaim) => b.claimAmount - a.claimAmount)
        .slice(0, 10)
      return {
        intent,
        answer: 'Estos son los siniestros con mayor monto reclamado.',
        recommendedAction: 'Verifica coherencia entre valor reclamado, peritaje y antiguedad del activo.',
        claims,
      }
    }

    if (intent === 'customer') {
      const customerId = extractCustomerId(question)
      const claims = customerId
        ? enriched
            .filter((claim: EnrichedClaim) => claim.customerId === customerId)
            .slice(0, 20)
        : []
      return {
        intent,
        answer: customerId
          ? `Se encontraron ${claims.length} siniestros para ${customerId}.`
          : 'No identifique un customerId (ejemplo: CUST-401).',
        recommendedAction: 'Consulta sugerida: "casos del cliente CUST-401".',
        claims,
      }
    }

    if (intent === 'anomalies') {
      const anomalyCount = new Map<string, number>()
      for (const claim of enriched) {
        for (const flag of claim.anomalyFlags) {
          anomalyCount.set(flag, (anomalyCount.get(flag) ?? 0) + 1)
        }
      }
      const summary = [...anomalyCount.entries()]
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 4)
        .map(([flag, count]) => `${flag}: ${count}`)
        .join(' | ')

      const claims = [...enriched]
        .sort((a: EnrichedClaim, b: EnrichedClaim) => b.riskScore - a.riskScore)
        .slice(0, 8)
      return {
        intent,
        answer:
          summary.length > 0
            ? `Patrones anomales principales -> ${summary}.`
            : 'No se encontraron patrones anomales relevantes.',
        recommendedAction: 'Ajusta umbrales de reglas y valida precision con muestra etiquetada por analistas.',
        claims,
      }
    }

    return {
      intent,
      answer:
        'Puedo responder consultas de riesgo, anomalias, montos altos y busqueda por cliente.',
      recommendedAction:
        'Ejemplos: "casos rojos", "patrones anomalos", "siniestros de alto monto", "cliente CUST-401".',
      claims: [],
    }
  },
})
