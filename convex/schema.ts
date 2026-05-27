import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  claims: defineTable({
    claimNumber: v.string(),
    policyId: v.string(),
    customerId: v.string(),
    customerAge: v.number(),
    claimType: v.union(
      v.literal('collision'),
      v.literal('theft'),
      v.literal('injury'),
      v.literal('glass'),
      v.literal('fire'),
      v.literal('other'),
    ),
    channel: v.union(
      v.literal('app'),
      v.literal('broker'),
      v.literal('callcenter'),
      v.literal('web'),
    ),
    locationRegion: v.string(),
    vehicleYear: v.number(),
    claimAmount: v.number(),
    estimatedDamageAmount: v.number(),
    incidentsLast12Months: v.number(),
    daysSincePolicyStart: v.number(),
    occurredAt: v.number(),
    submittedAt: v.number(),
    isNightClaim: v.boolean(),
    reportNarrative: v.string(),
    source: v.optional(v.union(v.literal('synthetic'), v.literal('public'))),
    sourceDataset: v.optional(v.string()),
  })
    .index('by_submitted_at', ['submittedAt'])
    .index('by_customer', ['customerId'])
    .index('by_claim_type', ['claimType'])
    .index('by_source', ['source']),
})
