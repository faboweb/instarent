import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    contractId: v.optional(v.id("contracts")),
    amount: v.number(),
    currency: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    paymentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      conversationId: args.conversationId,
      contractId: args.contractId,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
      stripeInvoiceId: args.stripeInvoiceId,
      paymentUrl: args.paymentUrl,
    });
  },
});

export const updateStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.string(),
    stripeInvoiceId: v.optional(v.string()),
    paymentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { paymentId, ...updates } = args;

    const filteredUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(paymentId, filteredUpdates);
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const get = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});
