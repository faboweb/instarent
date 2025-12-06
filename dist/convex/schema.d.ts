declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        firstName?: string | undefined;
        lastName?: string | undefined;
        username?: string | undefined;
        language?: string | undefined;
        telegramId: number;
    }, {
        telegramId: import("convex/values").VFloat64<number, "required">;
        firstName: import("convex/values").VString<string | undefined, "optional">;
        lastName: import("convex/values").VString<string | undefined, "optional">;
        username: import("convex/values").VString<string | undefined, "optional">;
        language: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "telegramId" | "firstName" | "lastName" | "username" | "language">, {
        by_telegram_id: ["telegramId", "_creationTime"];
    }, {}, {}>;
    conversations: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        status: import("convex/values").VString<string, "required">;
        requirements: import("convex/values").VObject<{
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
        } | undefined, {
            customerName: import("convex/values").VString<string | undefined, "optional">;
            customerOrigin: import("convex/values").VString<string | undefined, "optional">;
            location: import("convex/values").VString<string | undefined, "optional">;
            bedrooms: import("convex/values").VFloat64<number | undefined, "optional">;
            maxBudget: import("convex/values").VFloat64<number | undefined, "optional">;
            moveInDate: import("convex/values").VString<string | undefined, "optional">;
            extras: import("convex/values").VString<string | undefined, "optional">;
            passportData: import("convex/values").VObject<{
                dateOfBirth?: string | undefined;
                nationality?: string | undefined;
                expiryDate?: string | undefined;
                gender?: string | undefined;
                fullName: string;
                passportNumber: string;
            } | undefined, {
                fullName: import("convex/values").VString<string, "required">;
                passportNumber: import("convex/values").VString<string, "required">;
                dateOfBirth: import("convex/values").VString<string | undefined, "optional">;
                nationality: import("convex/values").VString<string | undefined, "optional">;
                expiryDate: import("convex/values").VString<string | undefined, "optional">;
                gender: import("convex/values").VString<string | undefined, "optional">;
            }, "optional", "fullName" | "passportNumber" | "dateOfBirth" | "nationality" | "expiryDate" | "gender">;
        }, "optional", "customerName" | "customerOrigin" | "location" | "bedrooms" | "maxBudget" | "moveInDate" | "extras" | "passportData" | "passportData.fullName" | "passportData.passportNumber" | "passportData.dateOfBirth" | "passportData.nationality" | "passportData.expiryDate" | "passportData.gender">;
    }, "required", "userId" | "status" | "requirements" | "requirements.customerName" | "requirements.customerOrigin" | "requirements.location" | "requirements.bedrooms" | "requirements.maxBudget" | "requirements.moveInDate" | "requirements.extras" | "requirements.passportData" | "requirements.passportData.fullName" | "requirements.passportData.passportNumber" | "requirements.passportData.dateOfBirth" | "requirements.passportData.nationality" | "requirements.passportData.expiryDate" | "requirements.passportData.gender">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    messages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        conversationId: import("convex/values").GenericId<"conversations">;
        role: string;
        content: string;
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        role: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
    }, "required", "conversationId" | "role" | "content">, {
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
    listings: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        externalId: import("convex/values").VString<string | undefined, "optional">;
        title: import("convex/values").VString<string, "required">;
        price: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        location: import("convex/values").VString<string, "required">;
        bedrooms: import("convex/values").VFloat64<number | undefined, "optional">;
        url: import("convex/values").VString<string, "required">;
        imageUrl: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        description: import("convex/values").VString<string | undefined, "optional">;
        contactPhone: import("convex/values").VString<string | undefined, "optional">;
        contactEmail: import("convex/values").VString<string | undefined, "optional">;
        contactMethod: import("convex/values").VString<string | undefined, "optional">;
        selected: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "location" | "bedrooms" | "conversationId" | "externalId" | "title" | "price" | "currency" | "url" | "imageUrl" | "imageUrls" | "description" | "contactPhone" | "contactEmail" | "contactMethod" | "selected">, {
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
    calls: import("convex/server").TableDefinition<import("convex/values").VObject<{
        twilioCallSid?: string | undefined;
        transcript?: string | undefined;
        outcome?: string | undefined;
        scheduledTime?: string | undefined;
        retryAttempt?: number | undefined;
        nextRetryTime?: string | undefined;
        status: string;
        conversationId: import("convex/values").GenericId<"conversations">;
        listingId: import("convex/values").GenericId<"listings">;
    }, {
        listingId: import("convex/values").VId<import("convex/values").GenericId<"listings">, "required">;
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        status: import("convex/values").VString<string, "required">;
        twilioCallSid: import("convex/values").VString<string | undefined, "optional">;
        transcript: import("convex/values").VString<string | undefined, "optional">;
        outcome: import("convex/values").VString<string | undefined, "optional">;
        scheduledTime: import("convex/values").VString<string | undefined, "optional">;
        retryAttempt: import("convex/values").VFloat64<number | undefined, "optional">;
        nextRetryTime: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "conversationId" | "listingId" | "twilioCallSid" | "transcript" | "outcome" | "scheduledTime" | "retryAttempt" | "nextRetryTime">, {
        by_listing: ["listingId", "_creationTime"];
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
    appointments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        calendlyEventUri?: string | undefined;
        notes?: string | undefined;
        status: string;
        conversationId: import("convex/values").GenericId<"conversations">;
        listingId: import("convex/values").GenericId<"listings">;
        scheduledAt: string;
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        listingId: import("convex/values").VId<import("convex/values").GenericId<"listings">, "required">;
        calendlyEventUri: import("convex/values").VString<string | undefined, "optional">;
        scheduledAt: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "conversationId" | "listingId" | "calendlyEventUri" | "scheduledAt" | "notes">, {
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
    contracts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        docusignEnvelopeId?: string | undefined;
        documentUrl?: string | undefined;
        status: string;
        conversationId: import("convex/values").GenericId<"conversations">;
        listingId: import("convex/values").GenericId<"listings">;
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        listingId: import("convex/values").VId<import("convex/values").GenericId<"listings">, "required">;
        docusignEnvelopeId: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VString<string, "required">;
        documentUrl: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "conversationId" | "listingId" | "docusignEnvelopeId" | "documentUrl">, {
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
    payments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        contractId?: import("convex/values").GenericId<"contracts"> | undefined;
        stripeInvoiceId?: string | undefined;
        paymentUrl?: string | undefined;
        status: string;
        conversationId: import("convex/values").GenericId<"conversations">;
        currency: string;
        amount: number;
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        contractId: import("convex/values").VId<import("convex/values").GenericId<"contracts"> | undefined, "optional">;
        stripeInvoiceId: import("convex/values").VString<string | undefined, "optional">;
        amount: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        paymentUrl: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "conversationId" | "currency" | "contractId" | "stripeInvoiceId" | "amount" | "paymentUrl">, {
        by_conversation: ["conversationId", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map