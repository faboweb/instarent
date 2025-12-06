export declare const create: import("convex/server").RegisteredMutation<"public", {
    calendlyEventUri?: string | undefined;
    notes?: string | undefined;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
    scheduledAt: string;
}, Promise<import("convex/values").GenericId<"appointments">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    status: string;
    appointmentId: import("convex/values").GenericId<"appointments">;
}, Promise<void>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"appointments">;
    _creationTime: number;
    calendlyEventUri?: string | undefined;
    notes?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
    scheduledAt: string;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    appointmentId: import("convex/values").GenericId<"appointments">;
}, Promise<{
    _id: import("convex/values").GenericId<"appointments">;
    _creationTime: number;
    calendlyEventUri?: string | undefined;
    notes?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
    scheduledAt: string;
} | null>>;
//# sourceMappingURL=appointments.d.ts.map