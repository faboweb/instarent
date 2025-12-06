import OpenAI from "openai";
export interface Requirements {
    customerName?: string;
    customerOrigin?: string;
    location?: string;
    bedrooms?: number;
    maxBudget?: number;
    moveInDate?: string;
    extras?: string;
}
export interface ConversationResponse {
    message: string;
    extractedRequirements?: Requirements;
    readyToSearch: boolean;
}
export declare function chat(openai: OpenAI, messages: Array<{
    role: string;
    content: string;
}>, currentRequirements: Requirements): Promise<ConversationResponse>;
//# sourceMappingURL=conversation.d.ts.map