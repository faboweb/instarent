import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN!;

async function verifyBot() {
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data: any = await res.json();
  
  console.log("\n🤖 Bot Information:");
  console.log(`   Username: @${data.result.username}`);
  console.log(`   Name: ${data.result.first_name}`);
  console.log(`   Bot ID: ${data.result.id}`);
  
  console.log("\n📝 To test, open Telegram and:");
  console.log(`   1. Search for: @${data.result.username}`);
  console.log(`   2. Start a conversation or send a photo`);
  console.log(`   3. Check the logs above for "📸 Photo received from user!"`);
  
  // Check for recent updates
  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const updates: any = await updatesRes.json();
  
  if (updates.ok && updates.result.length > 0) {
    console.log(`\n📦 There are ${updates.result.length} pending updates (messages not yet processed)`);
    const latest = updates.result[updates.result.length - 1];
    console.log(`   Last update ID: ${latest.update_id}`);
    if (latest.message) {
      console.log(`   Last message from: ${latest.message.from.first_name} (ID: ${latest.message.from.id})`);
      if (latest.message.photo) {
        console.log(`   ⚠️ This message contains a PHOTO that hasn't been processed!`);
      }
    }
  } else {
    console.log(`\n✅ No pending updates - bot is consuming messages`);
  }
}

verifyBot();
