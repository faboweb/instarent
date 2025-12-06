import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

async function main() {
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

  const conversations = await convex.query(api.conversations.getAllActive);
  
  for (const conv of conversations) {
    console.log(`\n📋 Conversation: ${conv._id}`);
    console.log(`Status: ${conv.status}`);
    console.log(`\nRequirements:`, JSON.stringify(conv.requirements, null, 2));
    
    // Get selected listing
    const listing = await convex.query(api.listings.getSelected, {
      conversationId: conv._id,
    });
    
    if (listing) {
      console.log(`\n🏠 Selected Listing:`);
      console.log(`  Title: ${listing.title}`);
      console.log(`  Price: ${listing.currency} ${listing.price}`);
      console.log(`  Location: ${listing.location}`);
      console.log(`  URL: ${listing.url}`);
    }
    
    // Get user
    const user = await convex.query(api.users.get, {
      userId: conv.userId,
    });
    
    if (user) {
      console.log(`\n👤 User:`);
      console.log(`  Name: ${user.firstName} ${user.lastName || ''}`);
      console.log(`  Telegram ID: ${user.telegramId}`);
    }
  }
}

main().catch(console.error);
