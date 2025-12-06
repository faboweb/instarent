import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

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
export function constructSmitheryUrl(apiKey: string, profile: string): string {
  const url = new URL("https://server.smithery.ai/@browserbasehq/mcp-browserbase/mcp");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("profile", profile);
  return url.toString();
}

export interface BrowserbaseClient {
  sessionId: string;
  navigate(url: string): Promise<void>;
  act(action: string): Promise<string>;
  extract(instruction: string, schema?: object): Promise<unknown>;
  screenshot(): Promise<string>;
  observe(instruction: string): Promise<unknown[]>;
  close(): Promise<void>;
}

export async function createBrowserbaseClient(
  config: BrowserbaseConfig
): Promise<BrowserbaseClient> {
  // Validate and parse URL (supports both Smithery and direct Browserbase MCP URLs)
  let mcpUrl: URL;
  try {
    mcpUrl = new URL(config.smitheryUrl);
    // Validate it's an HTTP/HTTPS URL
    if (!["http:", "https:"].includes(mcpUrl.protocol)) {
      throw new Error(`Invalid protocol: ${mcpUrl.protocol}. Expected http: or https:`);
    }

    // Check if it's a direct Browserbase MCP URL
    const isBrowserbaseDirect = mcpUrl.hostname === "mcp.browserbase.com" ||
      mcpUrl.hostname.includes("browserbase.com");
    const isSmithery = mcpUrl.hostname.includes("smithery.ai");

    if (!isBrowserbaseDirect && !isSmithery) {
      console.warn(`⚠️ URL hostname (${mcpUrl.hostname}) doesn't match expected Browserbase or Smithery domains.`);
    }

    // Validate required query parameters for direct Browserbase URLs
    if (isBrowserbaseDirect) {
      if (!mcpUrl.searchParams.has("api_key")) {
        throw new Error("Browserbase MCP URL must include 'api_key' query parameter");
      }
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid SMITHERY_BROWSERBASE_URL format: ${config.smitheryUrl}. Expected a valid URL.`);
    }
    throw error;
  }

  // Connect to Browserbase MCP server
  // Use StreamableHTTPClientTransport for Smithery, SSEClientTransport for direct Browserbase
  const isSmithery = mcpUrl.hostname.includes("smithery.ai");
  const isDirectBrowserbase = mcpUrl.hostname.includes("browserbase.com") &&
    !mcpUrl.hostname.includes("smithery");

  let transport;
  if (isSmithery) {
    // Smithery uses StreamableHTTPClientTransport (takes URL object)
    transport = new StreamableHTTPClientTransport(mcpUrl);
  } else if (isDirectBrowserbase) {
    // Direct Browserbase might use SSE (takes URL object)
    transport = new SSEClientTransport(mcpUrl);
  } else {
    // Default to StreamableHTTP for unknown formats
    transport = new StreamableHTTPClientTransport(mcpUrl);
  }

  const client = new Client(
    { name: "instarent-scraper", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    const transportType = isSmithery ? "Smithery" : isDirectBrowserbase ? "Browserbase MCP" : "MCP";
    console.log(`✅ Connected to ${transportType} server`);
  } catch (error: any) {
    // Provide more helpful error messages
    if (error?.code === 400 || error?.event?.code === 400 || error?.status === 400) {
      const urlType = isSmithery ? "Smithery" : isDirectBrowserbase ? "Browserbase MCP" : "MCP";
      const maskedUrl = mcpUrl.toString().replace(/api_key=[^&]+/, "api_key=***");
      throw new Error(
        `Failed to connect to ${urlType} server: Invalid URL or credentials (400). ` +
        `Please check your SMITHERY_BROWSERBASE_URL. ` +
        `For Smithery: https://server.smithery.ai/@browserbasehq/mcp-browserbase/mcp?api_key=...&profile=... ` +
        `For direct Browserbase: https://mcp.browserbase.com/mcp?api_key=...&profile=... ` +
        `URL: ${maskedUrl}`
      );
    }
    throw error;
  }

  // Helper to call MCP tools
  async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) {
      throw new Error(`Browserbase tool error: ${JSON.stringify(result.content)}`);
    }
    // Extract text content from result
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const textContent = content?.find((c) => c.type === "text");
    if (textContent && textContent.text) {
      try {
        return JSON.parse(textContent.text);
      } catch {
        return textContent.text;
      }
    }
    return result.content;
  }

  // Create a browser session with retry logic for rate limiting
  let sessionId: string = "";
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds base delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying session creation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.log("🔧 Creating Browserbase session...");
      }

      const result = await client.callTool({ name: "browserbase_session_create", arguments: {} });

      if (result.isError) {
        const errorContent = JSON.stringify(result.content);
        // Check for 429 rate limit error
        if (errorContent.includes("429") || errorContent.includes("rate limit") || errorContent.includes("Too Many Requests")) {
          if (attempt < maxRetries) {
            console.warn(`⚠️ Rate limit hit (429). Will retry...`);
            continue; // Retry with backoff
          } else {
            throw new Error(`Session creation failed: Rate limit exceeded (429). Please wait before trying again.`);
          }
        }
        throw new Error(`Session creation failed: ${errorContent}`);
      }

      // Extract sessionId from result - handle different response formats
      const content = result.content as Array<{ type: string; text?: string }> | undefined;
      const textContent = content?.find((c) => c.type === "text")?.text;

      if (textContent) {
        try {
          const parsed = JSON.parse(textContent);
          sessionId = parsed.sessionId || parsed.id || "";
        } catch {
          // If not JSON, try to extract sessionId from text
          const match = textContent.match(/sessionId["\s:]+([^"}\s,]+)/i) ||
            textContent.match(/id["\s:]+([^"}\s,]+)/i);
          sessionId = match ? match[1] : "";
        }
      }

      // Also check if result.content itself has sessionId
      if (!sessionId && typeof result.content === 'object' && result.content !== null) {
        const contentObj = result.content as any;
        sessionId = contentObj.sessionId || contentObj.id || "";
      }

      if (!sessionId) {
        console.error("Session creation response:", JSON.stringify(result.content, null, 2));
        throw new Error("Failed to create Browserbase session: No sessionId found in response");
      }

      console.log(`✅ Browserbase session created: ${sessionId}`);
      break; // Success, exit retry loop
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      const errorStr = String(error);

      // Check for 429 in error message
      if ((errorMsg.includes("429") || errorStr.includes("429") || errorMsg.includes("rate limit")) && attempt < maxRetries) {
        console.warn(`⚠️ Rate limit detected. Will retry...`);
        continue; // Retry with backoff
      }

      // If this is the last attempt or not a rate limit error, throw
      if (attempt === maxRetries) {
        throw new Error(`Failed to create Browserbase session after ${maxRetries + 1} attempts: ${errorMsg}`);
      }

      // For other errors, retry once more
      if (attempt < maxRetries) {
        console.warn(`⚠️ Session creation failed, retrying... Error: ${errorMsg}`);
        continue;
      }

      throw error;
    }
  }

  if (!sessionId) {
    throw new Error("Failed to create Browserbase session: No sessionId obtained after all retries");
  }

  const finalSessionId = sessionId; // Capture for closure

  return {
    get sessionId() { return finalSessionId; },
    async navigate(url: string): Promise<void> {
      await callTool("browserbase_stagehand_navigate", { sessionId, url });
      console.log(`🌐 Navigated to: ${url}`);
    },

    async act(action: string): Promise<string> {
      const result = await callTool("browserbase_stagehand_act", { sessionId, action });
      console.log(`🎯 Action: ${action}`);
      return result as string;
    },

    async extract(instruction: string, schema?: object): Promise<unknown> {
      const args: Record<string, unknown> = { sessionId, instruction };
      if (schema) {
        args.schema = schema;
      }
      const result = await callTool("browserbase_stagehand_extract", args);
      console.log(`📊 Extracted data for: ${instruction}`);
      return result;
    },

    async observe(instruction: string): Promise<unknown[]> {
      const result = await callTool("browserbase_stagehand_observe", { sessionId, instruction });
      console.log(`👁️ Observed: ${instruction}`);
      return result as unknown[];
    },

    async screenshot(): Promise<string> {
      const result = await callTool("browserbase_screenshot", { sessionId });
      console.log("📸 Screenshot captured");
      return result as string;
    },

    async close(): Promise<void> {
      try {
        await callTool("browserbase_session_close", { sessionId });
        console.log("🔒 Browserbase session closed");
      } catch (error) {
        console.warn("⚠️ Error closing Browserbase session:", error);
      }
      await client.close();
    },
  };
}
