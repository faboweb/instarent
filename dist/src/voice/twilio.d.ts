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
    makeCall(toNumber: string, initialMessage: string, webhookUrl?: string): Promise<CallResult>;
    getCallStatus(callSid: string): Promise<CallResult>;
    getCallRecordings(callSid: string): Promise<string[]>;
    getCallTranscription(callSid: string): Promise<string | null>;
    generatePropertyInquiryScript(agentName: string, clientName: string, clientOrigin: string | undefined, propertyTitle: string, propertyLocation: string, moveInDate?: string): string;
    generateViewingQuestionScript(): string;
    generateClosingScript(): string;
}
export declare function createOutboundCallService(config: TwilioConfig, voiceService?: VoiceService, baseUrl?: string): OutboundCallService;
//# sourceMappingURL=twilio.d.ts.map