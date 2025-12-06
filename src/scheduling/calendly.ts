// Calendly API integration for appointment scheduling

export interface CalendlyConfig {
  apiKey: string;
  userUri: string; // The user's Calendly URI
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
  private apiKey: string;
  private userUri: string;
  private baseUrl = "https://api.calendly.com";

  constructor(config: CalendlyConfig) {
    this.apiKey = config.apiKey;
    this.userUri = config.userUri;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendly API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getEventTypes(): Promise<EventType[]> {
    const data = await this.request<{
      collection: Array<{
        uri: string;
        name: string;
        duration: number;
        scheduling_url: string;
      }>;
    }>(`/event_types?user=${encodeURIComponent(this.userUri)}`);

    return data.collection.map((et) => ({
      uri: et.uri,
      name: et.name,
      duration: et.duration,
      schedulingUrl: et.scheduling_url,
    }));
  }

  async getScheduledEvents(
    minStartTime?: string,
    maxStartTime?: string
  ): Promise<ScheduledEvent[]> {
    let url = `/scheduled_events?user=${encodeURIComponent(this.userUri)}`;

    if (minStartTime) {
      url += `&min_start_time=${encodeURIComponent(minStartTime)}`;
    }
    if (maxStartTime) {
      url += `&max_start_time=${encodeURIComponent(maxStartTime)}`;
    }

    const data = await this.request<{
      collection: Array<{
        uri: string;
        name: string;
        start_time: string;
        end_time: string;
        status: string;
        location?: { location?: string };
      }>;
    }>(url);

    return data.collection.map((event) => ({
      uri: event.uri,
      name: event.name,
      startTime: event.start_time,
      endTime: event.end_time,
      status: event.status,
      location: event.location?.location,
    }));
  }

  generateSchedulingLink(
    eventTypeSlug: string,
    prefillName?: string,
    prefillEmail?: string
  ): string {
    // Extract username from userUri
    const userMatch = this.userUri.match(/users\/([^/]+)/);
    const username = userMatch ? userMatch[1] : "";

    let url = `https://calendly.com/${username}/${eventTypeSlug}`;

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
    clientEmail?: string
  ): Promise<string> {
    // Get the first event type (property viewing)
    const eventTypes = await this.getEventTypes();

    if (eventTypes.length === 0) {
      throw new Error("No Calendly event types configured");
    }

    // Use the first available event type
    const eventType = eventTypes[0];
    const slug = eventType.schedulingUrl.split("/").pop() || "30min";

    return this.generateSchedulingLink(slug, clientName, clientEmail);
  }
}

export function createCalendlyService(
  apiKey: string,
  userUri: string
): CalendlyService {
  return new CalendlyService({ apiKey, userUri });
}
