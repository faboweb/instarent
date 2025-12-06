import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    listingId: v.id("listings"),
    scheduledAt: v.string(),
    calendlyEventUri: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("appointments", {
      conversationId: args.conversationId,
      listingId: args.listingId,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      calendlyEventUri: args.calendlyEventUri,
      notes: args.notes,
    });
  },
});

export const updateStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: { status: string; notes?: string } = { status: args.status };
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    await ctx.db.patch(args.appointmentId, updates);
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const get = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appointmentId);
  },
});
