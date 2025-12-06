import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import Exa from "exa-js";
import { createBot } from "./bot/telegram";
import { createVoiceService, VoiceService } from "./voice/elevenlabs";
import { createOutboundCallService, OutboundCallService } from "./voice/twilio";
import { createWebsiteScraper, WebsiteScraper } from "./scraping/websites";
import { createBrowserbaseClient, BrowserbaseClient } from "./scraping/browserbase";
import { createCalendlyService, CalendlyService } from "./scheduling/calendly";
import { createPaymentService, PaymentService } from "./payments/stripe";
import { createDocuSignService, DocuSignService } from "./contracts/docusign";
import { api } from "../convex/_generated/api";
import { searchListings, formatListingMessage } from "./search/exa";
import { InlineKeyboard } from "grammy";

// Helper function to check if user has scheduled an appointment in Calendly
async function checkForScheduledAppointment(
  convex: ConvexHttpClient,
  conversationId: string,
  appointment: any,
  calendlyService: CalendlyService,
  bot: ReturnType<typeof createBot>
): Promise<boolean> {
  try {
    console.log(`  📅 Checking for scheduled appointment in Calendly...`);

    // Get conversation and user info
    const conversation = await convex.query(api.conversations.get, {
      conversationId: conversationId as any,
    });
    if (!conversation) return false;

    const user = await convex.query(api.users.get, {
      userId: conversation.userId,
    });
    if (!user) return false;

    const requirements = conversation.requirements || {};
    const clientName = requirements.customerName || user.firstName || "";

    // Check for events scheduled in the last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const minStartTime = yesterday.toISOString();

    const scheduledEvents = await calendlyService.getScheduledEvents(minStartTime);

    console.log(`  📅 Found ${scheduledEvents.length} scheduled events in last 24 hours`);

    // Try to match events to this appointment
    // Match by: name similarity, or if event was created after appointment record
    for (const event of scheduledEvents) {
      // Check if event name matches or contains client name
      const nameMatch = clientName && event.name?.toLowerCase().includes(clientName.toLowerCase());

      // Check if event was created after the appointment record
      const appointmentCreatedAt = new Date(appointment.scheduledAt);
      const eventStartTime = new Date(event.startTime);

      // If event starts after appointment was created, it's likely a match
      if (eventStartTime > appointmentCreatedAt || nameMatch) {
        console.log(`  ✅ Found matching scheduled event: ${event.name} at ${event.startTime}`);

        // Update appointment with actual scheduled time
        await convex.mutation(api.appointments.updateStatus, {
          appointmentId: appointment._id,
          status: "confirmed",
          notes: `Scheduled via Calendly: ${event.name} on ${event.startTime}`,
        });

        // Update calendlyEventUri if we have the event URI
        if (event.uri) {
          // Note: We'd need an update mutation that allows updating calendlyEventUri
          // For now, we'll just update the status
        }

        // Move conversation to contracting state
        await convex.mutation(api.conversations.updateStatus, {
          conversationId: conversationId as any,
          status: "contracting",
        });

        // Notify user
        await bot.api.sendMessage(
          user.telegramId,
          `✅ Great! I see you've scheduled your viewing for:\n\n` +
          `📅 ${event.name || "Property Viewing"}\n` +
          `🕐 ${new Date(event.startTime).toLocaleString()}\n` +
          `${event.location ? `📍 ${event.location}\n` : ""}\n` +
          `Perfect! Let's move forward with the contract.`
        );

        return true;
      }
    }

    return false;
  } catch (error: any) {
    console.error(`  ❌ Error checking for scheduled appointment:`, error);
    return false;
  }
}

// Validate required environment variables
const requiredEnvVars = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY", "CONVEX_URL"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function main() {
  // Initialize clients
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // Initialize Exa client (optional - for search)
  let exa: Exa | undefined;
  if (process.env.EXA_API_KEY) {
    exa = new Exa(process.env.EXA_API_KEY);
    console.log("✅ Exa search enabled");
  } else {
    console.warn("⚠️ EXA_API_KEY not set. Search disabled.");
  }

  // Initialize ElevenLabs voice service (optional)
  let voiceService: VoiceService | undefined;
  if (process.env.ELEVENLABS_API_KEY) {
    voiceService = createVoiceService(
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_VOICE_ID
    );
    console.log("✅ ElevenLabs voice enabled");
  } else {
    console.warn("⚠️ ELEVENLABS_API_KEY not set. Voice responses disabled.");
  }

  // Initialize Twilio outbound call service (optional)
  let callService: OutboundCallService | undefined;
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    callService = createOutboundCallService(
      {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      },
      voiceService
    );
    console.log("✅ Twilio outbound calls enabled");
  } else {
    console.warn("⚠️ Twilio credentials not set. Outbound calls disabled.");
  }

  // Initialize website scraper (optional) - DISABLED
  let websiteScraper: WebsiteScraper | undefined;
  // if (process.env.SMITHERY_BROWSERBASE_URL) {
  //   try {
  //     websiteScraper = await createWebsiteScraper({
  //       smitheryUrl: process.env.SMITHERY_BROWSERBASE_URL,
  //     });
  //     console.log("✅ Website scraper enabled");
  //   } catch (scraperError: any) {
  //     console.error("❌ Failed to initialize website scraper:");
  //     if (scraperError?.message) {
  //       console.error(`   ${scraperError.message}`);
  //     } else {
  //       console.error(`   ${scraperError}`);
  //     }
  //     console.warn("⚠️ Website scraping disabled.");
  //   }
  // } else {
  //   console.warn("⚠️ SMITHERY_BROWSERBASE_URL not set. Website scraping disabled.");
  // }
  console.warn("⚠️ Website scraping disabled (Browserbase disabled).");

  // Initialize Browserbase client (optional - for form submissions) - DISABLED
  let browserbaseClient: BrowserbaseClient | undefined;
  // if (process.env.SMITHERY_BROWSERBASE_URL) {
  //   try {
  //     // Validate URL format before attempting connection
  //     const url = process.env.SMITHERY_BROWSERBASE_URL.trim();
  //     if (!url.startsWith("http://") && !url.startsWith("https://")) {
  //       throw new Error("SMITHERY_BROWSERBASE_URL must start with http:// or https://");
  //     }

  //     browserbaseClient = await createBrowserbaseClient({
  //       smitheryUrl: url,
  //     });
  //     console.log("✅ Browserbase client enabled");
  //   } catch (browserbaseError: any) {
  //     console.error("❌ Failed to initialize Browserbase client:");
  //     if (browserbaseError?.message) {
  //       console.error(`   ${browserbaseError.message}`);
  //     } else {
  //       console.error(`   ${browserbaseError}`);
  //     }
  //     console.warn("⚠️ Form submissions will be disabled. Phone calls will still work.");
  //   }
  // } else {
  //   console.warn("⚠️ SMITHERY_BROWSERBASE_URL not set. Form submissions disabled.");
  // }
  console.warn("⚠️ Form submissions disabled (Browserbase disabled).");

  // Initialize Calendly service (optional)
  let calendlyService: CalendlyService | undefined;
  if (process.env.SMITHERY_CALENDLY_URL) {
    try {
      calendlyService = await createCalendlyService(process.env.SMITHERY_CALENDLY_URL);
      console.log("✅ Calendly scheduling enabled");
    } catch (calendlyError: any) {
      console.error("❌ Failed to initialize Calendly service:");
      if (calendlyError?.message) {
        console.error(`   ${calendlyError.message}`);
      } else {
        console.error(`   ${calendlyError}`);
      }
      console.warn("⚠️ Scheduling disabled.");
    }
  } else {
    console.warn("⚠️ SMITHERY_CALENDLY_URL not set. Scheduling disabled.");
  }

  // Initialize Stripe payment service (optional)
  let paymentService: PaymentService | undefined;
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      paymentService = createPaymentService(process.env.STRIPE_SECRET_KEY);
      console.log("✅ Stripe payment service enabled");
    } catch (stripeError: any) {
      console.error("❌ Failed to initialize Stripe payment service:");
      if (stripeError?.message) {
        console.error(`   ${stripeError.message}`);
      } else {
        console.error(`   ${stripeError}`);
      }
      console.warn("⚠️ Payment processing disabled.");
    }
  } else {
    console.warn("⚠️ STRIPE_SECRET_KEY not set. Payment processing disabled.");
  }

  // Initialize DocuSign service (optional)
  let docusignService: DocuSignService | undefined;
  if (
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_USER_ID &&
    process.env.DOCUSIGN_ACCOUNT_ID &&
    process.env.DOCUSIGN_BASE_PATH &&
    (process.env.DOCUSIGN_PRIVATE_KEY || process.env.DOCUSIGN_PRIVATE_KEY_PATH)
  ) {
    try {
      docusignService = createDocuSignService({
        integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
        userId: process.env.DOCUSIGN_USER_ID,
        accountId: process.env.DOCUSIGN_ACCOUNT_ID,
        basePath: process.env.DOCUSIGN_BASE_PATH,
        privateKey: process.env.DOCUSIGN_PRIVATE_KEY, // Direct key content
        privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH, // Or file path
        returnUrl: process.env.DOCUSIGN_RETURN_URL,
      });
      console.log("✅ DocuSign contract signing enabled");
    } catch (docusignError: any) {
      console.error("❌ Failed to initialize DocuSign service:");
      if (docusignError?.message) {
        console.error(`   ${docusignError.message}`);
      } else {
        console.error(`   ${docusignError}`);
      }
      console.warn("⚠️ Contract signing disabled.");
    }
  } else {
    console.warn("⚠️ DocuSign credentials not set. Contract signing disabled.");
  }

  // Create and start bot
  const bot = createBot(
    process.env.TELEGRAM_BOT_TOKEN!,
    convex,
    openai,
    exa,
    voiceService,
    callService,
    websiteScraper,
    browserbaseClient,
    docusignService,
    paymentService
  );

  console.log("🚀 InstaRent bot starting...");

  // Run scraper on startup (background task) - DISABLED
  // if (websiteScraper) {
  //   console.log("🌐 Starting background scraping for Chiang Mai properties (delayed 5s to avoid rate limits)...");
  //   setTimeout(() => {
  //     scrapeOnStartup(websiteScraper!, convex).catch((error) => {
  //       console.error("❌ Error in startup scraping:", error);
  //     });
  //   }, 5000); // 5 second delay to avoid rate limits
  // }

  // Resume stuck conversations on startup
  await resumeStuckConversations(convex, openai, exa, bot, callService, calendlyService, docusignService, paymentService);

  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} is running!`);
      console.log(`📱 Open Telegram and search for @${botInfo.username}`);
    },
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n👋 Shutting down...");
    bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function resumeStuckConversations(
  convex: ConvexHttpClient,
  openai: OpenAI,
  exa: Exa | undefined,
  bot: ReturnType<typeof createBot>,
  callService?: OutboundCallService,
  calendlyService?: CalendlyService,
  docusignService?: DocuSignService,
  paymentService?: PaymentService
) {
  try {
    console.log("🔍 Checking for stuck conversations...");
    const activeConversations = await convex.query(api.conversations.getAllActive);

    if (activeConversations.length === 0) {
      console.log("✅ No active conversations found.");
      return;
    }

    console.log(`📋 Found ${activeConversations.length} active conversation(s)`);

    for (const conversation of activeConversations) {
      console.log(`🔄 Processing conversation ${conversation._id} (status: ${conversation.status})`);

      const requirements = conversation.requirements || {};
      const hasLocation = !!requirements.location;
      const hasBedrooms = requirements.bedrooms !== undefined;
      const hasBudget = !!requirements.maxBudget;

      // Handle "gathering_requirements" stuck conversations
      if (conversation.status === "gathering_requirements") {
        if (hasLocation && hasBedrooms && hasBudget) {
          console.log(`  ✅ Requirements complete. Moving to 'searching'...`);
          await convex.mutation(api.conversations.updateStatus, {
            conversationId: conversation._id,
            status: "searching",
          });

          // Trigger search if exa is available
          if (exa) {
            await performSearchAndNotify(convex, exa, conversation._id, requirements, bot);
          } else {
            console.log(`  ⚠️ Exa not available, cannot search`);
          }
        } else {
          console.log(`  ⏳ Still missing requirements:`, {
            hasLocation,
            hasBedrooms,
            hasBudget,
          });
        }
      }
      // Handle "searching" stuck conversations
      else if (conversation.status === "searching") {
        if (exa && hasLocation && hasBedrooms && hasBudget) {
          console.log(`  🔍 Resuming search...`);
          await performSearchAndNotify(convex, exa, conversation._id, requirements, bot);
        } else {
          console.log(`  ⚠️ Cannot resume search (exa: ${!!exa}, requirements: ${hasLocation && hasBedrooms && hasBudget})`);
        }
      }
      // Handle "contacting" stuck conversations
      else if (conversation.status === "contacting") {
        console.log(`  📞 Checking call status for contacting conversation...`);
        await handleContactingState(convex, conversation._id, bot, callService, calendlyService, openai);
      }
      // Handle "scheduling" stuck conversations
      else if (conversation.status === "scheduling") {
        console.log(`  📅 Handling scheduling state...`);
        // Check if appointment was already scheduled
        const appointments = await convex.query(api.appointments.getByConversation, {
          conversationId: conversation._id,
        });
        const appointment = appointments.find((a) => a.status === "scheduled" || a.status === "confirmed");

        if (appointment && calendlyService) {
          // Check if user has scheduled an appointment in Calendly
          const wasScheduled = await checkForScheduledAppointment(
            convex,
            conversation._id,
            appointment,
            calendlyService,
            bot
          );

          if (!wasScheduled) {
            // No appointment found yet, send/re-send the link
            await handleSchedulingState(convex, conversation._id, bot, calendlyService, openai);
          }
        } else {
          // No appointment record yet, create and send link
          await handleSchedulingState(convex, conversation._id, bot, calendlyService, openai);
        }
      }
      // Handle "contracting" stuck conversations
      else if (conversation.status === "contracting") {
        console.log(`  📝 Handling contracting state...`);
        await handleContractingState(convex, conversation._id, bot, docusignService);
      }
      // Handle "payment" stuck conversations
      else if (conversation.status === "payment") {
        console.log(`  💳 Handling payment state...`);
        await handlePaymentState(convex, conversation._id, bot, paymentService);
      }
      // Log other stuck states
      else {
        console.log(`  ℹ️ Conversation in '${conversation.status}' state (no auto-resume logic)`);
      }
    }

    console.log("✅ Finished processing stuck conversations");
  } catch (error) {
    console.error("❌ Error resuming stuck conversations:", error);
  }
}

async function performSearchAndNotify(
  convex: ConvexHttpClient,
  exa: Exa,
  conversationId: string,
  requirements: any,
  bot: ReturnType<typeof createBot>
) {
  try {
    console.log(`  🔍 Searching for listings...`);
    const listings = await searchListings(exa, requirements);

    if (listings.length === 0) {
      console.log(`  😕 No listings found`);
      // Update status back to gathering_requirements so user can adjust
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversationId as any,
        status: "gathering_requirements",
      });
      return;
    }

    console.log(`  ✅ Found ${listings.length} listings`);

    // Save listings to database
    await convex.mutation(api.listings.addMany, {
      conversationId: conversationId as any,
      listings: listings.map((l) => ({
        externalId: l.externalId,
        title: l.title,
        price: l.price,
        currency: l.currency,
        location: l.location,
        bedrooms: l.bedrooms,
        url: l.url,
        imageUrl: l.imageUrl,
        imageUrls: l.imageUrls,
        description: l.description,
        contactPhone: l.contactPhone,
        contactEmail: l.contactEmail,
        contactMethod: l.contactMethod,
      })),
    });

    // Update status to selecting
    await convex.mutation(api.conversations.updateStatus, {
      conversationId: conversationId as any,
      status: "selecting",
    });

    // Get user to send notification
    const conversation = await convex.query(api.conversations.get, {
      conversationId: conversationId as any,
    });
    if (!conversation) return;

    const user = await convex.query(api.users.get, {
      userId: conversation.userId,
    });
    if (!user) return;

    // Send notification to user
    const listingMessages = listings.map((l, i) => formatListingMessage(l, i));
    const keyboard = new InlineKeyboard();
    listings.forEach((_, i) => {
      keyboard.text(`${i + 1}`, `select_${i}`);
    });

    try {
      await bot.api.sendMessage(
        user.telegramId,
        `🏠 Found ${listings.length} listings for you:\n\n` +
        listingMessages.join("\n\n") +
        `\n\n👇 *Select a listing by clicking a number:*`,
        {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        }
      );
      console.log(`  📤 Sent listings to user ${user.telegramId}`);
    } catch (sendError) {
      console.error(`  ❌ Failed to send message to user ${user.telegramId}:`, sendError);
    }
  } catch (error) {
    console.error(`  ❌ Error performing search:`, error);
  }
}

async function handleContactingState(
  convex: ConvexHttpClient,
  conversationId: string,
  bot: ReturnType<typeof createBot>,
  callService?: OutboundCallService,
  calendlyService?: CalendlyService,
  openai?: OpenAI
) {
  try {
    // Get the latest call for this conversation
    let latestCall = await convex.query(api.calls.getLatestByConversation, {
      conversationId: conversationId as any,
    });

    if (!latestCall) {
      console.log(`  ⚠️ No call found for conversation. Skipping.`);
      return;
    }

    console.log(`  📞 Found call ${latestCall._id} with status: ${latestCall.status}`);

    // If call is pending and has no Twilio SID, initiate the call
    if (latestCall.status === "pending" && !latestCall.twilioCallSid && callService) {
      console.log(`  🚀 Call is pending but not initiated. Starting call now...`);

      try {
        const selectedListing = await convex.query(api.listings.getSelected, {
          conversationId: conversationId as any,
        });

        if (!selectedListing || !selectedListing.contactPhone) {
          console.log(`  ⚠️ No listing or phone number found. Cannot initiate call.`);
          return;
        }

        const conversation = await convex.query(api.conversations.get, {
          conversationId: conversationId as any,
        });
        if (!conversation) return;

        const user = await convex.query(api.users.get, {
          userId: conversation.userId,
        });
        if (!user) return;

        const requirements = conversation.requirements || {};
        const customerName = requirements.customerName || user.firstName || "a client";
        const customerOrigin = requirements.customerOrigin;
        const moveInDate = requirements.moveInDate;

        const script = callService.generatePropertyInquiryScript(
          "Mike Lee",
          customerName,
          selectedListing.title,
          selectedListing.location
        );

        const callResult = await callService.makeCall(
          selectedListing.contactPhone,
          script
        );

        await convex.mutation(api.calls.updateStatus, {
          callId: latestCall._id,
          status: "in_progress",
          twilioCallSid: callResult.callSid,
        });

        console.log(`  ✅ Call initiated successfully. Twilio SID: ${callResult.callSid}`);

        // Notify user
        try {
          await bot.api.sendMessage(
            user.telegramId,
            `📞 Call initiated to the property lister as Mike Lee!\n` +
            `Call ID: \`${callResult.callSid}\`\n\n` +
            `I'll update you when I hear back.`
          );
        } catch (error) {
          console.error(`  ❌ Failed to notify user:`, error);
        }

        return; // Exit early since we just initiated the call
      } catch (error: any) {
        console.error(`  ❌ Error initiating call:`, error);

        // Check if it's a permission/configuration error
        const isPermissionError = error?.message?.includes("not authorized") ||
          error?.message?.includes("international permissions") ||
          error?.code === 21215;

        // Mark call as failed with appropriate outcome
        await convex.mutation(api.calls.updateStatus, {
          callId: latestCall._id,
          status: "failed",
          outcome: isPermissionError ? "permission_error" : "failed",
        });

        // Notify user about permission errors
        if (isPermissionError) {
          try {
            const conversation = await convex.query(api.conversations.get, {
              conversationId: conversationId as any,
            });
            if (conversation) {
              const user = await convex.query(api.users.get, {
                userId: conversation.userId,
              });
              if (user) {
                await bot.api.sendMessage(
                  user.telegramId,
                  `❌ I encountered a configuration issue making the call. ` +
                  `Please contact support or try selecting a different listing.`
                );
              }
            }
          } catch (notifyError) {
            console.error(`  ❌ Failed to notify user:`, notifyError);
          }
        }
        return;
      }
    }

    // If call has Twilio SID and service is available, check actual status
    let twilioStatus: string | null = null;
    if (latestCall.twilioCallSid && callService) {
      try {
        const callResult = await callService.getCallStatus(latestCall.twilioCallSid);
        twilioStatus = callResult.status;
        console.log(`  📱 Twilio call status: ${twilioStatus}`);
      } catch (error) {
        console.error(`  ❌ Error checking Twilio status:`, error);
      }
    }

    // Fetch transcript if call is completed (from Twilio or DB) and we don't have it yet
    if (callService && latestCall.twilioCallSid && !latestCall.transcript) {
      const isCompleted = twilioStatus === "completed" || latestCall.status === "completed" || latestCall.status === "done";
      if (isCompleted) {
        console.log(`  📝 Fetching transcript for completed call...`);
        try {
          const transcript = await callService.getCallTranscription(latestCall.twilioCallSid);
          if (transcript) {
            console.log(`  ✅ Found transcript: ${transcript.substring(0, 100)}...`);
            await convex.mutation(api.calls.updateStatus, {
              callId: latestCall._id,
              transcript,
            });
            // Update latestCall to include the transcript for processing below
            latestCall = { ...latestCall, transcript };
          } else {
            console.log(`  ⚠️ No transcript found for call ${latestCall.twilioCallSid} (may still be processing)`);
          }
        } catch (transcriptError: any) {
          console.error(`  ❌ Error fetching transcript:`, transcriptError.message || transcriptError);
        }
      }
    }

    // Determine call outcome based on status
    const currentStatus = latestCall.status;
    const finalStatus = twilioStatus || currentStatus;

    // Map Twilio statuses to our internal states
    // Twilio statuses: queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
    let callState: "missed" | "failed" | "call_back" | "done" | null = null;

    // If we already have an outcome set, use it
    if (latestCall.outcome === "done") {
      callState = "done";
    } else if (latestCall.outcome === "call_back") {
      callState = "call_back";
    } else if (latestCall.outcome === "missed") {
      callState = "missed";
    } else if (latestCall.outcome === "failed") {
      callState = "failed";
    }
    // Otherwise, determine from Twilio status
    else if (finalStatus === "completed") {
      // If completed, check if we have a transcript or outcome
      if (latestCall.transcript && latestCall.transcript.length > 0) {
        // Check transcript for keywords indicating callback request
        const transcriptLower = latestCall.transcript.toLowerCase();
        if (transcriptLower.includes("call back") ||
          transcriptLower.includes("callback") ||
          transcriptLower.includes("call me back") ||
          transcriptLower.includes("call you back")) {
          callState = "call_back";
        } else {
          // Check if availability was mentioned (indicates successful contact)
          const availabilityKeywords = [
            "available", "availability", "free", "open",
            "can do", "can meet", "schedule", "time", "when",
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
            "morning", "afternoon", "evening", "tomorrow", "today", "weekend"
          ];
          const hasAvailability = availabilityKeywords.some(keyword =>
            transcriptLower.includes(keyword)
          );

          if (hasAvailability) {
            console.log(`  ✅ Availability mentioned in transcript. Moving to scheduling.`);
            callState = "done";
          } else {
            // Even without explicit availability keywords, if we got a response, consider it done
            console.log(`  ✅ Call completed with transcript. Moving to scheduling.`);
            callState = "done";
          }
        }
      } else {
        // No transcript yet, but call completed - check how long ago
        const callUpdatedAt = latestCall._creationTime; // Convex creation time
        const now = Date.now();
        const minutesSinceCall = (now - callUpdatedAt) / (1000 * 60);

        // If call was more than 5 minutes ago, assume transcript won't come and proceed
        if (minutesSinceCall > 5) {
          console.log(`  ✅ Call completed ${minutesSinceCall.toFixed(1)} minutes ago. No transcript available. Proceeding anyway...`);
          callState = "done";
        } else {
          console.log(`  ⏳ Call completed but no transcript yet. Will check again on next run.`);
          callState = null; // Don't change state yet, wait for transcript
        }
      }
    } else if (finalStatus === "no-answer" || finalStatus === "busy") {
      callState = "missed";
    } else if (finalStatus === "failed" || finalStatus === "canceled") {
      callState = "failed";
    } else if (finalStatus === "in-progress" || finalStatus === "ringing" || finalStatus === "queued") {
      // Still in progress, don't change state
      callState = null;
    }

    // Update call status if needed
    if (callState) {
      const newStatus = callState; // Use callState as the status
      const outcome = callState;   // Also use as outcome

      // Only update if status or outcome changed
      if (newStatus !== currentStatus || outcome !== (latestCall.outcome || "")) {
        await convex.mutation(api.calls.updateStatus, {
          callId: latestCall._id,
          status: newStatus,
          outcome,
        });

        console.log(`  ✅ Updated call status to: ${newStatus} (outcome: ${outcome})`);
      }
    }

    // Handle based on call state
    if (callState === "done") {
      // Move to scheduling stage
      console.log(`  ✅ Call completed successfully. Moving to 'scheduling'...`);
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversationId as any,
        status: "scheduling",
      });

      // Get OpenAI instance from main context (we'll need to pass it)
      // For now, we'll extract availability here and store it
      let availability: { availableDates?: string[]; availableTimes?: string[]; availabilityText?: string } | null = null;
      if (latestCall.transcript && openai) {
        availability = await extractAvailabilityFromTranscript(openai, latestCall.transcript);
        if (availability) {
          console.log(`  📅 Extracted availability from call:`, availability.availabilityText);
          // Store availability in call notes or conversation requirements
          await convex.mutation(api.calls.updateStatus, {
            callId: latestCall._id,
            outcome: latestCall.outcome || "done",
            // Store availability in notes if we have a notes field
          });
        }
      }

      // Handle scheduling state - create Calendly link and send to user
      await handleSchedulingState(convex, conversationId, bot, calendlyService, openai);
    } else if (callState === "call_back") {
      // Schedule a callback
      console.log(`  📞 Call back requested. Scheduling callback...`);

      // Reset to initial call state (pending, retryAttempt: 0, clear optional fields)
      await convex.mutation(api.calls.updateStatus, {
        callId: latestCall._id,
        status: "pending",
        retryAttempt: 0,
        outcome: null,
        scheduledTime: null,
        nextRetryTime: null,
      });

      // Notify user
      const conversation = await convex.query(api.conversations.get, {
        conversationId: conversationId as any,
      });
      if (!conversation) return;

      const user = await convex.query(api.users.get, {
        userId: conversation.userId,
      });
      if (!user) return;

      try {
        await bot.api.sendMessage(
          user.telegramId,
          `📞 The property lister asked for a callback. ` +
          `I'll reach out again in a couple of hours. ` +
          `I'll keep you updated!`
        );
      } catch (error) {
        console.error(`  ❌ Failed to notify user:`, error);
      }
    } else if (callState === "missed") {
      // Progressive backoff retry logic
      console.log(`  📞 Call was missed. Checking retry status...`);

      const retryAttempt = latestCall.retryAttempt ?? 0;
      const nextRetryTime = latestCall.nextRetryTime;
      const now = Date.now();

      // Progressive backoff schedule: 1h, 4h, 12h, 24h, 48h
      const backoffIntervals = [
        1 * 60 * 60 * 1000,   // 1 hour
        4 * 60 * 60 * 1000,   // 4 hours
        12 * 60 * 60 * 1000,  // 12 hours
        24 * 60 * 60 * 1000,  // 24 hours
        48 * 60 * 60 * 1000,  // 48 hours
      ];

      // If this is the first time we're handling this missed call, schedule the first retry
      if (!nextRetryTime && retryAttempt < backoffIntervals.length) {
        const nextRetry = new Date(now + backoffIntervals[retryAttempt]).toISOString();
        await convex.mutation(api.calls.updateStatus, {
          callId: latestCall._id,
          nextRetryTime: nextRetry,
        });
        console.log(`  ⏰ Scheduled retry ${retryAttempt + 1} at ${nextRetry}`);

        // Notify user
        const conversation = await convex.query(api.conversations.get, {
          conversationId: conversationId as any,
        });
        if (conversation) {
          const user = await convex.query(api.users.get, {
            userId: conversation.userId,
          });
          if (user) {
            try {
              const hoursUntilRetry = backoffIntervals[retryAttempt] / (60 * 60 * 1000);
              await bot.api.sendMessage(
                user.telegramId,
                `📞 The call was missed. I'll try again in ${hoursUntilRetry} hour${hoursUntilRetry > 1 ? 's' : ''}.`
              );
            } catch (error) {
              console.error(`  ❌ Failed to notify user:`, error);
            }
          }
        }
        return;
      }

      // Check if it's time to retry
      if (nextRetryTime && new Date(nextRetryTime).getTime() <= now) {
        if (retryAttempt >= backoffIntervals.length) {
          // Max retries exceeded, mark as failed
          console.log(`  ❌ Maximum retry attempts (${backoffIntervals.length}) exceeded. Marking as failed.`);
          await convex.mutation(api.calls.updateStatus, {
            callId: latestCall._id,
            status: "failed",
            outcome: "failed",
          });
          await convex.mutation(api.conversations.updateStatus, {
            conversationId: conversationId as any,
            status: "selecting",
          });

          // Notify user
          const conversation = await convex.query(api.conversations.get, {
            conversationId: conversationId as any,
          });
          if (conversation) {
            const user = await convex.query(api.users.get, {
              userId: conversation.userId,
            });
            if (user) {
              try {
                await bot.api.sendMessage(
                  user.telegramId,
                  `❌ I had trouble reaching the property lister after multiple attempts. ` +
                  `Would you like to select a different listing?`
                );
              } catch (error) {
                console.error(`  ❌ Failed to notify user:`, error);
              }
            }
          }
          return;
        }

        // Time to retry
        console.log(`  🔄 Retrying call (attempt ${retryAttempt + 1}/${backoffIntervals.length + 1})...`);

        const selectedListing = await convex.query(api.listings.getSelected, {
          conversationId: conversationId as any,
        });

        if (selectedListing && selectedListing.contactPhone && callService) {
          const conversation = await convex.query(api.conversations.get, {
            conversationId: conversationId as any,
          });
          if (!conversation) return;

          const user = await convex.query(api.users.get, {
            userId: conversation.userId,
          });
          if (!user) return;

          const requirements = conversation.requirements || {};
          const customerName = requirements.customerName || user.firstName || "a client";
          const customerOrigin = requirements.customerOrigin;
          const moveInDate = requirements.moveInDate;

          try {
            const script = callService.generatePropertyInquiryScript(
              "Mike Lee",
              customerName,
              selectedListing.title,
              selectedListing.location
            );

            const callId = await convex.mutation(api.calls.create, {
              listingId: selectedListing._id,
              conversationId: conversationId as any,
              retryAttempt: retryAttempt + 1,
            });

            const callResult = await callService.makeCall(
              selectedListing.contactPhone,
              script
            );

            await convex.mutation(api.calls.updateStatus, {
              callId,
              status: "in_progress",
              twilioCallSid: callResult.callSid,
            });

            await bot.api.sendMessage(
              user.telegramId,
              `📞 Retrying the call now (attempt ${retryAttempt + 2})...`
            );
          } catch (error: any) {
            console.error(`  ❌ Error retrying call:`, error);

            // Check if it's a permission/configuration error that won't be fixed by retrying
            const isPermissionError = error?.message?.includes("not authorized") ||
              error?.message?.includes("international permissions") ||
              error?.code === 21215;

            if (isPermissionError) {
              // Don't retry permission errors - they need manual intervention
              console.error(`  ⚠️ Permission error detected. Marking call as failed. ` +
                `Please enable international calling in Twilio console.`);
              await convex.mutation(api.calls.updateStatus, {
                callId: latestCall._id,
                status: "failed",
                outcome: "permission_error",
              });

              // Notify user about the issue
              try {
                const conversation = await convex.query(api.conversations.get, {
                  conversationId: conversationId as any,
                });
                if (conversation) {
                  const user = await convex.query(api.users.get, {
                    userId: conversation.userId,
                  });
                  if (user) {
                    await bot.api.sendMessage(
                      user.telegramId,
                      `❌ I encountered a configuration issue making the call. ` +
                      `Please contact support or try selecting a different listing.`
                    );
                  }
                }
              } catch (notifyError) {
                console.error(`  ❌ Failed to notify user:`, notifyError);
              }
              return;
            }

            // Schedule next retry if we haven't exceeded max (for other errors)
            if (retryAttempt + 1 < backoffIntervals.length) {
              const nextRetry = new Date(now + backoffIntervals[retryAttempt + 1]).toISOString();
              await convex.mutation(api.calls.updateStatus, {
                callId: latestCall._id,
                nextRetryTime: nextRetry,
                retryAttempt: retryAttempt + 1,
              });
            }
          }
        }
      } else if (nextRetryTime) {
        // Not time to retry yet
        const timeUntilRetry = Math.round((new Date(nextRetryTime).getTime() - now) / (60 * 60 * 1000));
        console.log(`  ⏳ Next retry scheduled in ${timeUntilRetry} hour(s) (attempt ${retryAttempt + 1}/${backoffIntervals.length + 1})`);
      }
    } else if (callState === "failed") {
      // For failed calls, use the same progressive backoff as missed calls
      console.log(`  ❌ Call failed. Checking retry status...`);

      const retryAttempt = latestCall.retryAttempt ?? 0;
      const nextRetryTime = latestCall.nextRetryTime;
      const now = Date.now();

      // Progressive backoff schedule: 1h, 4h, 12h, 24h, 48h
      const backoffIntervals = [
        1 * 60 * 60 * 1000,   // 1 hour
        4 * 60 * 60 * 1000,   // 4 hours
        12 * 60 * 60 * 1000,  // 12 hours
        24 * 60 * 60 * 1000,  // 24 hours
        48 * 60 * 60 * 1000,  // 48 hours
      ];

      // If this is the first time we're handling this failed call, schedule the first retry
      if (!nextRetryTime && retryAttempt < backoffIntervals.length) {
        const nextRetry = new Date(now + backoffIntervals[retryAttempt]).toISOString();
        await convex.mutation(api.calls.updateStatus, {
          callId: latestCall._id,
          nextRetryTime: nextRetry,
        });
        console.log(`  ⏰ Scheduled retry ${retryAttempt + 1} at ${nextRetry}`);

        // Notify user
        const conversation = await convex.query(api.conversations.get, {
          conversationId: conversationId as any,
        });
        if (conversation) {
          const user = await convex.query(api.users.get, {
            userId: conversation.userId,
          });
          if (user) {
            try {
              await bot.api.sendMessage(
                user.telegramId,
                `I didn't reach the property right now. I will try again later today.`
              );
            } catch (error) {
              console.error(`  ❌ Failed to notify user:`, error);
            }
          }
        }
        return;
      }

      // Check if it's time to retry
      if (nextRetryTime && new Date(nextRetryTime).getTime() <= now) {
        if (retryAttempt >= backoffIntervals.length) {
          // Max retries exceeded, mark as failed and move back to selecting
          console.log(`  ❌ Maximum retry attempts (${backoffIntervals.length}) exceeded. Marking as failed.`);
          await convex.mutation(api.conversations.updateStatus, {
            conversationId: conversationId as any,
            status: "selecting",
          });

          // Notify user
          const conversation = await convex.query(api.conversations.get, {
            conversationId: conversationId as any,
          });
          if (conversation) {
            const user = await convex.query(api.users.get, {
              userId: conversation.userId,
            });
            if (user) {
              try {
                await bot.api.sendMessage(
                  user.telegramId,
                  `❌ I had trouble reaching the property lister after multiple attempts. ` +
                  `Would you like to select a different listing?`
                );
              } catch (error) {
                console.error(`  ❌ Failed to notify user:`, error);
              }
            }
          }
          return;
        }

        // Time to retry
        console.log(`  🔄 Retrying call (attempt ${retryAttempt + 1}/${backoffIntervals.length + 1})...`);

        const selectedListing = await convex.query(api.listings.getSelected, {
          conversationId: conversationId as any,
        });

        if (selectedListing && selectedListing.contactPhone && callService) {
          const conversation = await convex.query(api.conversations.get, {
            conversationId: conversationId as any,
          });
          if (!conversation) return;

          const user = await convex.query(api.users.get, {
            userId: conversation.userId,
          });
          if (!user) return;

          const requirements = conversation.requirements || {};
          const customerName = requirements.customerName || user.firstName || "a client";
          const customerOrigin = requirements.customerOrigin;
          const moveInDate = requirements.moveInDate;

          try {
            const script = callService.generatePropertyInquiryScript(
              "Mike Lee",
              customerName,
              selectedListing.title,
              selectedListing.location
            );

            const callId = await convex.mutation(api.calls.create, {
              listingId: selectedListing._id,
              conversationId: conversationId as any,
              retryAttempt: retryAttempt + 1,
            });

            const callResult = await callService.makeCall(
              selectedListing.contactPhone,
              script
            );

            await convex.mutation(api.calls.updateStatus, {
              callId,
              status: "in_progress",
              twilioCallSid: callResult.callSid,
            });

            await bot.api.sendMessage(
              user.telegramId,
              `📞 Retrying the call now (attempt ${retryAttempt + 2})...`
            );
          } catch (error: any) {
            console.error(`  ❌ Error retrying call:`, error);

            // Check if it's a permission/configuration error that won't be fixed by retrying
            const isPermissionError = error?.message?.includes("not authorized") ||
              error?.message?.includes("international permissions") ||
              error?.code === 21215;

            if (isPermissionError) {
              // Don't retry permission errors - they need manual intervention
              console.error(`  ⚠️ Permission error detected. Marking call as failed. ` +
                `Please enable international calling in Twilio console.`);
              await convex.mutation(api.calls.updateStatus, {
                callId: latestCall._id,
                status: "failed",
                outcome: "permission_error",
              });

              // Notify user about the issue
              try {
                const conversation = await convex.query(api.conversations.get, {
                  conversationId: conversationId as any,
                });
                if (conversation) {
                  const user = await convex.query(api.users.get, {
                    userId: conversation.userId,
                  });
                  if (user) {
                    await bot.api.sendMessage(
                      user.telegramId,
                      `❌ I encountered a configuration issue making the call. ` +
                      `Please contact support or try selecting a different listing.`
                    );
                  }
                }
              } catch (notifyError) {
                console.error(`  ❌ Failed to notify user:`, notifyError);
              }
              return;
            }

            // Schedule next retry if we haven't exceeded max (for other errors)
            if (retryAttempt + 1 < backoffIntervals.length) {
              const nextRetry = new Date(now + backoffIntervals[retryAttempt + 1]).toISOString();
              await convex.mutation(api.calls.updateStatus, {
                callId: latestCall._id,
                nextRetryTime: nextRetry,
                retryAttempt: retryAttempt + 1,
              });
            }
          }
        }
      } else if (nextRetryTime) {
        // Not time to retry yet
        const timeUntilRetry = Math.round((new Date(nextRetryTime).getTime() - now) / (60 * 60 * 1000));
        console.log(`  ⏳ Next retry scheduled in ${timeUntilRetry} hour(s) (attempt ${retryAttempt + 1}/${backoffIntervals.length + 1})`);
      } else {
        // No retry scheduled and max attempts reached - mark as failed
        console.log(`  ❌ Call failed with no retry scheduled. Moving back to selecting...`);
        await convex.mutation(api.conversations.updateStatus, {
          conversationId: conversationId as any,
          status: "selecting",
        });

        // Notify user
        const conversation = await convex.query(api.conversations.get, {
          conversationId: conversationId as any,
        });
        if (conversation) {
          const user = await convex.query(api.users.get, {
            userId: conversation.userId,
          });
          if (user) {
            try {
              await bot.api.sendMessage(
                user.telegramId,
                `❌ I had trouble reaching the property lister. ` +
                `Would you like to select a different listing?`
              );
            } catch (error) {
              console.error(`  ❌ Failed to notify user:`, error);
            }
          }
        }
      }
    } else {
      console.log(`  ⏳ Call still in progress or unknown state: ${finalStatus}`);
    }
  } catch (error) {
    console.error(`  ❌ Error handling contacting state:`, error);
  }
}

// Helper function to extract availability from call transcript
async function extractAvailabilityFromTranscript(
  openai: OpenAI,
  transcript: string
): Promise<{ availableDates?: string[]; availableTimes?: string[]; availabilityText?: string } | null> {
  try {
    console.log(`  📅 Extracting availability from transcript...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are extracting availability information from a phone call transcript. 
Extract specific dates, times, and availability windows mentioned by the property owner.
Return a JSON object with:
- availableDates: array of specific dates mentioned (e.g., ["2024-01-15", "2024-01-16"])
- availableTimes: array of time windows mentioned (e.g., ["morning", "afternoon", "2pm-4pm"])
- availabilityText: a natural language summary of when they're available

If no specific availability is mentioned, return null.`
        },
        {
          role: "user",
          content: `Extract availability information from this call transcript:\n\n${transcript}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    const availability = JSON.parse(content);

    // Validate and clean up the response
    if (availability.availableDates || availability.availableTimes || availability.availabilityText) {
      console.log(`  ✅ Extracted availability:`, availability);
      return availability;
    }

    return null;
  } catch (error: any) {
    console.error(`  ❌ Error extracting availability:`, error);
    return null;
  }
}

async function handleSchedulingState(
  convex: ConvexHttpClient,
  conversationId: string,
  bot: ReturnType<typeof createBot>,
  calendlyService?: CalendlyService,
  openai?: OpenAI
) {
  try {
    console.log(`  📅 Handling scheduling state for conversation ${conversationId}...`);
    console.log(`  📅 Calendly service available: ${!!calendlyService}`);

    // Get conversation and user
    const conversation = await convex.query(api.conversations.get, {
      conversationId: conversationId as any,
    });
    if (!conversation) {
      console.log(`  ⚠️ Conversation not found`);
      return;
    }

    const user = await convex.query(api.users.get, {
      userId: conversation.userId,
    });
    if (!user) {
      console.log(`  ⚠️ User not found`);
      return;
    }

    // Get selected listing
    const selectedListing = await convex.query(api.listings.getSelected, {
      conversationId: conversationId as any,
    });
    if (!selectedListing) {
      console.log(`  ⚠️ No selected listing found`);
      await bot.api.sendMessage(
        user.telegramId,
        `⚠️ No property selected. Please select a property first.`
      );
      return;
    }

    console.log(`  📅 Selected listing: ${selectedListing.title}`);

    // Get requirements for client name
    const requirements = conversation.requirements || {};
    const clientName = requirements.customerName || user.firstName || "Client";
    console.log(`  📅 Client name: ${clientName}`);

    // Get call transcript to extract availability
    let availability: { availableDates?: string[]; availableTimes?: string[]; availabilityText?: string } | null = null;
    const latestCall = await convex.query(api.calls.getLatestByConversation, {
      conversationId: conversationId as any,
    });

    if (latestCall?.transcript && openai) {
      availability = await extractAvailabilityFromTranscript(openai, latestCall.transcript);
      if (availability) {
        console.log(`  📅 Owner availability:`, availability.availabilityText || JSON.stringify(availability));
      }
    }

    // Create Calendly link if service is available
    if (calendlyService) {
      try {
        console.log(`  📅 Creating Calendly scheduling link...`);
        const schedulingLink = await calendlyService.createPropertyViewingLink(
          selectedListing.title,
          clientName,
          undefined, // No email available
          availability // Pass availability to limit options
        );

        console.log(`  📅 Calendly link created: ${schedulingLink}`);

        // Check if appointment already exists
        const existingAppointments = await convex.query(api.appointments.getByConversation, {
          conversationId: conversationId as any,
        });
        let appointment = existingAppointments.find((a) => a.status === "scheduled" || a.status === "confirmed");

        if (!appointment) {
          // Create appointment record
          const appointmentId = await convex.mutation(api.appointments.create, {
            conversationId: conversationId as any,
            listingId: selectedListing._id,
            scheduledAt: new Date().toISOString(), // Placeholder, actual time will be set by user
            calendlyEventUri: schedulingLink,
            notes: `Scheduling link created for ${selectedListing.title}`,
          });
          // Fetch the created appointment
          const appointments = await convex.query(api.appointments.getByConversation, {
            conversationId: conversationId as any,
          });
          appointment = appointments.find((a) => a._id === appointmentId);
          console.log(`  📅 Appointment record created`);
        } else {
          console.log(`  📅 Appointment record already exists`);
        }

        // Include availability information in the message if available
        let availabilityMessage = "";
        if (availability?.availabilityText) {
          availabilityMessage = `\n\n📅 Owner mentioned they're available: ${availability.availabilityText}`;
        }

        // Check if user has already scheduled (in case they scheduled quickly)
        const alreadyScheduled = await checkForScheduledAppointment(
          convex,
          conversationId,
          appointment,
          calendlyService,
          bot
        );

        if (!alreadyScheduled) {
          // Send link to user with confirmation button
          const message = `✅ Great news! I successfully contacted the property lister.\n\n` +
            `They're interested and we can now schedule a viewing.${availabilityMessage}\n\n` +
            `📅 Please click the link below to schedule your viewing:\n` +
            `${schedulingLink}\n\n` +
            `I'll automatically detect when you've scheduled, or you can click the button below once you're done.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've scheduled my appointment",
            "confirm_appointment"
          );

          console.log(`  📅 Sending message to user ${user.telegramId}...`);
          await bot.api.sendMessage(user.telegramId, message, {
            reply_markup: keyboard,
          });
          console.log(`  ✅ Scheduling link sent to user`);
        }
      } catch (calendlyError: any) {
        console.error(`  ❌ Error creating Calendly link:`, calendlyError);
        console.error(`  ❌ Error details:`, calendlyError?.message || calendlyError);
        const fallbackMessage = `✅ Great news! I successfully contacted the property lister.\n\n` +
          `They're interested and we can now schedule a viewing.\n\n` +
          `Please coordinate with the landlord to schedule a viewing time.\n\n` +
          `Once you've scheduled your appointment, click the button below.`;

        const keyboard = new InlineKeyboard().text(
          "✅ I've scheduled my appointment",
          "confirm_appointment"
        );

        await bot.api.sendMessage(user.telegramId, fallbackMessage, {
          reply_markup: keyboard,
        });
      }
    } else {
      // No Calendly service, just notify user
      console.log(`  ⚠️ Calendly service not available, sending fallback message`);
      const fallbackMessage = `✅ Great news! I successfully contacted the property lister.\n\n` +
        `They're interested and we can now schedule a viewing.\n\n` +
        `⚠️ Calendly scheduling is not configured. Please coordinate with the landlord to schedule a viewing time.\n\n` +
        `Once you've scheduled your appointment, click the button below.`;

      const keyboard = new InlineKeyboard().text(
        "✅ I've scheduled my appointment",
        "confirm_appointment"
      );

      await bot.api.sendMessage(user.telegramId, fallbackMessage, {
        reply_markup: keyboard,
      });
    }
  } catch (error: any) {
    console.error(`  ❌ Error handling scheduling state:`, error);
    console.error(`  ❌ Error details:`, error?.message || error);
    console.error(`  ❌ Stack trace:`, error?.stack);
  }
}

async function handleContractingState(
  convex: ConvexHttpClient,
  conversationId: any,
  bot: ReturnType<typeof createBot>,
  docusignService?: DocuSignService
) {
  try {
    console.log(`  📝 Handling contracting state for conversation ${conversationId}...`);

    // Get conversation and user
    const conversation = await convex.query(api.conversations.get, {
      conversationId: conversationId as any,
    });
    if (!conversation) {
      console.log(`  ⚠️ Conversation not found`);
      return;
    }

    const user = await convex.query(api.users.get, {
      userId: conversation.userId,
    });
    if (!user) {
      console.log(`  ⚠️ User not found`);
      return;
    }

    // Get selected listing
    const selectedListing = await convex.query(api.listings.getSelected, {
      conversationId: conversationId as any,
    });
    if (!selectedListing) {
      console.log(`  ⚠️ No selected listing found`);
      return;
    }

    // Check if contract already exists
    const existingContracts = await convex.query(api.contracts.getByConversation, {
      conversationId: conversationId as any,
    });

    let contract = existingContracts.find((c) => c.status === "signed" || c.status === "completed");

    if (contract && contract.status === "signed") {
      // Contract already signed, move to payment
      console.log(`  ✅ Contract already signed. Moving to payment...`);
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversationId as any,
        status: "payment",
      });
      return;
    }

    // Check for pending contract
    contract = existingContracts.find((c) => c.status === "draft" || c.status === "sent");

    if (!contract) {
      // Check if we have tenant information from passport
      const requirements = conversation.requirements || {};
      const hasTenantInfo = requirements.passportData;

      if (!hasTenantInfo) {
        // Ask user for passport details via text
        console.log(`  📝 Requesting passport details from user...`);

        const message = `📝 Great! I'll now prepare the rental contract for you.\n\n` +
          `Please provide the following information:\n\n` +
          `Please reply with your details in this format:\n` +
          `Full Name: [Your full legal name]\n` +
          `Passport Number: [Your passport number]\n` +
          `Date of Birth: [DD/MM/YYYY]\n` +
          `Nationality: [Your nationality]\n\n` +
          `Example:\n` +
          `Full Name: John Smith\n` +
          `Passport Number: AB1234567\n` +
          `Date of Birth: 15/03/1990\n` +
          `Nationality: American`;

        await bot.api.sendMessage(user.telegramId, message);

        console.log(`  ✅ Requested passport details from user`);
        return;
      }

      // Create new contract with collected information
      console.log(`  📝 Creating new rental contract with passport data...`);

      // Use passport data
      const passportData = requirements.passportData;
      if (!passportData) {
        await bot.api.sendMessage(user.telegramId, `❌ Missing passport data. Please upload your passport first.`);
        return;
      }
      const tenantName = passportData.fullName;
      const tenantEmail = user.username ? `${user.username}@telegram.user` : "tenant@example.com";

      // Mock lease terms (would come from landlord)
      const startDate = "January 1, 2025";
      const endDate = "December 31, 2025";
      const depositAmount = selectedListing.price; // 1 month deposit

      // Mock landlord info (would come from landlord)
      const contractDetails = {
        propertyAddress: selectedListing.title,
        monthlyRent: selectedListing.price,
        currency: selectedListing.currency,
        startDate,
        endDate,
        depositAmount,
        tenantName,
        tenantEmail,
        landlordName: "Property Management Co.",
        landlordEmail: "landlord@property-management.com",
      };

      console.log(`  📋 Contract details:`, {
        tenant: tenantName,
        passport: passportData.passportNumber,
        property: selectedListing.title,
        rent: `${selectedListing.currency} ${selectedListing.price}`
      });

      if (docusignService) {
        try {
          const envelope = await docusignService.createContractAndGetSigningUrl(
            contractDetails,
            user.telegramId.toString()
          );

          const contractId = await convex.mutation(api.contracts.create, {
            conversationId: conversationId as any,
            listingId: selectedListing._id,
            docusignEnvelopeId: envelope.envelopeId,
            documentUrl: envelope.signingUrl,
          });

          await convex.mutation(api.contracts.updateStatus, {
            contractId,
            status: "sent",
          });

          // Notify user
          const message = `📝 Great news! The viewing went well.\n\n` +
            `I've prepared a rental contract for you to review and sign.\n\n` +
            `Please review and sign the contract here:\n${envelope.signingUrl}\n\n` +
            `Once you've signed the contract, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've signed the contract",
            "confirm_contract"
          );

          await bot.api.sendMessage(user.telegramId, message, {
            reply_markup: keyboard,
          });
          console.log(`  ✅ Contract sent to user`);
        } catch (docusignError: any) {
          console.error(`  ❌ Error creating DocuSign contract:`, docusignError);

          // Fallback: Send manual contract message
          const fallbackMessage = `📝 Great news! The viewing went well.\n\n` +
            `I would prepare a rental contract for you, but DocuSign is not fully configured.\n\n` +
            `Property: ${selectedListing.title}\n` +
            `Monthly Rent: ${selectedListing.currency} ${selectedListing.price}\n` +
            `Deposit: ${selectedListing.currency} ${selectedListing.price}\n\n` +
            `Please coordinate with the landlord to sign the contract.\n\n` +
            `Once you've signed the contract, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've signed the contract",
            "confirm_contract"
          );

          await bot.api.sendMessage(user.telegramId, fallbackMessage, {
            reply_markup: keyboard,
          });
        }
      } else {
        // No DocuSign service, send manual message
        console.log(`  ⚠️ DocuSign service not available`);

        const fallbackMessage = `📝 Great news! The viewing went well.\n\n` +
          `Next step is to sign the rental contract.\n\n` +
          `Property: ${selectedListing.title}\n` +
          `Monthly Rent: ${selectedListing.currency} ${selectedListing.price}\n` +
          `Deposit: ${selectedListing.currency} ${selectedListing.price}\n\n` +
          `Please coordinate with the landlord to sign the contract.\n\n` +
          `Once you've signed the contract, click the button below.`;

        const keyboard = new InlineKeyboard().text(
          "✅ I've signed the contract",
          "confirm_contract"
        );

        await bot.api.sendMessage(user.telegramId, fallbackMessage, {
          reply_markup: keyboard,
        });

        // Create a placeholder contract
        await convex.mutation(api.contracts.create, {
          conversationId: conversationId as any,
          listingId: selectedListing._id,
        });
      }
    } else {
      // Contract exists but not signed yet
      console.log(`  ⏳ Contract ${contract._id} is ${contract.status}. Waiting for signature...`);

      // Check if DocuSign envelope is complete
      if (contract.docusignEnvelopeId && docusignService) {
        try {
          const status = await docusignService.getEnvelopeStatus(contract.docusignEnvelopeId);

          if (status === "completed") {
            console.log(`  ✅ Contract signed! Moving to payment...`);

            await convex.mutation(api.contracts.updateStatus, {
              contractId: contract._id,
              status: "signed",
            });

            await convex.mutation(api.conversations.updateStatus, {
              conversationId: conversationId as any,
              status: "payment",
            });

            await bot.api.sendMessage(
              user.telegramId,
              `✅ Contract signed successfully! Now let's handle the payment.`
            );
          }
        } catch (error) {
          console.error(`  ❌ Error checking envelope status:`, error);
        }
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error handling contracting state:`, error);
    console.error(`  ❌ Error details:`, error?.message || error);
  }
}

async function handlePaymentState(
  convex: ConvexHttpClient,
  conversationId: string,
  bot: ReturnType<typeof createBot>,
  paymentService?: PaymentService
) {
  try {
    console.log(`  💳 Handling payment state for conversation ${conversationId}...`);

    // Get conversation and user
    const conversation = await convex.query(api.conversations.get, {
      conversationId: conversationId as any,
    });
    if (!conversation) {
      console.log(`  ⚠️ Conversation not found`);
      return;
    }

    const user = await convex.query(api.users.get, {
      userId: conversation.userId,
    });
    if (!user) {
      console.log(`  ⚠️ User not found`);
      return;
    }

    // Get selected listing
    const selectedListing = await convex.query(api.listings.getSelected, {
      conversationId: conversationId as any,
    });
    if (!selectedListing) {
      console.log(`  ⚠️ No selected listing found`);
      return;
    }

    // Check if payment already exists
    const existingPayments = await convex.query(api.payments.getByConversation, {
      conversationId: conversationId as any,
    });

    let payment = existingPayments.find((p) => p.status === "paid");

    if (payment) {
      // Payment already completed, move to completed
      console.log(`  ✅ Payment already completed. Moving to completed...`);
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversationId as any,
        status: "completed",
      });

      await bot.api.sendMessage(
        user.telegramId,
        `🎉 Congratulations! Your rental process is complete.\n\n` +
        `Property: ${selectedListing.title}\n` +
        `You're all set to move in. Enjoy your new home! 🏠`
      );
      return;
    }

    // Check for pending payment
    payment = existingPayments.find((p) => p.status === "pending");

    if (!payment) {
      // Create new payment invoice
      console.log(`  💳 Creating Stripe invoice...`);

      const requirements = conversation.requirements || {};
      const tenantName = requirements.customerName || user.firstName || "Tenant";
      const tenantEmail = user.username ? `${user.username}@telegram.user` : "tenant@example.com";

      const monthlyRent = selectedListing.price;
      const deposit = selectedListing.price; // 1 month deposit
      const currency = selectedListing.currency;

      if (paymentService) {
        try {
          const invoice = await paymentService.createRentalPaymentInvoice(
            tenantEmail,
            tenantName,
            selectedListing.title,
            monthlyRent,
            deposit,
            currency
          );

          // Get or create contract to link payment
          const contracts = await convex.query(api.contracts.getByConversation, {
            conversationId: conversationId as any,
          });
          const contract = contracts.find((c) => c.status === "signed");

          const paymentId = await convex.mutation(api.payments.create, {
            conversationId: conversationId as any,
            contractId: contract?._id,
            amount: invoice.amountDue,
            currency: invoice.currency,
            stripeInvoiceId: invoice.invoiceId,
            paymentUrl: invoice.hostedInvoiceUrl,
          });

          // Don't send invoice via email - just give user the link directly
          console.log(`  ✅ Payment invoice created: ${invoice.invoiceId}`);

          // Notify user
          const totalAmount = (monthlyRent + deposit).toFixed(2);
          const message = `💳 Time to secure your new home!\n\n` +
            `I've created a payment invoice for:\n` +
            `• First month rent: ${currency} ${monthlyRent}\n` +
            `• Security deposit: ${currency} ${deposit}\n` +
            `• Total: ${currency} ${totalAmount}\n\n` +
            `Please pay using this secure link:\n${invoice.hostedInvoiceUrl}\n\n` +
            `Once payment is complete, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've completed the payment",
            "confirm_payment"
          );

          await bot.api.sendMessage(user.telegramId, message, {
            reply_markup: keyboard,
          });
          console.log(`  ✅ Payment invoice sent to user`);
        } catch (stripeError: any) {
          console.error(`  ❌ Error creating Stripe invoice:`, stripeError);

          // Fallback: Send manual payment message
          const totalAmount = (monthlyRent + deposit).toFixed(2);
          const fallbackMessage = `💳 Time to secure your new home!\n\n` +
            `Payment required:\n` +
            `• First month rent: ${currency} ${monthlyRent}\n` +
            `• Security deposit: ${currency} ${deposit}\n` +
            `• Total: ${currency} ${totalAmount}\n\n` +
            `Stripe is not fully configured. Please coordinate payment with the landlord directly.\n\n` +
            `Once payment is complete, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've completed the payment",
            "confirm_payment"
          );

          await bot.api.sendMessage(user.telegramId, fallbackMessage, {
            reply_markup: keyboard,
          });
        }
      } else {
        // No payment service, send manual message
        console.log(`  ⚠️ Payment service not available`);

        const totalAmount = (monthlyRent + deposit).toFixed(2);
        const fallbackMessage = `💳 Time to secure your new home!\n\n` +
          `Payment required:\n` +
          `• First month rent: ${currency} ${monthlyRent}\n` +
          `• Security deposit: ${currency} ${deposit}\n` +
          `• Total: ${currency} ${totalAmount}\n\n` +
          `Please arrange payment with the landlord directly.\n\n` +
          `Once payment is complete, click the button below.`;

        const keyboard = new InlineKeyboard().text(
          "✅ I've completed the payment",
          "confirm_payment"
        );

        await bot.api.sendMessage(user.telegramId, fallbackMessage, {
          reply_markup: keyboard,
        });

        // Create a placeholder payment
        await convex.mutation(api.payments.create, {
          conversationId: conversationId as any,
          amount: (monthlyRent + deposit) * 100,
          currency,
        });
      }
    } else {
      // Payment exists but not completed yet
      console.log(`  ⏳ Payment ${payment._id} is ${payment.status}. Checking status...`);

      // Check if payment is complete
      if (payment.stripeInvoiceId && paymentService) {
        try {
          const invoiceStatus = await paymentService.getInvoiceStatus(payment.stripeInvoiceId);

          if (invoiceStatus.status === "paid") {
            console.log(`  ✅ Payment completed! Moving to completed...`);

            await convex.mutation(api.payments.updateStatus, {
              paymentId: payment._id,
              status: "paid",
            });

            await convex.mutation(api.conversations.updateStatus, {
              conversationId: conversationId as any,
              status: "completed",
            });

            await bot.api.sendMessage(
              user.telegramId,
              `🎉 Payment received! Congratulations!\n\n` +
              `Your rental process is now complete.\n` +
              `Property: ${selectedListing.title}\n\n` +
              `You're all set to move in. Enjoy your new home! 🏠`
            );
          } else if (invoiceStatus.status === "void" || invoiceStatus.status === "uncollectible") {
            console.log(`  ❌ Payment failed or voided`);

            await convex.mutation(api.payments.updateStatus, {
              paymentId: payment._id,
              status: "failed",
            });

            await bot.api.sendMessage(
              user.telegramId,
              `❌ There was an issue with the payment. Please try again or contact support.`
            );
          }
        } catch (error) {
          console.error(`  ❌ Error checking invoice status:`, error);
        }
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error handling payment state:`, error);
    console.error(`  ❌ Error details:`, error?.message || error);
  }
}

async function scrapeOnStartup(
  scraper: WebsiteScraper,
  convex: ConvexHttpClient
) {
  try {
    console.log("🔍 Scraping property websites for Chiang Mai...");
    const listings = await scraper.scrapePropertySites("Chiang Mai");

    if (listings.length === 0) {
      console.log("⚠️ No listings found during startup scrape");
      return;
    }

    console.log(`✅ Scraped ${listings.length} listings. Storing in database...`);

    // Store listings in a special "global" conversation or cache
    // For now, we'll just log them - they'll be available when users search
    // In the future, we could store them in a cache table or pre-populate

    // Log summary
    const bySite = new Map<string, number>();
    listings.forEach((l) => {
      const domain = new URL(l.url).hostname;
      bySite.set(domain, (bySite.get(domain) || 0) + 1);
    });

    console.log("📊 Scraping summary:");
    bySite.forEach((count, domain) => {
      console.log(`   ${domain}: ${count} listings`);
    });

    console.log("✅ Startup scraping completed");
  } catch (error) {
    console.error("❌ Error during startup scraping:", error);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
