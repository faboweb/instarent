import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    listingId: v.id("listings"),
    docusignEnvelopeId: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contracts", {
      conversationId: args.conversationId,
      listingId: args.listingId,
      status: "draft",
      docusignEnvelopeId: args.docusignEnvelopeId,
      documentUrl: args.documentUrl,
    });
  },
});

export const updateStatus = mutation({
  args: {
    contractId: v.id("contracts"),
    status: v.string(),
    docusignEnvelopeId: v.optional(v.string()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contractId, ...updates } = args;

    const filteredUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(contractId, filteredUpdates);
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contracts")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const get = query({
  args: { contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contractId);
  },
});
