import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    listingId: v.id("listings"),
    conversationId: v.id("conversations"),
    twilioCallSid: v.optional(v.string()),
    retryAttempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calls", {
      listingId: args.listingId,
      conversationId: args.conversationId,
      status: "pending",
      twilioCallSid: args.twilioCallSid,
      retryAttempt: args.retryAttempt ?? 0,
    });
  },
});

export const updateStatus = mutation({
  args: {
    callId: v.id("calls"),
    status: v.optional(v.string()),
    twilioCallSid: v.optional(v.union(v.string(), v.null())),
    transcript: v.optional(v.union(v.string(), v.null())),
    outcome: v.optional(v.union(v.string(), v.null())),
    scheduledTime: v.optional(v.union(v.string(), v.null())),
    retryAttempt: v.optional(v.union(v.number(), v.null())),
    nextRetryTime: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { callId, ...updates } = args;

    // Build updates object, converting null to undefined to clear fields
    const patchUpdates: Record<string, string | number | undefined> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        // Set to undefined to clear the field
        patchUpdates[key] = undefined;
      } else if (value !== undefined) {
        // Include defined values
        patchUpdates[key] = value;
      }
      // Skip undefined values (not provided)
    }

    await ctx.db.patch(callId, patchUpdates);
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
    // Use the new index if available, otherwise fall back to listing lookup
    try {
      return await ctx.db
        .query("calls")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
        .collect();
    } catch {
      // Fallback: get via listings
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
    }
  },
});

export const getLatestByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    try {
      const calls = await ctx.db
        .query("calls")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
        .collect();
      // Sort by creation time (most recent first) - _creationTime is automatically added by Convex
      if (calls.length > 0) {
        calls.sort((a, b) => b._creationTime - a._creationTime);
        return calls[0];
      }
      return null;
    } catch {
      // Fallback: get via listings if index doesn't exist yet
      const listings = await ctx.db
        .query("listings")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .collect();

      let latestCall = null;
      let latestTime = 0;
      for (const listing of listings) {
        const call = await ctx.db
          .query("calls")
          .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
          .first();
        if (call && call._creationTime > latestTime) {
          latestCall = call;
          latestTime = call._creationTime;
        }
      }
      return latestCall;
    }
  },
});

export const get = query({
  args: { callId: v.id("calls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.callId);
  },
});
