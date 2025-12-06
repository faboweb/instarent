import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

async function main() {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

  // Get all active conversations
  const conversations = await convex.query(api.conversations.getAllActive);

  console.log(`Found ${conversations.length} active conversation(s)`);

  for (const conversation of conversations) {
    console.log(`\nConversation ${conversation._id}:`);
    console.log(`  Current status: ${conversation.status}`);

    // Move back to scheduling
    await convex.mutation(api.conversations.updateStatus, {
      conversationId: conversation._id,
      status: "scheduling",
    });

    console.log(`  ✅ Moved to: scheduling`);
  }
}

main()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
