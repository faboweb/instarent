import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Admin helper to reset conversation to a specific state
export const resetConversationState = mutation({
  args: {
    conversationId: v.id("conversations"),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      status: args.newStatus,
    });

    console.log(`✅ Updated conversation ${args.conversationId} to status: ${args.newStatus}`);

    return {
      conversationId: args.conversationId,
      newStatus: args.newStatus,
    };
  },
});

// Get all active conversations with their details
export const listActiveConversations = query({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();

    return conversations;
  },
});

// Delete pending payments for a conversation (to retry payment creation)
export const deletePayments = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    return { deleted: payments.length };
  },
});
