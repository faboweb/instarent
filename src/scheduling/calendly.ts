// Calendly integration via Smithery MCP for appointment scheduling

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

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
export function constructSmitheryUrl(apiKey: string, accessToken: string): string {
  const url = new URL("https://server.smithery.ai/@zapier/mcp-calendly/mcp");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

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

export class CalendlyService {
  private client: Client;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void>;

  constructor(config: CalendlyConfig) {
    this.client = new Client(
      { name: "instarent-calendly", version: "1.0.0" },
      { capabilities: {} }
    );
    this.connectionPromise = this.connect(config.smitheryUrl);
  }

  private async connect(smitheryUrl: string): Promise<void> {
    // Validate URL format
    let mcpUrl: URL;
    try {
      mcpUrl = new URL(smitheryUrl);
      if (!["http:", "https:"].includes(mcpUrl.protocol)) {
        throw new Error(`Invalid protocol: ${mcpUrl.protocol}. Expected http: or https:`);
      }

      if (!mcpUrl.hostname.includes("smithery.ai")) {
        console.warn(`⚠️ URL hostname (${mcpUrl.hostname}) doesn't match expected Smithery domain.`);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid SMITHERY_CALENDLY_URL format: ${smitheryUrl}. Expected a valid URL.`);
      }
      throw error;
    }

    // Connect to Smithery Calendly MCP server
    const transport = new StreamableHTTPClientTransport(mcpUrl);

    try {
      await this.client.connect(transport);
      this.isConnected = true;
      console.log(`✅ Connected to Smithery Calendly MCP server`);
    } catch (error: any) {
      if (error?.code === 400 || error?.event?.code === 400 || error?.status === 400) {
        const maskedUrl = mcpUrl.toString().replace(/api_key=[^&]+/, "api_key=***").replace(/access_token=[^&]+/, "access_token=***");
        throw new Error(
          `Failed to connect to Smithery Calendly MCP server: Invalid URL or credentials (400). ` +
          `Please check your SMITHERY_CALENDLY_URL. ` +
          `Format: https://server.smithery.ai/@zapier/mcp-calendly/mcp?api_key=...&access_token=... ` +
          `URL: ${maskedUrl}`
        );
      }
      throw error;
    }
  }

  private async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Ensure connection is established
    await this.connectionPromise;

    if (!this.isConnected) {
      throw new Error("Calendly MCP client not connected");
    }

    const result = await this.client.callTool({ name, arguments: args });
    if (result.isError) {
      throw new Error(`Calendly tool error: ${JSON.stringify(result.content)}`);
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

  async listAvailableTools(): Promise<string[]> {
    try {
      await this.connectionPromise;
      const tools = await this.client.listTools();
      return tools.tools.map(t => t.name);
    } catch (error: any) {
      console.error("Failed to list tools:", error);
      return [];
    }
  }

  async getEventTypes(): Promise<EventType[]> {
    try {
      console.log(`  📅 Getting current user to find event types...`);
      // Get current user first to get their event types
      const userResult = await this.callTool("get_current_user", {});

      console.log(`  📅 User result keys:`, userResult && typeof userResult === 'object' ? Object.keys(userResult as any) : 'not an object');

      // Log the full structure for debugging (limited depth)
      if (userResult && typeof userResult === 'object') {
        const user = userResult as any;
        console.log(`  📅 User resource keys:`, user.resource ? Object.keys(user.resource) : 'no resource');
        if (user.resource) {
          console.log(`  📅 User resource structure:`, JSON.stringify(user.resource, null, 2).substring(0, 500));
        }
      }

      let eventTypeUris: string[] = [];

      // Extract event type URIs from user result
      if (userResult && typeof userResult === 'object') {
        const user = userResult as any;
        // Event types might be in different places in the response
        if (user.event_types && Array.isArray(user.event_types)) {
          eventTypeUris = user.event_types.map((et: any) => et.uri || et);
        } else if (user.current_user?.event_types && Array.isArray(user.current_user.event_types)) {
          eventTypeUris = user.current_user.event_types.map((et: any) => et.uri || et);
        } else if (user.resource?.event_types && Array.isArray(user.resource?.event_types)) {
          eventTypeUris = user.resource.event_types.map((et: any) => et.uri || et);
        } else if (user.resource?.current_organization?.event_types && Array.isArray(user.resource.current_organization.event_types)) {
          eventTypeUris = user.resource.current_organization.event_types.map((et: any) => et.uri || et);
        } else if (user.resource?.uri) {
          console.log(`  📅 Found user URI: ${user.resource.uri}`);
        }
      }

      console.log(`  📅 Found ${eventTypeUris.length} event type URIs`);

      // If we have event type URIs, fetch details for each
      if (eventTypeUris.length > 0) {
        const eventTypes: EventType[] = [];
        for (const uri of eventTypeUris.slice(0, 10)) { // Limit to first 10
          try {
            console.log(`  📅 Fetching event type: ${uri}`);
            const eventTypeResult = await this.callTool("get_event_type", { uri });
            if (eventTypeResult && typeof eventTypeResult === 'object') {
              const et = eventTypeResult as any;
              const eventType = et.resource || et;
              eventTypes.push({
                uri: eventType.uri || uri,
                name: eventType.name || "",
                duration: eventType.duration || 30,
                schedulingUrl: eventType.scheduling_url || eventType.url || "",
              });
              console.log(`  ✅ Got event type: ${eventType.name || uri}`);
            }
          } catch (error) {
            console.warn(`  ⚠️ Failed to get event type ${uri}:`, error);
          }
        }
        if (eventTypes.length > 0) {
          console.log(`  ✅ Retrieved ${eventTypes.length} event types`);
          return eventTypes;
        }
      }

      // Fallback: return empty array if we can't get event types
      console.warn("⚠️ Could not retrieve event types from user data");
      return [];
    } catch (error: any) {
      throw new Error(`Failed to get event types: ${error.message || error}`);
    }
  }

  // NOTE: The Zapier Calendly MCP server does NOT expose any list_scheduled_events tools.
  // Our attempts to call them resulted in errors. To avoid noisy errors and because
  // we already rely on the user's Telegram confirmation, this method simply returns
  // an empty array and logs a warning.
  async getScheduledEvents(
    _minStartTime?: string,
    _maxStartTime?: string
  ): Promise<ScheduledEvent[]> {
    console.warn(
      "⚠️ Calendly MCP server does not expose scheduled-events listing tools; " +
      "getScheduledEvents() will return an empty list and rely on user confirmation instead."
    );
    return [];
  }

  generateSchedulingLink(
    eventTypeSlug: string,
    prefillName?: string,
    prefillEmail?: string
  ): string {
    let url = `https://calendly.com/${eventTypeSlug}`;

    const params = new URLSearchParams();
    if (prefillName) params.set("name", prefillName);
    if (prefillEmail) params.set("email", prefillEmail);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return url;
  }

  // Create a one-off scheduling link for property viewing
  async createPropertyViewingLink(
    propertyTitle: string,
    clientName: string,
    clientEmail?: string,
    availability?: { availableDates?: string[]; availableTimes?: string[]; availabilityText?: string } | null
  ): Promise<string> {
    try {
      // First, try to get the current user to get their scheduling URL
      const userResult = await this.callTool("get_current_user", {});
      let userSchedulingUrl: string | undefined;
      let userUri: string | undefined;

      if (userResult && typeof userResult === 'object') {
        const user = userResult as any;
        userSchedulingUrl = user.resource?.scheduling_url || user.scheduling_url;
        userUri = user.resource?.uri || user.uri || user.current_user?.uri;
      }

      // Try to create a one-off event type if we have user URI
      if (userUri) {
        try {
          console.log(`  📅 Attempting to create one-off event type...`);

          // Build date_setting based on availability
          let dateSetting: Record<string, unknown> = {
            type: "round_robin", // Default to flexible scheduling
          };

          // If we have specific availability, try to configure it (best-effort)
          if (availability?.availableDates && availability.availableDates.length > 0) {
            console.log(`  📅 Owner specified dates: ${availability.availableDates.join(", ")}`);
          }

          const oneOffArgs: Record<string, unknown> = {
            name: `Property Viewing: ${propertyTitle}${availability?.availabilityText ? ` (${availability.availabilityText})` : ""}`,
            duration: 30, // 30 minutes
            kind: "solo", // Solo event
            host: userUri, // Required: user URI as host
            date_setting: dateSetting,
          };

          // Add availability text as description if available
          if (availability?.availabilityText) {
            oneOffArgs.description = `Available times: ${availability.availabilityText}`;
          } else if (availability?.availableDates || availability?.availableTimes) {
            const datesText = availability.availableDates?.join(", ") || "";
            const timesText = availability.availableTimes?.join(", ") || "";
            oneOffArgs.description = `Available: ${[datesText, timesText].filter(Boolean).join(" - ")}`;
          }

          const oneOffResult = await this.callTool("create_one_off_event_type", oneOffArgs);
          if (oneOffResult && typeof oneOffResult === 'object') {
            const et = oneOffResult as any;
            const eventTypeUri = et.resource?.uri || et.uri || et.event_type_uri;
            if (eventTypeUri) {
              console.log(`  ✅ Created one-off event type: ${eventTypeUri}`);
              // Now use this event type to create the scheduling link
              const linkArgs: Record<string, unknown> = {
                event_type_uri: eventTypeUri,
              };
              if (clientName) linkArgs.name = clientName;
              if (clientEmail) linkArgs.email = clientEmail;

              const linkResult = await this.callTool("create_single_use_scheduling_link", linkArgs);
              if (linkResult && typeof linkResult === 'object') {
                const link = (linkResult as any).scheduling_link ||
                  (linkResult as any).link ||
                  (linkResult as any).url ||
                  (linkResult as any).resource?.scheduling_link ||
                  (linkResult as any).resource?.link;
                if (link && typeof link === 'string') {
                  console.log(`✅ Created scheduling link using one-off event type`);
                  return link;
                }
              }
            }
          }
        } catch (oneOffError) {
          console.log(`  ⚠️ Could not create one-off event type:`, oneOffError);
        }
      }

      // If we have the user's scheduling URL, use it directly as a simple fallback
      if (userSchedulingUrl) {
        console.log(`  📅 Using user's scheduling URL: ${userSchedulingUrl}`);
        try {
          const url = new URL(userSchedulingUrl);
          if (clientName) url.searchParams.set('name', clientName);
          if (clientEmail) url.searchParams.set('email', clientEmail);
          return url.toString();
        } catch {
          const slug = userSchedulingUrl.replace('https://calendly.com/', '').replace('http://calendly.com/', '');
          if (slug) {
            return this.generateSchedulingLink(slug, clientName, clientEmail);
          }
        }
      }

      // Fallback: Get existing event types (if any)
      const eventTypes = await this.getEventTypes();

      if (eventTypes.length === 0) {
        throw new Error("No Calendly event types configured and no scheduling URL available. Please set up at least one event type in your Calendly account.");
      }

      // Use the first available event type
      const eventType = eventTypes[0];
      const eventTypeUri = eventType.uri;

      if (!eventTypeUri) {
        throw new Error("Event type URI not found");
      }

      // Try create_single_use_scheduling_link first (better for one-time links)
      try {
        const args: Record<string, unknown> = {
          event_type_uri: eventTypeUri,
        };
        if (clientName) {
          args.name = clientName;
        }
        if (clientEmail) {
          args.email = clientEmail;
        }

        const result = await this.callTool("create_single_use_scheduling_link", args);
        if (result && typeof result === 'object') {
          const link = (result as any).scheduling_link ||
            (result as any).link ||
            (result as any).url ||
            (result as any).resource?.scheduling_link ||
            (result as any).resource?.link;
          if (link && typeof link === 'string') {
            console.log(`✅ Created single-use scheduling link`);
            return link;
          }
        }
      } catch (singleUseError) {
        console.log(`⚠️ create_single_use_scheduling_link failed, trying create_scheduling_link:`, singleUseError);
      }

      // Fallback to create_scheduling_link
      try {
        const args: Record<string, unknown> = {
          event_type_uri: eventTypeUri,
        };
        if (clientName) {
          args.name = clientName;
        }
        if (clientEmail) {
          args.email = clientEmail;
        }

        const result = await this.callTool("create_scheduling_link", args);
        if (result && typeof result === 'object') {
          const link = (result as any).scheduling_link ||
            (result as any).link ||
            (result as any).url ||
            (result as any).resource?.scheduling_link ||
            (result as any).resource?.link;
          if (link && typeof link === 'string') {
            console.log(`✅ Created scheduling link`);
            return link;
          }
        }
      } catch (createLinkError) {
        console.log(`⚠️ create_scheduling_link failed, falling back to manual link generation:`, createLinkError);
      }

      // Final fallback: Generate link manually from event type
      console.log(`⚠️ Using manual link generation as fallback`);
      const slug = eventType.schedulingUrl.split("/").pop() ||
        eventTypeUri.split("/").pop() ||
        "30min";

      return this.generateSchedulingLink(slug, clientName, clientEmail);
    } catch (error: any) {
      throw new Error(`Failed to create scheduling link: ${error.message || error}`);
    }
  }

  async close(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log("🔒 Calendly MCP client closed");
      } catch (error) {
        console.warn("⚠️ Error closing Calendly MCP client:", error);
      }
    }
  }
}

export async function createCalendlyService(
  smitheryUrl: string
): Promise<CalendlyService> {
  const service = new CalendlyService({ smitheryUrl });
  // Ensure connection is established before returning
  await (service as any).connectionPromise;
  return service;
}
