export declare const getByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    requirements?: {
        customerName?: string | undefined;
        customerOrigin?: string | undefined;
        location?: string | undefined;
        bedrooms?: number | undefined;
        maxBudget?: number | undefined;
        moveInDate?: string | undefined;
        extras?: string | undefined;
        passportData?: {
            dateOfBirth?: string | undefined;
            nationality?: string | undefined;
            expiryDate?: string | undefined;
            gender?: string | undefined;
            fullName: string;
            passportNumber: string;
        } | undefined;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    status: string;
} | null>>;
export declare const getOrCreate: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"conversations">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status: string;
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<void>>;
export declare const updateRequirements: import("convex/server").RegisteredMutation<"public", {
    requirements: {
        customerName?: string | undefined;
        customerOrigin?: string | undefined;
        location?: string | undefined;
        bedrooms?: number | undefined;
        maxBudget?: number | undefined;
        moveInDate?: string | undefined;
        extras?: string | undefined;
        passportData?: {
            dateOfBirth?: string | undefined;
            nationality?: string | undefined;
            expiryDate?: string | undefined;
            gender?: string | undefined;
            fullName: string;
            passportNumber: string;
        } | undefined;
    };
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<void>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    requirements?: {
        customerName?: string | undefined;
        customerOrigin?: string | undefined;
        location?: string | undefined;
        bedrooms?: number | undefined;
        maxBudget?: number | undefined;
        moveInDate?: string | undefined;
        extras?: string | undefined;
        passportData?: {
            dateOfBirth?: string | undefined;
            nationality?: string | undefined;
            expiryDate?: string | undefined;
            gender?: string | undefined;
            fullName: string;
            passportNumber: string;
        } | undefined;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    status: string;
} | null>>;
export declare const getAllActive: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    requirements?: {
        customerName?: string | undefined;
        customerOrigin?: string | undefined;
        location?: string | undefined;
        bedrooms?: number | undefined;
        maxBudget?: number | undefined;
        moveInDate?: string | undefined;
        extras?: string | undefined;
        passportData?: {
            dateOfBirth?: string | undefined;
            nationality?: string | undefined;
            expiryDate?: string | undefined;
            gender?: string | undefined;
            fullName: string;
            passportNumber: string;
        } | undefined;
    } | undefined;
    userId: import("convex/values").GenericId<"users">;
    status: string;
}[]>>;
//# sourceMappingURL=conversations.d.ts.map