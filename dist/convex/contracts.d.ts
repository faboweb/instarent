export declare const create: import("convex/server").RegisteredMutation<"public", {
    docusignEnvelopeId?: string | undefined;
    documentUrl?: string | undefined;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
}, Promise<import("convex/values").GenericId<"contracts">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    docusignEnvelopeId?: string | undefined;
    documentUrl?: string | undefined;
    status: string;
    contractId: import("convex/values").GenericId<"contracts">;
}, Promise<void>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"contracts">;
    _creationTime: number;
    docusignEnvelopeId?: string | undefined;
    documentUrl?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    contractId: import("convex/values").GenericId<"contracts">;
}, Promise<{
    _id: import("convex/values").GenericId<"contracts">;
    _creationTime: number;
    docusignEnvelopeId?: string | undefined;
    documentUrl?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    listingId: import("convex/values").GenericId<"listings">;
} | null>>;
//# sourceMappingURL=contracts.d.ts.map