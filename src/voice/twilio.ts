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
    this.client = Twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
    this.voiceService = voiceService;
    this.baseUrl = baseUrl;
  }

  async makeCall(
    toNumber: string,
    message: string,
    webhookUrl?: string
  ): Promise<CallResult> {
    console.log(`📞 Initiating call to ${toNumber}`);

    try {
      // For demo: Use TwiML to speak the message
      // In production, you'd use ElevenLabs Conversational AI with Twilio Media Streams
      const twiml = `
        <Response>
          <Say voice="Polly.Joanna" language="en-US">
            ${escapeXml(message)}
          </Say>
          <Pause length="2"/>
          <Say voice="Polly.Joanna" language="en-US">
            Please leave a message after the beep if you're interested, and we'll get back to you.
          </Say>
          <Record maxLength="60" transcribe="true" />
          <Say voice="Polly.Joanna" language="en-US">
            Thank you for your time. Goodbye!
          </Say>
        </Response>
      `;

      const call = await this.client.calls.create({
        twiml,
        to: toNumber,
        from: this.phoneNumber,
        statusCallback: webhookUrl,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      });

      console.log(`✅ Call initiated: ${call.sid}`);

      return {
        callSid: call.sid,
        status: call.status,
      };
    } catch (error) {
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
