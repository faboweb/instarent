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
export declare class OutboundCallService {
    private client;
    private phoneNumber;
    private voiceService?;
    private baseUrl?;
    constructor(config: TwilioConfig, voiceService?: VoiceService, baseUrl?: string);
    makeCall(toNumber: string, message: string, webhookUrl?: string): Promise<CallResult>;
    getCallStatus(callSid: string): Promise<CallResult>;
    getCallRecordings(callSid: string): Promise<string[]>;
    getCallTranscription(callSid: string): Promise<string | null>;
    generatePropertyInquiryScript(agentName: string, clientName: string, propertyTitle: string, propertyLocation: string): string;
}
export declare function createOutboundCallService(config: TwilioConfig, voiceService?: VoiceService, baseUrl?: string): OutboundCallService;
//# sourceMappingURL=twilio.d.ts.map