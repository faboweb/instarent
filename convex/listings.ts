import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addMany = mutation({
  args: {
    conversationId: v.id("conversations"),
    listings: v.array(
      v.object({
        externalId: v.optional(v.string()),
        title: v.string(),
        price: v.number(),
        currency: v.string(),
        location: v.string(),
        bedrooms: v.optional(v.number()),
        url: v.string(),
        imageUrl: v.optional(v.string()),
        imageUrls: v.optional(v.array(v.string())),
        description: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        contactMethod: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const listing of args.listings) {
      const id = await ctx.db.insert("listings", {
        conversationId: args.conversationId,
        ...listing,
        selected: false,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("listings")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

export const select = mutation({
  args: {
    listingId: v.id("listings"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    // Deselect all other listings in this conversation
    const others = await ctx.db
      .query("listings")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", listing.conversationId)
      )
      .collect();

    for (const other of others) {
      if (other._id !== args.listingId && other.selected) {
        await ctx.db.patch(other._id, { selected: false });
      }
    }

    // Select this one
    await ctx.db.patch(args.listingId, { selected: true });
    return listing;
  },
});

export const getSelected = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return listings.find((l) => l.selected) || null;
  },
});

export const get = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.listingId);
  },
});
