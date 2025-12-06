import { Bot } from "grammy";
import "dotenv/config";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

console.log("🤖 Testing Telegram bot connectivity...");

bot.on("message", (ctx) => {
  console.log("📨 Received message:", ctx.message);
});

bot.on("message:photo", (ctx) => {
  console.log("📸 Received photo!", ctx.message.photo);
});

console.log("✅ Bot starting... Send any message or photo now!");
bot.start();

setTimeout(() => {
  console.log("\n⏰ Test timeout - stopping bot");
  bot.stop();
  process.exit(0);
}, 30000);
