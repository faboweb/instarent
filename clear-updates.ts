import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN!;

async function clearUpdates() {
  console.log("🔍 Checking for pending updates...");
  
  // Get current updates
  const getUrl = `https://api.telegram.org/bot${token}/getUpdates`;
  const res = await fetch(getUrl);
  const data: any = await res.json();
  
  if (data.ok && data.result.length > 0) {
    console.log(`📦 Found ${data.result.length} pending updates`);
    const lastUpdateId = data.result[data.result.length - 1].update_id;
    console.log(`🧹 Clearing updates up to ID ${lastUpdateId}...`);
    
    // Clear by requesting with offset
    const clearUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}`;
    await fetch(clearUrl);
    
    console.log("✅ Updates cleared!");
  } else {
    console.log("✅ No pending updates");
  }
}

clearUpdates();
