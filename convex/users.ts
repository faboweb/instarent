import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByTelegramId = query({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});

export const getOrCreate = mutation({
  args: {
    telegramId: v.number(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();

    if (existing) {
      // Update user info if changed
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        username: args.username,
        language: args.language,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      telegramId: args.telegramId,
      firstName: args.firstName,
      lastName: args.lastName,
      username: args.username,
      language: args.language,
    });
  },
});
