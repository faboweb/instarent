import { Bot, InlineKeyboard, InputFile } from "grammy";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import Exa from "exa-js";
import { api } from "../../convex/_generated/api";
import { chat, Requirements } from "../ai/conversation";
import { searchListings, formatListingMessage, ListingResult } from "../search/exa";
import { VoiceService } from "../voice/elevenlabs";
import { OutboundCallService } from "../voice/twilio";
import { WebsiteScraper } from "../scraping/websites";
import { BrowserbaseClient } from "../scraping/browserbase";
import { DocuSignService } from "../contracts/docusign";

export function createBot(
  token: string,
  convex: ConvexHttpClient,
  openai: OpenAI,
  exa?: Exa,
  voiceService?: VoiceService,
  callService?: OutboundCallService,
  websiteScraper?: WebsiteScraper,
  browserbaseClient?: BrowserbaseClient,
  docusignService?: DocuSignService
) {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    const userId = await convex.mutation(api.users.getOrCreate, {
      telegramId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      language: user.language_code,
    });

    // Create or get conversation
    const conversationId = await convex.mutation(api.conversations.getOrCreate, {
      userId,
    });

    // Initialize conversation with empty requirements
    await convex.mutation(api.conversations.updateRequirements, {
      conversationId,
      requirements: {},
    });

    // Add initial greeting message
    await convex.mutation(api.messages.add, {
      conversationId,
      role: "assistant",
      content: `👋 Hey ${user.first_name}! I'm InstaRent, your AI rental agent.\n\nI'll help you find your perfect rental property.\n\nFirst, what's your name?`,
    });

    await ctx.reply(
      `👋 Hey ${user.first_name}! I'm InstaRent, your AI rental agent.\n\n` +
      `I'll help you find your perfect rental property.\n\n` +
      `First, what's your name?`
    );
  });

  bot.command("reset", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (dbUser) {
        const conversation = await convex.query(api.conversations.getByUser, {
          userId: dbUser._id,
        });

        if (conversation) {
          console.log(`🔄 Resetting conversation ${conversation._id} (status: ${conversation.status})`);

          // Mark the old conversation as completed/archived
          await convex.mutation(api.conversations.updateStatus, {
            conversationId: conversation._id,
            status: "completed",
          });

          // Create a fresh conversation
          const newConversationId = await convex.mutation(api.conversations.getOrCreate, {
            userId: dbUser._id,
          });

          // Initialize with empty requirements
          await convex.mutation(api.conversations.updateRequirements, {
            conversationId: newConversationId,
            requirements: {},
          });

          console.log(`✅ Created new conversation ${newConversationId}`);
        }
      }

      await ctx.reply(
        `🔄 All reset! Let's start fresh.\n\n` +
        `I'm InstaRent, your AI rental agent. I'll help you find your perfect rental property.\n\n` +
        `What's your name?`
      );
    } catch (error) {
      console.error("❌ Error resetting conversation:", error);
      await ctx.reply("Sorry, something went wrong resetting. Please try again with /start");
    }
  });

  // Handle appointment confirmation
  bot.callbackQuery("confirm_appointment", async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.warn(
        "Failed to answer callback query for confirm_appointment (possibly too old):",
        error
      );
    }

    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (!dbUser) return;

      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (!conversation) return;

      // Move to contracting
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversation._id,
        status: "contracting",
      });

      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      await ctx.reply(
        "✅ Great! I'll now prepare the rental contract for you. Stand by..."
      );
    } catch (error) {
      console.error("Error confirming appointment:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle contract signed confirmation
  bot.callbackQuery("confirm_contract", async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.warn(
        "Failed to answer callback query for confirm_contract (possibly too old):",
        error
      );
    }

    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (!dbUser) return;

      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (!conversation) return;

      // Update contract status to signed
      const contracts = await convex.query(api.contracts.getByConversation, {
        conversationId: conversation._id,
      });

      if (contracts.length > 0) {
        const contract = contracts[contracts.length - 1];
        await convex.mutation(api.contracts.updateStatus, {
          contractId: contract._id,
          status: "signed",
        });
      }

      // Move to payment
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversation._id,
        status: "payment",
      });

      await ctx.editMessageReplyMarkup({ reply_markup: undefined });
      await ctx.reply(
        "✅ Contract confirmed! Now let's handle the payment..."
      );
    } catch (error) {
      console.error("Error confirming contract:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle passport photo upload
  bot.on("message:photo", async (ctx) => {
    console.log("📸 Photo received from user!");

    const user = ctx.from;
    if (!user) {
      console.log("⚠️ No user in photo message");
      return;
    }

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (!dbUser) {
        console.log("⚠️ User not found in database");
        return;
      }

      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (!conversation) {
        console.log("⚠️ No conversation found for user");
        return;
      }

      console.log(`📸 Photo from user in state: ${conversation.status}`);

      // Only process passport photos when in contracting state
      if (conversation.status !== "contracting") {
        console.log(`⏭️ Ignoring photo - not in contracting state (current: ${conversation.status})`);
        return; // Ignore photos in other states
      }

      console.log("✅ Processing passport photo...");
      await ctx.reply("📸 Processing your passport... This may take a moment.");

      // Get the highest resolution photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      console.log("📸 Processing passport photo:", fileUrl);

      // Extract passport information using OpenAI Vision
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are extracting information from a passport photo. 
Extract the following fields and return as JSON:
- fullName: full legal name as shown on passport
- passportNumber: passport/document number
- dateOfBirth: date of birth (format: YYYY-MM-DD)
- nationality: country of citizenship
- expiryDate: passport expiry date (format: YYYY-MM-DD) if visible
- gender: M or F if visible

Be precise and only return information you can clearly read.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: fileUrl,
                  detail: "high"
                }
              },
              {
                type: "text",
                text: "Extract the passport information from this image."
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        await ctx.reply("❌ Sorry, I couldn't read the passport. Please make sure the photo is clear and try again.");
        return;
      }

      const passportData = JSON.parse(content);
      console.log("✅ Extracted passport data:", passportData);

      // Validate we got the essential information
      if (!passportData.fullName || !passportData.passportNumber) {
        await ctx.reply("❌ Sorry, I couldn't read all the required information. Please send a clearer photo of your passport.");
        return;
      }

      // Store passport data in requirements
      await convex.mutation(api.conversations.updateRequirements, {
        conversationId: conversation._id,
        requirements: {
          ...(conversation.requirements || {}),
          passportData,
        } as any,
      });

      // Confirm to user
      await ctx.reply(
        `✅ Passport information extracted!\n\n` +
        `Name: ${passportData.fullName}\n` +
        `Passport #: ${passportData.passportNumber}\n` +
        `Nationality: ${passportData.nationality || "N/A"}\n\n` +
        `Preparing your rental contract now...`
      );

      console.log("✅ Passport data saved, creating contract...");

      // Get selected listing
      const selectedListing = await convex.query(api.listings.getSelected, {
        conversationId: conversation._id,
      });

      if (!selectedListing) {
        await ctx.reply("❌ Error: No property selected. Please contact support.");
        return;
      }

      // Create contract details
      const tenantName = passportData.fullName;
      const tenantEmail = user.username ? `${user.username}@telegram.user` : "tenant@example.com";

      const contractDetails = {
        propertyAddress: selectedListing.title,
        monthlyRent: selectedListing.price,
        currency: selectedListing.currency,
        startDate: "January 1, 2025",
        endDate: "December 31, 2025",
        depositAmount: selectedListing.price,
        tenantName,
        tenantEmail,
        landlordName: "Property Management Co.",
        landlordEmail: "landlord@property-management.com",
      };

      if (docusignService) {
        try {
          // Create DocuSign contract
          const envelope = await docusignService.createContractAndGetSigningUrl(
            contractDetails,
            user.id.toString()
          );

          // Store contract in database
          const contractId = await convex.mutation(api.contracts.create, {
            conversationId: conversation._id,
            listingId: selectedListing._id,
            docusignEnvelopeId: envelope.envelopeId,
            documentUrl: envelope.signingUrl,
          });

          await convex.mutation(api.contracts.updateStatus, {
            contractId,
            status: "sent",
          });

          // Send signing URL to user
          const message = `📄 Your rental contract is ready!\n\n` +
            `Property: ${selectedListing.title}\n` +
            `Monthly Rent: ${selectedListing.currency} ${selectedListing.price}\n` +
            `Lease: January 1, 2025 - December 31, 2025\n\n` +
            `Please review and sign the contract here:\n${envelope.signingUrl}\n\n` +
            `Once you've signed the contract, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've signed the contract",
            "confirm_contract"
          );

          await ctx.reply(message, {
            reply_markup: keyboard,
          });

          console.log("✅ DocuSign contract created and sent to user");
        } catch (docusignError: any) {
          console.error("❌ Error creating DocuSign contract:", docusignError);

          // Fallback message
          const fallbackMessage = `📄 Contract prepared!\n\n` +
            `Property: ${selectedListing.title}\n` +
            `Monthly Rent: ${selectedListing.currency} ${selectedListing.price}\n\n` +
            `DocuSign is not fully configured. Please coordinate with the landlord to sign the contract.\n\n` +
            `Once you've signed the contract, click the button below.`;

          const keyboard = new InlineKeyboard().text(
            "✅ I've signed the contract",
            "confirm_contract"
          );

          await ctx.reply(fallbackMessage, {
            reply_markup: keyboard,
          });
        }
      } else {
        console.log("⚠️ DocuSign service not available");

        const fallbackMessage = `📄 Contract prepared!\n\n` +
          `Property: ${selectedListing.title}\n` +
          `Monthly Rent: ${selectedListing.currency} ${selectedListing.price}\n\n` +
          `Please coordinate with the landlord to sign the contract.\n\n` +
          `Once you've signed the contract, click the button below.`;

        const keyboard = new InlineKeyboard().text(
          "✅ I've signed the contract",
          "confirm_contract"
        );

        await ctx.reply(fallbackMessage, {
          reply_markup: keyboard,
        });
      }

    } catch (error) {
      console.error("Error processing passport photo:", error);
      await ctx.reply("❌ Sorry, there was an error processing your passport. Please try again.");
    }
  });

  // Handle payment confirmation
  bot.callbackQuery("confirm_payment", async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.warn(
        "Failed to answer callback query for confirm_payment (possibly too old):",
        error
      );
    }

    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (!dbUser) return;

      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (!conversation) return;

      // Update payment status to paid
      const payments = await convex.query(api.payments.getByConversation, {
        conversationId: conversation._id,
      });

      if (payments.length > 0) {
        const payment = payments[payments.length - 1];
        await convex.mutation(api.payments.updateStatus, {
          paymentId: payment._id,
          status: "paid",
        });
      }

      // Move to completed
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversation._id,
        status: "completed",
      });

      await ctx.editMessageReplyMarkup({ reply_markup: undefined });

      const selectedListing = await convex.query(api.listings.getSelected, {
        conversationId: conversation._id,
      });

      await ctx.reply(
        `🎉 Congratulations! Your rental process is complete.\n\n` +
        `Property: ${selectedListing?.title || "Your new home"}\n\n` +
        `You're all set to move in. Enjoy your new home! 🏠`
      );
    } catch (error) {
      console.error("Error confirming payment:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle listing selection callbacks
  bot.callbackQuery(/^select_(\d+)$/, async (ctx) => {
    const index = parseInt(ctx.match![1], 10);
    await ctx.answerCallbackQuery();

    const user = ctx.from;
    if (!user) return;

    try {
      const dbUser = await convex.query(api.users.getByTelegramId, {
        telegramId: user.id,
      });

      if (!dbUser) return;

      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (!conversation) return;

      const listings = await convex.query(api.listings.getByConversation, {
        conversationId: conversation._id,
      });

      const selectedListing = listings[index];
      if (!selectedListing) {
        await ctx.reply("❌ Listing not found. Please try again.");
        return;
      }

      // Mark listing as selected
      await convex.mutation(api.listings.select, {
        listingId: selectedListing._id,
      });

      // Update conversation status
      await convex.mutation(api.conversations.updateStatus, {
        conversationId: conversation._id,
        status: "contacting",
      });

      await ctx.editMessageReplyMarkup({ reply_markup: undefined });

      // Send text confirmation
      await ctx.reply(
        `✅ Great choice\\! You selected:\n\n` +
        `*${escapeMarkdown(selectedListing.title)}*\n` +
        `💰 ${selectedListing.currency} ${selectedListing.price}/month\n` +
        `📍 ${escapeMarkdown(selectedListing.location)}\n\n` +
        `I'll now contact the lister on your behalf\\. Stand by for updates\\! 📞`,
        { parse_mode: "MarkdownV2" }
      );

      // Send voice confirmation if available
      if (voiceService) {
        try {
          const voiceBuffer = await voiceService.generateUpdateMessage(
            `Great choice! You selected ${selectedListing.title}. ` +
            `I'll now contact the property lister on your behalf to express your interest. ` +
            `I'll update you as soon as I hear back from them.`
          );
          await ctx.replyWithVoice(new InputFile(voiceBuffer, "update.mp3"));
        } catch (voiceError) {
          console.error("Voice generation error:", voiceError);
        }
      }

      // Handle contacting based on contact method
      const contactMethod = selectedListing.contactMethod || "form";

      // Get conversation requirements for customer info
      const conversationData = await convex.query(api.conversations.get, {
        conversationId: conversation._id,
      });
      const requirements = conversationData?.requirements || {};
      const customerName = requirements.customerName || dbUser.firstName || "a client";
      const customerOrigin = requirements.customerOrigin;
      const moveInDate = requirements.moveInDate;

      if (contactMethod === "form") {
        // Use browserbase to fill out contact form as Mike Lee
        if (browserbaseClient) {
          try {
            await ctx.reply("📝 Filling out contact form as Mike Lee...");

            // Navigate to the listing page
            await browserbaseClient.navigate(selectedListing.url);

            // Wait a bit for page to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Fill out the contact form
            const originInfo = customerOrigin ? ` who is from ${customerOrigin}` : "";
            const inquiryMessage = `Hello, I'm Mike Lee, a property agent. ` +
              `I'm reaching out regarding your property listing: ${selectedListing.title} in ${selectedListing.location}. ` +
              `I have a client${originInfo} named ${customerName} who is very interested in this property and would like to schedule a viewing. ` +
              `Could you please let us know your available times? Thank you!`;

            // Try to find and fill the contact form
            await browserbaseClient.act(
              `Fill out the contact form with the following information:
              - Name: Mike Lee
              - Role: Property Agent
              - Message: ${inquiryMessage}
              
              Look for fields like "Name", "Email", "Phone", "Message" or "Inquiry" and fill them appropriately.
              If there's a phone field, use a professional number format.
              If there's an email field, use a professional email like mike.lee@instarent.com
              Then submit the form.`
            );

            await ctx.reply(
              `✅ Contact form submitted as Mike Lee!\n\n` +
              `I've expressed interest in the property on your behalf. ` +
              `I'll update you when I hear back from the lister.`
            );
          } catch (formError) {
            console.error("Form submission error:", formError);
            await ctx.reply(
              "📝 I had trouble submitting the contact form. " +
              "I'll try again later or use an alternative contact method."
            );
          } finally {
            // Close browserbase session
            try {
              await browserbaseClient.close();
            } catch (closeError) {
              console.error("Error closing browserbase:", closeError);
            }
          }
        } else {
          await ctx.reply(
            "📝 Browserbase is not configured. Cannot fill out contact form. " +
            "Please configure SMITHERY_BROWSERBASE_URL to enable form submissions."
          );
        }
      } else if (contactMethod === "phone") {
        // Make a phone call
        if (callService && selectedListing.contactPhone) {
          try {
            const script = callService.generatePropertyInquiryScript(
              "Mike Lee",
              customerName,
              customerOrigin,
              selectedListing.title,
              selectedListing.location,
              moveInDate
            );

            // Create call record in Convex
            const callId = await convex.mutation(api.calls.create, {
              listingId: selectedListing._id,
              conversationId: conversation._id,
            });

            // Make the call
            const callResult = await callService.makeCall(
              selectedListing.contactPhone,
              script
            );

            // Update call record with Twilio SID
            await convex.mutation(api.calls.updateStatus, {
              callId,
              status: "in_progress",
              twilioCallSid: callResult.callSid,
            });

            await ctx.reply(
              `📞 Call initiated to the property lister as Mike Lee!\n` +
              `Call ID: \`${callResult.callSid}\`\n\n` +
              `I'll update you when I hear back.`,
              { parse_mode: "Markdown" }
            );
          } catch (callError) {
            console.error("Call error:", callError);
            await ctx.reply(
              "📱 I couldn't reach the lister by phone right now. " +
              "I'll try again later or reach out via email if available."
            );
          }
        } else if (!callService) {
          await ctx.reply(
            "📱 Twilio is not configured. Cannot make phone calls. " +
            "Please configure Twilio credentials to enable phone calls."
          );
        } else if (!selectedListing.contactPhone) {
          await ctx.reply(
            "📱 No phone number available for this listing. " +
            "I'll look for alternative contact methods."
          );
        }
      } else if (contactMethod === "line") {
        // For now, just call as a hack
        if (callService && selectedListing.contactPhone) {
          try {
            const script = callService.generatePropertyInquiryScript(
              "Mike Lee",
              customerName,
              customerOrigin,
              selectedListing.title,
              selectedListing.location,
              moveInDate
            );

            // Create call record in Convex
            const callId = await convex.mutation(api.calls.create, {
              listingId: selectedListing._id,
              conversationId: conversation._id,
            });

            // Make the call
            const callResult = await callService.makeCall(
              selectedListing.contactPhone,
              script
            );

            // Update call record with Twilio SID
            await convex.mutation(api.calls.updateStatus, {
              callId,
              status: "in_progress",
              twilioCallSid: callResult.callSid,
            });

            await ctx.reply(
              `📞 Call initiated to the property lister as Mike Lee (LINE contact method - using phone as fallback)!\n` +
              `Call ID: \`${callResult.callSid}\`\n\n` +
              `I'll update you when I hear back.`,
              { parse_mode: "Markdown" }
            );
          } catch (callError) {
            console.error("Call error:", callError);
            await ctx.reply(
              "📱 I couldn't reach the lister by phone right now. " +
              "I'll try again later or reach out via email if available."
            );
          }
        } else {
          await ctx.reply(
            "💬 LINE contact method detected, but phone fallback is not available. " +
            "LINE voice message feature will be implemented in the future."
          );
        }
      } else {
        // Unknown contact method, try phone if available
        if (callService && selectedListing.contactPhone) {
          try {
            const script = callService.generatePropertyInquiryScript(
              "Mike Lee",
              customerName,
              customerOrigin,
              selectedListing.title,
              selectedListing.location,
              moveInDate
            );

            const callId = await convex.mutation(api.calls.create, {
              listingId: selectedListing._id,
              conversationId: conversation._id,
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

            await ctx.reply(
              `📞 Call initiated to the property lister as Mike Lee!\n` +
              `Call ID: \`${callResult.callSid}\`\n\n` +
              `I'll update you when I hear back.`,
              { parse_mode: "Markdown" }
            );
          } catch (callError) {
            console.error("Call error:", callError);
            await ctx.reply(
              "📱 I couldn't reach the lister right now. " +
              "I'll try again later."
            );
          }
        } else {
          await ctx.reply(
            "❓ Unknown contact method. Please check the listing details."
          );
        }
      }
    } catch (error) {
      console.error("Error selecting listing:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  bot.on("message:text", async (ctx) => {
    console.log("📝 Text message handler triggered");
    const user = ctx.from;
    if (!user) {
      console.log("⚠️ No user in text message");
      return;
    }

    const userMessage = ctx.message.text;
    console.log(`📝 Message from ${user.first_name}: "${userMessage.substring(0, 50)}..."`);

    try {
      await ctx.replyWithChatAction("typing");

      const userId = await convex.mutation(api.users.getOrCreate, {
        telegramId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        language: user.language_code,
      });

      const conversationId = await convex.mutation(api.conversations.getOrCreate, {
        userId,
      });

      await convex.mutation(api.messages.add, {
        conversationId,
        role: "user",
        content: userMessage,
      });

      const messages = await convex.query(api.messages.getByConversation, {
        conversationId,
      });

      const conversation = await convex.query(api.conversations.get, {
        conversationId,
      });

      const currentRequirements: Requirements = conversation?.requirements || {};
      console.log("💬 Processing message from user:", {
        conversationId,
        currentStatus: conversation?.status,
        currentRequirements,
      });

      // Check if user is in contracting state and sending passport details
      if (conversation?.status === "contracting" && !(currentRequirements as any).passportData) {
        console.log("📝 User in contracting state, parsing passport details with AI...");

        try {
          // Use OpenAI to extract passport information from the message
          const extractionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are extracting passport/identity information from a user message for a rental contract.
Extract the following fields and return as JSON:
- fullName: full legal name
- passportNumber: passport or ID number
- dateOfBirth: date of birth (convert to DD/MM/YYYY format if needed)
- nationality: nationality/country

The user might provide information in any format. Be flexible in parsing.

Return ONLY valid JSON. If any required field (fullName, passportNumber, dateOfBirth) is missing, set "error" to true.`
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            response_format: { type: "json_object" },
          });

          const extractedData = JSON.parse(extractionResponse.choices[0].message.content || "{}");

          console.log("🤖 AI extracted passport data:", extractedData);

          if (extractedData.error || !extractedData.fullName || !extractedData.passportNumber || !extractedData.dateOfBirth) {
            await ctx.reply(
              `⚠️ I couldn't extract all the required information from your message.\n\n` +
              `Please provide:\n` +
              `• Your full name\n` +
              `• Passport number\n` +
              `• Date of birth\n` +
              `• Nationality (optional)\n\n` +
              `You can send it in any format, for example:\n` +
              `John Smith\n1234567\n15/03/1990\nAmerican`
            );
            return;
          }

          const passportData = {
            fullName: extractedData.fullName,
            passportNumber: extractedData.passportNumber,
            dateOfBirth: extractedData.dateOfBirth,
            nationality: extractedData.nationality,
          };

          console.log("✅ Extracted passport data:", passportData);

          // Save passport data to requirements
          await convex.mutation(api.conversations.updateRequirements, {
            conversationId,
            requirements: {
              ...currentRequirements,
              passportData,
            } as any,
          });

          await ctx.reply(
            `✅ Thank you! I've received your information:\n\n` +
            `Name: ${passportData.fullName}\n` +
            `Passport #: ${passportData.passportNumber}\n` +
            `Date of Birth: ${passportData.dateOfBirth}\n` +
            `${passportData.nationality ? `Nationality: ${passportData.nationality}\n` : ""}\n` +
            `Preparing your rental contract now...`
          );

          // Trigger contract creation by calling the contracting handler directly
          // The handleContractingState function will now see the passportData and proceed
          console.log("✅ Passport data saved, moving to contract creation...");
          return; // Let the stuck conversation handler pick this up
        } catch (aiError: any) {
          console.error("❌ Error extracting passport data with AI:", aiError);
          await ctx.reply(
            `⚠️ I had trouble processing your information. Please try again with:\n\n` +
            `Your full name\n` +
            `Passport number\n` +
            `Date of birth\n` +
            `Nationality`
          );
          return;
        }
      }

      const response = await chat(
        openai,
        messages.map((m) => ({ role: m.role, content: m.content })),
        currentRequirements
      );

      if (response.extractedRequirements) {
        console.log("📝 Updating requirements:", response.extractedRequirements);
        await convex.mutation(api.conversations.updateRequirements, {
          conversationId,
          requirements: response.extractedRequirements,
        });
      }

      await convex.mutation(api.messages.add, {
        conversationId,
        role: "assistant",
        content: response.message,
      });

      if (response.readyToSearch) {
        console.log("🚀 Ready to search! Updating status from 'gathering_requirements' to 'searching'");
        await convex.mutation(api.conversations.updateStatus, {
          conversationId,
          status: "searching",
        });

        await ctx.reply(response.message);
        await ctx.reply("🔍 Great! I have enough info. Let me search for places...");

        if (exa || websiteScraper) {
          await ctx.replyWithChatAction("typing");

          const updatedConversation = await convex.query(api.conversations.get, {
            conversationId,
          });

          const requirements = updatedConversation?.requirements || currentRequirements;

          try {
            const allListings: ListingResult[] = [];

            // Search with Exa
            if (exa) {
              try {
                const exaListings = await searchListings(exa, requirements);
                allListings.push(...exaListings);
                console.log(`📡 Exa found ${exaListings.length} listings`);
              } catch (exaError) {
                console.error("Exa search error:", exaError);
              }
            }

            // Scrape property websites (for Chiang Mai or Thai locations) - DISABLED
            // const location = requirements.location?.toLowerCase() || "";
            // const isThaiLocation = location.includes("chiang mai") ||
            //   location.includes("bangkok") ||
            //   location.includes("phuket") ||
            //   location.includes("thailand") ||
            //   location.includes("เชียงใหม่");

            // if (websiteScraper && isThaiLocation) {
            //   try {
            //     await ctx.reply("🔍 Also checking property websites...");
            //     const webListings = await websiteScraper.scrapePropertySites(
            //       requirements.location || "Chiang Mai"
            //     );
            //     allListings.push(...webListings);
            //     console.log(`🌐 Property websites found ${webListings.length} listings`);
            //   } catch (webError) {
            //     console.error("Website scrape error:", webError);
            //   }
            // }

            // Deduplicate by URL
            const seen = new Set<string>();
            const listings = allListings.filter((l) => {
              if (seen.has(l.url)) return false;
              seen.add(l.url);
              return true;
            });

            // Filter by budget if specified
            const filteredListings = requirements.maxBudget
              ? listings.filter((l) => l.price <= requirements.maxBudget! * 1.2)
              : listings;

            // Sort by price and take top results
            const finalListings = filteredListings
              .sort((a, b) => a.price - b.price)
              .slice(0, 10);

            if (finalListings.length === 0) {
              await ctx.reply(
                "😕 I couldn't find any listings matching your criteria. " +
                "Try adjusting your budget or location with /reset"
              );
              return;
            }

            await convex.mutation(api.listings.addMany, {
              conversationId,
              listings: finalListings.map((l) => ({
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

            console.log(`✅ Found ${finalListings.length} listings. Updating status to 'selecting'`);
            await convex.mutation(api.conversations.updateStatus, {
              conversationId,
              status: "selecting",
            });

            const listingMessages = finalListings.map((l, i) => formatListingMessage(l, i));
            const keyboard = new InlineKeyboard();

            finalListings.forEach((_, i) => {
              keyboard.text(`${i + 1}`, `select_${i}`);
            });

            await ctx.reply(
              `🏠 Found ${finalListings.length} listings for you:\n\n` +
              listingMessages.join("\n\n") +
              `\n\n👇 *Select a listing by clicking a number:*`,
              {
                parse_mode: "MarkdownV2",
                reply_markup: keyboard,
              }
            );
          } catch (searchError) {
            console.error("Search error:", searchError);
            await ctx.reply(
              "😕 Had trouble searching. Please try again or use /reset to start over."
            );
          }
        } else {
          await ctx.reply(
            "⚠️ Search is not configured yet. Please set up EXA_API_KEY or SMITHERY_BROWSERBASE_URL for website scraping."
          );
        }
      } else {
        console.log("💭 Not ready to search yet. Continuing conversation.");
        await ctx.reply(response.message);
      }
    } catch (error: any) {
      console.error("❌ Error handling text message:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      try {
        await ctx.reply(
          "Sorry, I ran into an issue. Please try again or use /reset to start over."
        );
      } catch (replyError) {
        console.error("❌ Failed to send error message:", replyError);
      }
    }
  });

  return bot;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
