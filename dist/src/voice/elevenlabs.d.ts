export interface VoiceConfig {
    apiKey: string;
    voiceId?: string;
}
export declare class VoiceService {
    private client;
    private voiceId;
    constructor(config: VoiceConfig);
    textToSpeech(text: string): Promise<Buffer>;
    generateListingSummary(listings: Array<{
        title: string;
        price: number;
        currency: string;
        location: string;
        bedrooms?: number;
    }>): Promise<Buffer>;
    generateUpdateMessage(message: string): Promise<Buffer>;
}
export declare function createVoiceService(apiKey: string, voiceId?: string): VoiceService;
//# sourceMappingURL=elevenlabs.d.ts.map