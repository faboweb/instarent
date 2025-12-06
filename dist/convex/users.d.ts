export declare const getByTelegramId: import("convex/server").RegisteredQuery<"public", {
    telegramId: number;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    firstName?: string | undefined;
    lastName?: string | undefined;
    username?: string | undefined;
    language?: string | undefined;
    telegramId: number;
} | null>>;
export declare const getOrCreate: import("convex/server").RegisteredMutation<"public", {
    firstName?: string | undefined;
    lastName?: string | undefined;
    username?: string | undefined;
    language?: string | undefined;
    telegramId: number;
}, Promise<import("convex/values").GenericId<"users">>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    firstName?: string | undefined;
    lastName?: string | undefined;
    username?: string | undefined;
    language?: string | undefined;
    telegramId: number;
} | null>>;
//# sourceMappingURL=users.d.ts.map