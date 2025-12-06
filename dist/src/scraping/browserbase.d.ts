export interface BrowserbaseConfig {
    /**
     * Smithery URL or direct Browserbase MCP URL.
     * For Smithery: https://server.smithery.ai/@browserbasehq/mcp-browserbase/mcp?api_key=...&profile=...
     * For direct Browserbase: https://mcp.browserbase.com/mcp?api_key=...&profile=...
     * Or just the full URL string
     */
    smitheryUrl: string;
}
/**
 * Helper function to construct a Smithery URL from API key and profile
 */
export declare function constructSmitheryUrl(apiKey: string, profile: string): string;
export interface BrowserbaseClient {
    sessionId: string;
    navigate(url: string): Promise<void>;
    act(action: string): Promise<string>;
    extract(instruction: string, schema?: object): Promise<unknown>;
    screenshot(): Promise<string>;
    observe(instruction: string): Promise<unknown[]>;
    close(): Promise<void>;
}
export declare function createBrowserbaseClient(config: BrowserbaseConfig): Promise<BrowserbaseClient>;
//# sourceMappingURL=browserbase.d.ts.map