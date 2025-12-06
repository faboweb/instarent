import { config } from "dotenv";
import { createOutboundCallService } from "./src/voice/twilio";

config();

async function testSimpleCall() {
  const toNumber = process.argv[2];

  if (!toNumber) {
    console.error("❌ Usage: npx tsx test-simple-call.ts <phone-number>");
    process.exit(1);
  }

  const callService = createOutboundCallService({
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
  });

  const simpleMessage = "Hello, this is a test call from InstaRent. Can you hear me?";

  console.log("📞 Making test call to", toNumber);
  console.log("📝 Message:", simpleMessage);

  try {
    const result = await callService.makeCall(toNumber, simpleMessage);
    console.log("\n✅ Call initiated!");
    console.log("   Call SID:", result.callSid);
    console.log("   Status:", result.status);
    console.log("\n⏳ Please answer your phone to confirm you can hear the voice!");

    // Wait longer before checking
    console.log("\n⏳ Waiting 20 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 20000));

    const status = await callService.getCallStatus(result.callSid);
    console.log("\n📊 Final status:", status.status);
    if (status.duration) {
      console.log("   Duration:", status.duration, "seconds");
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

testSimpleCall();
