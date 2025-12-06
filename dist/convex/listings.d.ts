export declare const addMany: import("convex/server").RegisteredMutation<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
    listings: {
        bedrooms?: number | undefined;
        externalId?: string | undefined;
        imageUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        description?: string | undefined;
        contactPhone?: string | undefined;
        contactEmail?: string | undefined;
        contactMethod?: string | undefined;
        location: string;
        title: string;
        price: number;
        currency: string;
        url: string;
    }[];
}, Promise<import("convex/values").GenericId<"listings">[]>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"listings">;
    _creationTime: number;
    bedrooms?: number | undefined;
    externalId?: string | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    description?: string | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    contactMethod?: string | undefined;
    selected?: boolean | undefined;
    location: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    title: string;
    price: number;
    currency: string;
    url: string;
}[]>>;
export declare const select: import("convex/server").RegisteredMutation<"public", {
    listingId: import("convex/values").GenericId<"listings">;
}, Promise<{
    _id: import("convex/values").GenericId<"listings">;
    _creationTime: number;
    bedrooms?: number | undefined;
    externalId?: string | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    description?: string | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    contactMethod?: string | undefined;
    selected?: boolean | undefined;
    location: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    title: string;
    price: number;
    currency: string;
    url: string;
}>>;
export declare const getSelected: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"listings">;
    _creationTime: number;
    bedrooms?: number | undefined;
    externalId?: string | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    description?: string | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    contactMethod?: string | undefined;
    selected?: boolean | undefined;
    location: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    title: string;
    price: number;
    currency: string;
    url: string;
} | null>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    listingId: import("convex/values").GenericId<"listings">;
}, Promise<{
    _id: import("convex/values").GenericId<"listings">;
    _creationTime: number;
    bedrooms?: number | undefined;
    externalId?: string | undefined;
    imageUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    description?: string | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    contactMethod?: string | undefined;
    selected?: boolean | undefined;
    location: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    title: string;
    price: number;
    currency: string;
    url: string;
} | null>>;
//# sourceMappingURL=listings.d.ts.map