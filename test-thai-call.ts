import { config } from "dotenv";
import { createOutboundCallService } from "./src/voice/twilio";

// Load environment variables
config();

async function testThaiCall() {
  console.log("📞 Testing Thai voice call...\n");

  // Get phone number from command line argument
  const toNumber = process.argv[2];

  if (!toNumber) {
    console.error("❌ Usage: npx tsx test-thai-call.ts <phone-number>");
    console.error("   Example: npx tsx test-thai-call.ts +66812345678");
    process.exit(1);
  }

  if (!toNumber.startsWith("+")) {
    console.error("❌ Phone number must be in E.164 format (e.g., +66812345678)");
    process.exit(1);
  }

  // Validate environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("❌ Missing Twilio configuration:");
    console.error("   - TWILIO_ACCOUNT_SID:", accountSid ? "✓" : "✗");
    console.error("   - TWILIO_AUTH_TOKEN:", authToken ? "✓" : "✗");
    console.error("   - TWILIO_PHONE_NUMBER:", fromNumber ? "✓" : "✗");
    process.exit(1);
  }

  // Create the outbound call service
  const callService = createOutboundCallService({
    accountSid,
    authToken,
    phoneNumber: fromNumber,
  });

  // Thai script for testing
  const thaiScript = `สวัสดีครับ ผมโทรมาเพื่อสอบถามเกี่ยวกับที่พักให้เช่าที่ท่านโพสต์ไว้ครับ ที่พักยังว่างอยู่ไหมครับ`;

  console.log("📝 Thai script to be spoken:");
  console.log(thaiScript);
  console.log("\n📞 Calling", toNumber, "from", fromNumber);
  console.log("📞 Making call...\n");

  try {
    const result = await callService.makeCall(toNumber, thaiScript);

    console.log("✅ Call initiated successfully!");
    console.log("   Call SID:", result.callSid);
    console.log("   Status:", result.status);
    console.log("\n⏳ Call is in progress. Check your phone!");

    // Wait a bit and check status
    console.log("\n⏳ Waiting 10 seconds before checking status...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const status = await callService.getCallStatus(result.callSid);
    console.log("\n📊 Call status update:");
    console.log("   Status:", status.status);
    if (status.duration) {
      console.log("   Duration:", status.duration, "seconds");
    }

    console.log("\n✅ Test complete!");

  } catch (error: any) {
    console.error("\n❌ Call failed:");
    console.error("   Error:", error.message);
    if (error.code) {
      console.error("   Error code:", error.code);
    }
    process.exit(1);
  }
}

testThaiCall();
