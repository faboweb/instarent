import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import Exa from "exa-js";
import { createBot } from "./bot/telegram";
import { createVoiceService, VoiceService } from "./voice/elevenlabs";
import { createOutboundCallService, OutboundCallService } from "./voice/twilio";

// Validate required environment variables
const requiredEnvVars = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "CONVEX_URL"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function main() {
  // Initialize clients
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // Initialize Exa client (optional - for search)
  let exa: Exa | undefined;
  if (process.env.EXA_API_KEY) {
    exa = new Exa(process.env.EXA_API_KEY);
    console.log("✅ Exa search enabled");
  } else {
    console.warn("⚠️ EXA_API_KEY not set. Search disabled.");
  }

  // Initialize ElevenLabs voice service (optional)
  let voiceService: VoiceService | undefined;
  if (process.env.ELEVENLABS_API_KEY) {
    voiceService = createVoiceService(
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_VOICE_ID
    );
    console.log("✅ ElevenLabs voice enabled");
  } else {
    console.warn("⚠️ ELEVENLABS_API_KEY not set. Voice responses disabled.");
  }

  // Initialize Twilio outbound call service (optional)
  let callService: OutboundCallService | undefined;
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    callService = createOutboundCallService(
      {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      voiceService
    );
    console.log("✅ Twilio outbound calls enabled");
  } else {
    console.warn("⚠️ Twilio credentials not set. Outbound calls disabled.");
  }

  // Create and start bot
  const bot = createBot(
    process.env.TELEGRAM_BOT_TOKEN!,
    convex,
    openai,
    exa,
    voiceService,
    callService
  );

  console.log("🚀 InstaRent bot starting...");

  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`📱 Open Telegram and search for @${botInfo.username}`);
    },
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n👋 Shutting down...");
    bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
