import { config } from "dotenv";
import Twilio from "twilio";

config();

async function checkCallStatus() {
  const callSid = process.argv[2];
  
  if (!callSid) {
    console.error("❌ Usage: npx tsx check-call-status.ts <call-sid>");
    process.exit(1);
  }

  const client = Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  try {
    const call = await client.calls(callSid).fetch();
    
    console.log("\n📊 Call Details:");
    console.log("   Call SID:", call.sid);
    console.log("   Status:", call.status);
    console.log("   Direction:", call.direction);
    console.log("   From:", call.from);
    console.log("   To:", call.to);
    console.log("   Start Time:", call.startTime);
    console.log("   End Time:", call.endTime);
    console.log("   Duration:", call.duration, "seconds");
    console.log("   Price:", call.price, call.priceUnit);
    
    if (call.status === "failed" || call.status === "busy" || call.status === "no-answer") {
      console.log("\n❌ Call failed!");
      console.log("   Error Code:", call.errorCode);
      console.log("   Error Message:", call.errorMessage);
    }
    
  } catch (error: any) {
    console.error("❌ Error fetching call:", error.message);
    process.exit(1);
  }
}

checkCallStatus();
