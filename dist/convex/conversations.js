import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .first();
    },
});
export const getOrCreate = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Get most recent conversation
        const existing = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .first();
        // If there's an active conversation (not completed), return it
        if (existing && existing.status !== "completed") {
            return existing._id;
        }
        // Create new conversation
        return await ctx.db.insert("conversations", {
            userId: args.userId,
            status: "gathering_requirements",
            requirements: {},
        });
    },
});
export const updateStatus = mutation({
    args: {
        conversationId: v.id("conversations"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.conversationId, { status: args.status });
    },
});
export const updateRequirements = mutation({
    args: {
        conversationId: v.id("conversations"),
        requirements: v.object({
            customerName: v.optional(v.string()),
            customerOrigin: v.optional(v.string()),
            location: v.optional(v.string()),
            bedrooms: v.optional(v.number()),
            maxBudget: v.optional(v.number()),
            moveInDate: v.optional(v.string()),
            extras: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation)
            throw new Error("Conversation not found");
        // Merge with existing requirements
        const merged = {
            ...conversation.requirements,
            ...args.requirements,
        };
        await ctx.db.patch(args.conversationId, { requirements: merged });
    },
});
export const get = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.conversationId);
    },
});
export const getAllActive = query({
    args: {},
    handler: async (ctx) => {
        // Get all conversations that are not completed
        return await ctx.db
            .query("conversations")
            .filter((q) => q.neq(q.field("status"), "completed"))
            .collect();
    },
});
//# sourceMappingURL=conversations.js.map