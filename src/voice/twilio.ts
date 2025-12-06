import Twilio from "twilio";
import { VoiceService } from "./elevenlabs";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface CallResult {
  callSid: string;
  status: string;
  duration?: number;
  transcript?: string;
}

export class OutboundCallService {
  private client: Twilio.Twilio;
  private phoneNumber: string;
  private voiceService?: VoiceService;
  private baseUrl?: string;

  constructor(config: TwilioConfig, voiceService?: VoiceService, baseUrl?: string) {
    if (!config.accountSid) {
      throw new Error("Twilio accountSid is required. Please set TWILIO_ACCOUNT_SID environment variable.");
    }
    if (!config.authToken) {
      throw new Error("Twilio authToken is required. Please set TWILIO_AUTH_TOKEN environment variable.");
    }
    if (!config.phoneNumber) {
      throw new Error("Twilio phoneNumber is required. Please set TWILIO_PHONE_NUMBER environment variable.");
    }
    // Validate phone number format (should be E.164 format: +1234567890)
    const trimmedPhone = config.phoneNumber.trim();
    if (!trimmedPhone.startsWith("+")) {
      console.warn(`⚠️ Warning: Twilio phone number should be in E.164 format (e.g., +1234567890). Got: ${trimmedPhone}`);
    }
    this.client = Twilio(config.accountSid, config.authToken);
    this.phoneNumber = trimmedPhone;
    this.voiceService = voiceService;
    this.baseUrl = baseUrl;
  }

  async makeCall(
    toNumber: string,
    message: string,
    webhookUrl?: string
  ): Promise<CallResult> {
    if (!this.phoneNumber) {
      throw new Error("Twilio phoneNumber is not configured. Please set TWILIO_PHONE_NUMBER environment variable.");
    }
    if (!toNumber) {
      throw new Error("Destination phone number is required");
    }

    console.log(`📞 Initiating call from ${this.phoneNumber} to ${toNumber}`);

    try {
      // For demo: Use TwiML to speak the message
      // In production, you'd use ElevenLabs Conversational AI with Twilio Media Streams
      const twiml = `<Response><Say voice="Polly.Joanna" language="en-US">${escapeXml(message)}</Say><Pause length="1"/><Say voice="Polly.Joanna" language="en-US">Is this property still available?</Say><Pause length="3"/><Say voice="Polly.Joanna" language="en-US">And when would be a good time for us to schedule a viewing?</Say><Pause length="2"/><Say voice="Polly.Joanna" language="en-US">Thank you! We'll chat back with our client and get back to you.</Say></Response>`;

      const callParams: any = {
        twiml,
        to: toNumber,
        from: this.phoneNumber,
      };

      if (webhookUrl) {
        callParams.statusCallback = webhookUrl;
        callParams.statusCallbackEvent = ["initiated", "ringing", "answered", "completed"];
        callParams.statusCallbackMethod = "POST";
      }

      const call = await this.client.calls.create(callParams);

      console.log(`✅ Call initiated: ${call.sid}`);

      return {
        callSid: call.sid,
        status: call.status,
      };
    } catch (error: any) {
      // Handle specific Twilio errors with better messages
      if (error?.code === 21215) {
        const errorMessage = `Twilio account not authorized to call ${toNumber}. ` +
          `Please enable international permissions in your Twilio console: ` +
          `https://www.twilio.com/console/voice/calls/geo-permissions/low-risk`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      if (error?.code === 21211) {
        const errorMessage = `Invalid phone number format: ${toNumber}. Please use E.164 format (e.g., +1234567890)`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      if (error?.code === 21216) {
        const errorMessage = `Phone number ${toNumber} is not a valid, reachable phone number`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      console.error("Call error:", error);
      throw error;
    }
  }

  async getCallStatus(callSid: string): Promise<CallResult> {
    const call = await this.client.calls(callSid).fetch();

    return {
      callSid: call.sid,
      status: call.status,
      duration: call.duration ? parseInt(call.duration) : undefined,
    };
  }

  async getCallRecordings(callSid: string): Promise<string[]> {
    const recordings = await this.client.recordings.list({ callSid });
    return recordings.map((r) => r.uri);
  }

  async getCallTranscription(callSid: string): Promise<string | null> {
    try {
      // Get recordings for this call
      const recordings = await this.client.recordings.list({ callSid });

      if (recordings.length === 0) {
        console.log(`  ⚠️ No recordings found for call ${callSid}`);
        return null;
      }

      // Find transcriptions for each recording (most recent first)
      const sortedRecordings = recordings.sort((a, b) =>
        new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
      );

      for (const recording of sortedRecordings) {
        try {
          // Get transcriptions for this recording
          const transcriptions = await this.client.recordings(recording.sid).transcriptions.list();

          if (transcriptions.length > 0) {
            // Get the most recent transcription
            const sortedTranscriptions = transcriptions.sort((a, b) =>
              new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
            );

            const transcription = await this.client.transcriptions(sortedTranscriptions[0].sid).fetch();
            if (transcription.transcriptionText) {
              return transcription.transcriptionText;
            }
          }
        } catch (error: any) {
          // Continue to next recording if this one doesn't have transcriptions
          console.log(`  ⚠️ No transcription found for recording ${recording.sid}:`, error.message);
          continue;
        }
      }

      console.log(`  ⚠️ No transcriptions found for any recordings of call ${callSid}`);
      return null;
    } catch (error: any) {
      console.error(`  ❌ Error fetching transcription for call ${callSid}:`, error.message);
      return null;
    }
  }

  generatePropertyInquiryScript(
    agentName: string,
    clientName: string,
    propertyTitle: string,
    propertyLocation: string
  ): string {
    return (
      `Hello, this is ${agentName} calling on behalf of ${clientName}. ` +
      `I'm reaching out regarding your property listing: ${propertyTitle} in ${propertyLocation}. ` +
      `My client is very interested in this property and would like to schedule a viewing. ` +
      `Could you please let us know your available times for a showing? ` +
      `You can reach us back at this number or leave a message.`
    );
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createOutboundCallService(
  config: TwilioConfig,
  voiceService?: VoiceService,
  baseUrl?: string
): OutboundCallService {
  return new OutboundCallService(config, voiceService, baseUrl);
}
