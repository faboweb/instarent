import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

export interface VoiceConfig {
  apiKey: string;
  voiceId?: string; // Default: "21m00Tcm4TlvDq8ikWAM" (Rachel)
}

export class VoiceService {
  private client: ElevenLabsClient;
  private voiceId: string;

  constructor(config: VoiceConfig) {
    this.client = new ElevenLabsClient({ apiKey: config.apiKey });
    this.voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Rachel - friendly female voice
  }

  async textToSpeech(text: string): Promise<Buffer> {
    console.log(`🎙️ Generating voice for: "${text.slice(0, 50)}..."`);

    const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
      text,
      modelId: "eleven_multilingual_v2", // Supports multiple languages
      outputFormat: "mp3_44100_128",
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];

    // Handle both Node.js streams and async iterables
    if (audioStream instanceof Readable) {
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
    } else if (Symbol.asyncIterator in audioStream) {
      for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
    }

    return Buffer.concat(chunks);
  }

  async generateListingSummary(listings: Array<{
    title: string;
    price: number;
    currency: string;
    location: string;
    bedrooms?: number;
  }>): Promise<Buffer> {
    // Create a natural speech summary
    const summaryParts = [`I found ${listings.length} great options for you.`];

    listings.forEach((listing, index) => {
      const bedroomText = listing.bedrooms !== undefined
        ? listing.bedrooms === 0
          ? "a studio"
          : `${listing.bedrooms} bedrooms`
        : "";

      summaryParts.push(
        `Option ${index + 1}: ${listing.title.slice(0, 50)}. ` +
        `${bedroomText ? `It has ${bedroomText} and costs` : "It costs"} ` +
        `${listing.price} ${listing.currency} per month.`
      );
    });

    summaryParts.push("Let me know which one interests you by selecting a number below.");

    const fullText = summaryParts.join(" ");
    return this.textToSpeech(fullText);
  }

  async generateUpdateMessage(message: string): Promise<Buffer> {
    return this.textToSpeech(message);
  }
}

export function createVoiceService(apiKey: string, voiceId?: string): VoiceService {
  return new VoiceService({ apiKey, voiceId });
}
