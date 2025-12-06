import { config } from "dotenv";
import Twilio from "twilio";

config();

async function checkRecentCalls() {
  const client = Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  try {
    // Get the last 5 calls
    const calls = await client.calls.list({ limit: 5 });

    console.log("\n📞 Recent Calls:\n");

    for (const call of calls) {
      console.log("─".repeat(60));
      console.log("Call SID:", call.sid);
      console.log("Status:", call.status);
      console.log("From:", call.from);
      console.log("To:", call.to);
      console.log("Start Time:", call.startTime);
      console.log("Duration:", call.duration, "seconds");
      console.log("Price:", call.price, call.priceUnit);

      if (call.status === "failed" || call.status === "busy" || call.status === "no-answer") {
        console.log("❌ Issue detected!");
        if (call.errorCode) {
          console.log("   Error Code:", call.errorCode);
          console.log("   Error Message:", call.errorMessage);
        }
      }
      console.log();
    }

  } catch (error: any) {
    console.error("❌ Error fetching calls:", error.message);
    process.exit(1);
  }
}

checkRecentCalls();
