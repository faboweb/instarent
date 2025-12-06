export interface CalendlyConfig {
    /**
     * Smithery URL for Calendly MCP server.
     * Format: https://server.smithery.ai/@zapier/mcp-calendly/mcp?api_key=...&access_token=...
     */
    smitheryUrl: string;
}
/**
 * Helper function to construct a Smithery URL from API key and access token
 */
export declare function constructSmitheryUrl(apiKey: string, accessToken: string): string;
export interface EventType {
    uri: string;
    name: string;
    duration: number;
    schedulingUrl: string;
}
export interface ScheduledEvent {
    uri: string;
    name: string;
    startTime: string;
    endTime: string;
    status: string;
    location?: string;
    inviteeEmail?: string;
}
export declare class CalendlyService {
    private client;
    private isConnected;
    private connectionPromise;
    constructor(config: CalendlyConfig);
    private connect;
    private callTool;
    listAvailableTools(): Promise<string[]>;
    getEventTypes(): Promise<EventType[]>;
    getScheduledEvents(_minStartTime?: string, _maxStartTime?: string): Promise<ScheduledEvent[]>;
    generateSchedulingLink(eventTypeSlug: string, prefillName?: string, prefillEmail?: string): string;
    createPropertyViewingLink(propertyTitle: string, clientName: string, clientEmail?: string, availability?: {
        availableDates?: string[];
        availableTimes?: string[];
        availabilityText?: string;
    } | null): Promise<string>;
    close(): Promise<void>;
}
export declare function createCalendlyService(smitheryUrl: string): Promise<CalendlyService>;
//# sourceMappingURL=calendly.d.ts.map