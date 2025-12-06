export declare const create: import("convex/server").RegisteredMutation<"public", {
    twilioCallSid?: string | undefined;
    retryAttempt?: number | undefined;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
}, Promise<import("convex/values").GenericId<"calls">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status?: string | undefined;
    twilioCallSid?: string | null | undefined;
    transcript?: string | null | undefined;
    outcome?: string | null | undefined;
    scheduledTime?: string | null | undefined;
    retryAttempt?: number | null | undefined;
    nextRetryTime?: string | null | undefined;
    callId: import("convex/values").GenericId<"calls">;
}, Promise<void>>;
export declare const getByListing: import("convex/server").RegisteredQuery<"public", {
    listingId: import("convex/values").GenericId<"listings">;
}, Promise<{
    _id: import("convex/values").GenericId<"calls">;
    _creationTime: number;
    twilioCallSid?: string | undefined;
    transcript?: string | undefined;
    outcome?: string | undefined;
    scheduledTime?: string | undefined;
    retryAttempt?: number | undefined;
    nextRetryTime?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
} | null>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"calls">;
    _creationTime: number;
    twilioCallSid?: string | undefined;
    transcript?: string | undefined;
    outcome?: string | undefined;
    scheduledTime?: string | undefined;
    retryAttempt?: number | undefined;
    nextRetryTime?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
}[]>>;
export declare const getLatestByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"calls">;
    _creationTime: number;
    twilioCallSid?: string | undefined;
    transcript?: string | undefined;
    outcome?: string | undefined;
    scheduledTime?: string | undefined;
    retryAttempt?: number | undefined;
    nextRetryTime?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
} | null>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    callId: import("convex/values").GenericId<"calls">;
}, Promise<{
    _id: import("convex/values").GenericId<"calls">;
    _creationTime: number;
    twilioCallSid?: string | undefined;
    transcript?: string | undefined;
    outcome?: string | undefined;
    scheduledTime?: string | undefined;
    retryAttempt?: number | undefined;
    nextRetryTime?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
} | null>>;
//# sourceMappingURL=calls.d.ts.map