import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    telegramId: v.number(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    language: v.optional(v.string()),
  }).index("by_telegram_id", ["telegramId"]),

  conversations: defineTable({
    userId: v.id("users"),
    status: v.string(), // "gathering_requirements", "searching", "selecting", "contacting", "scheduling", "contracting", "payment", "completed"
    requirements: v.optional(
      v.object({
        customerName: v.optional(v.string()),
        customerOrigin: v.optional(v.string()),
        location: v.optional(v.string()),
        bedrooms: v.optional(v.number()),
        maxBudget: v.optional(v.number()),
        moveInDate: v.optional(v.string()),
        extras: v.optional(v.string()),
        passportData: v.optional(v.object({
          fullName: v.string(),
          passportNumber: v.string(),
          dateOfBirth: v.optional(v.string()),
          nationality: v.optional(v.string()),
          expiryDate: v.optional(v.string()),
          gender: v.optional(v.string()),
        })),
      })
    ),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(),
  }).index("by_conversation", ["conversationId"]),

  // For Milestone 2+
  listings: defineTable({
    conversationId: v.id("conversations"),
    externalId: v.optional(v.string()),
    title: v.string(),
    price: v.number(),
    currency: v.string(),
    location: v.string(),
    bedrooms: v.optional(v.number()),
    url: v.string(),
    imageUrl: v.optional(v.string()), // Primary image (first image for backward compatibility)
    imageUrls: v.optional(v.array(v.string())), // All image URLs
    description: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactMethod: v.optional(v.string()), // "form", "email", "phone", "line"
    selected: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),

  // For Milestone 4+
  calls: defineTable({
    listingId: v.id("listings"),
    conversationId: v.id("conversations"),
    status: v.string(), // "pending", "in_progress", "completed", "failed", "missed", "call_back", "done"
    twilioCallSid: v.optional(v.string()),
    transcript: v.optional(v.string()),
    outcome: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    retryAttempt: v.optional(v.number()), // Track retry attempts (0 = first attempt)
    nextRetryTime: v.optional(v.string()), // ISO timestamp for next retry
  }).index("by_listing", ["listingId"]).index("by_conversation", ["conversationId"]),

  // For Milestone 5+
  appointments: defineTable({
    conversationId: v.id("conversations"),
    listingId: v.id("listings"),
    calendlyEventUri: v.optional(v.string()),
    scheduledAt: v.string(),
    status: v.string(), // "scheduled", "confirmed", "cancelled", "completed"
    notes: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),

  // For Milestone 6+
  contracts: defineTable({
    conversationId: v.id("conversations"),
    listingId: v.id("listings"),
    docusignEnvelopeId: v.optional(v.string()),
    status: v.string(), // "draft", "sent", "signed", "completed"
    documentUrl: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),

  // For Milestone 7+
  payments: defineTable({
    conversationId: v.id("conversations"),
    contractId: v.optional(v.id("contracts")),
    stripeInvoiceId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.string(), // "pending", "paid", "failed"
    paymentUrl: v.optional(v.string()),
  }).index("by_conversation", ["conversationId"]),
});
