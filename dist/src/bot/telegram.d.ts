import { Bot } from "grammy";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import Exa from "exa-js";
import { VoiceService } from "../voice/elevenlabs";
import { OutboundCallService } from "../voice/twilio";
import { WebsiteScraper } from "../scraping/websites";
import { BrowserbaseClient } from "../scraping/browserbase";
import { DocuSignService } from "../contracts/docusign";
export declare function createBot(token: string, convex: ConvexHttpClient, openai: OpenAI, exa?: Exa, voiceService?: VoiceService, callService?: OutboundCallService, websiteScraper?: WebsiteScraper, browserbaseClient?: BrowserbaseClient, docusignService?: DocuSignService): Bot<import("grammy").Context, import("grammy").Api<import("grammy").RawApi>>;
//# sourceMappingURL=telegram.d.ts.map