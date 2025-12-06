import Twilio from "twilio";
export class OutboundCallService {
    constructor(config, voiceService, baseUrl) {
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
    async makeCall(toNumber, initialMessage, webhookUrl) {
        if (!this.phoneNumber) {
            throw new Error("Twilio phoneNumber is not configured. Please set TWILIO_PHONE_NUMBER environment variable.");
        }
        if (!toNumber) {
            throw new Error("Destination phone number is required");
        }
        console.log(`📞 Initiating call from ${this.phoneNumber} to ${toNumber}`);
        try {
            // Natural conversation flow with pauses
            // Structure: Intro + availability question -> pause -> viewing question -> pause -> closing
            const viewingQuestion = this.generateViewingQuestionScript();
            const closing = this.generateClosingScript();
            const twiml = `
        <Response>
          <Say voice="Polly.Nicha" language="th-TH">
            ${escapeXml(initialMessage)}
          </Say>
          <Pause length="3"/>
          <Say voice="Polly.Nicha" language="th-TH">
            ${escapeXml(viewingQuestion)}
          </Say>
          <Pause length="3"/>
          <Say voice="Polly.Nicha" language="th-TH">
            ${escapeXml(closing)}
          </Say>
          <Pause length="1"/>
          <Record maxLength="90" transcribe="true" finishOnKey="#" />
        </Response>
      `;
            const callParams = {
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
        }
        catch (error) {
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
    async getCallStatus(callSid) {
        const call = await this.client.calls(callSid).fetch();
        return {
            callSid: call.sid,
            status: call.status,
            duration: call.duration ? parseInt(call.duration) : undefined,
        };
    }
    async getCallRecordings(callSid) {
        const recordings = await this.client.recordings.list({ callSid });
        return recordings.map((r) => r.uri);
    }
    async getCallTranscription(callSid) {
        try {
            // Get recordings for this call
            const recordings = await this.client.recordings.list({ callSid });
            if (recordings.length === 0) {
                console.log(`  ⚠️ No recordings found for call ${callSid}`);
                return null;
            }
            // Find transcriptions for each recording (most recent first)
            const sortedRecordings = recordings.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
            for (const recording of sortedRecordings) {
                try {
                    // Get transcriptions for this recording
                    const transcriptions = await this.client.recordings(recording.sid).transcriptions.list();
                    if (transcriptions.length > 0) {
                        // Get the most recent transcription
                        const sortedTranscriptions = transcriptions.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
                        const transcription = await this.client.transcriptions(sortedTranscriptions[0].sid).fetch();
                        if (transcription.transcriptionText) {
                            return transcription.transcriptionText;
                        }
                    }
                }
                catch (error) {
                    // Continue to next recording if this one doesn't have transcriptions
                    console.log(`  ⚠️ No transcription found for recording ${recording.sid}:`, error.message);
                    continue;
                }
            }
            console.log(`  ⚠️ No transcriptions found for any recordings of call ${callSid}`);
            return null;
        }
        catch (error) {
            console.error(`  ❌ Error fetching transcription for call ${callSid}:`, error.message);
            return null;
        }
    }
    generatePropertyInquiryScript(agentName, clientName, clientOrigin, propertyTitle, propertyLocation, moveInDate) {
        const originInfo = clientOrigin ? ` who is from ${clientOrigin}` : "";
        const moveInInfo = moveInDate ? ` They want to move in ${moveInDate}.` : "";
        return (`Hi, this is ${agentName}. My client${originInfo} is interested in your property: ${propertyTitle} in ${propertyLocation}.${moveInInfo} ` +
            `Is this still available?`);
    }
    generateViewingQuestionScript() {
        return `When would you be able to do a viewing?`;
    }
    generateClosingScript() {
        return `Great, I'll check with my client and get back to you. Talk to you soon!`;
    }
}
function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
export function createOutboundCallService(config, voiceService, baseUrl) {
    return new OutboundCallService(config, voiceService, baseUrl);
}
//# sourceMappingURL=twilio.js.map