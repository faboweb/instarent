import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    listingId: v.id("listings"),
    conversationId: v.id("conversations"),
    twilioCallSid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calls", {
      listingId: args.listingId,
      conversationId: args.conversationId,
      status: "pending",
      twilioCallSid: args.twilioCallSid,
    });
  },
});

export const updateStatus = mutation({
  args: {
    callId: v.id("calls"),
    status: v.string(),
    twilioCallSid: v.optional(v.string()),
    transcript: v.optional(v.string()),
    outcome: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { callId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(callId, filteredUpdates);
  },
});

export const getByListing = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .first();
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const calls = [];
    for (const listing of listings) {
      const call = await ctx.db
        .query("calls")
        .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
        .first();
      if (call) {
        calls.push({ ...call, listing });
      }
    }
    return calls;
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callId);
  },
});
