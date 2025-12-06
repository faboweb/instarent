import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN!;
const apiUrl = `https://api.telegram.org/bot${token}/getMe`;

console.log("🔍 Testing bot API connection...");

fetch(apiUrl)
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log("✅ Bot API working! Bot info:", data.result);
    } else {
      console.log("❌ Bot API error:", data);
    }
  })
  .catch(err => {
    console.error("❌ Network error:", err);
  });
