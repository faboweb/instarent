export declare const add: import("convex/server").RegisteredMutation<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
    role: string;
    content: string;
}, Promise<import("convex/values").GenericId<"messages">>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"messages">;
    _creationTime: number;
    conversationId: import("convex/values").GenericId<"conversations">;
    role: string;
    content: string;
}[]>>;
//# sourceMappingURL=messages.d.ts.map