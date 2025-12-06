export declare const create: import("convex/server").RegisteredMutation<"public", {
    contractId?: import("convex/values").GenericId<"contracts"> | undefined;
    stripeInvoiceId?: string | undefined;
    paymentUrl?: string | undefined;
    conversationId: import("convex/values").GenericId<"conversations">;
    currency: string;
    amount: number;
}, Promise<import("convex/values").GenericId<"payments">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    stripeInvoiceId?: string | undefined;
    paymentUrl?: string | undefined;
    status: string;
    paymentId: import("convex/values").GenericId<"payments">;
}, Promise<void>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"payments">;
    _creationTime: number;
    contractId?: import("convex/values").GenericId<"contracts"> | undefined;
    stripeInvoiceId?: string | undefined;
    paymentUrl?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    currency: string;
    amount: number;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    paymentId: import("convex/values").GenericId<"payments">;
}, Promise<{
    _id: import("convex/values").GenericId<"payments">;
    _creationTime: number;
    contractId?: import("convex/values").GenericId<"contracts"> | undefined;
    stripeInvoiceId?: string | undefined;
    paymentUrl?: string | undefined;
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
    currency: string;
    amount: number;
} | null>>;
//# sourceMappingURL=payments.d.ts.map