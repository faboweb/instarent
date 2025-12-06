import { Bot, InlineKeyboard, InputFile } from "grammy";
import { ConvexHttpClient } from "convex/browser";
import OpenAI from "openai";
import Exa from "exa-js";
import { api } from "../../convex/_generated/api";
import { chat, Requirements } from "../ai/conversation";
import { searchListings, formatListingMessage } from "../search/exa";
import { VoiceService } from "../voice/elevenlabs";
import { OutboundCallService } from "../voice/twilio";

export function createBot(
  token: string,
  convex: ConvexHttpClient,
  openai: OpenAI,
  exa?: Exa,
  voiceService?: VoiceService,
  callService?: OutboundCallService
) {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    await convex.mutation(api.users.getOrCreate, {
      telegramId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      language: user.language_code,
    });

    await ctx.reply(
      `👋 Hey ${user.first_name}! I'm InstaRent, your AI rental agent.\n\n` +
      `Tell me what kind of place you're looking for and I'll find it for you. ` +
      `Where would you like to rent?`
    );
  });

  bot.command("reset", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    const dbUser = await convex.query(api.users.getByTelegramId, {
      telegramId: user.id,
    });

    if (dbUser) {
      const conversation = await convex.query(api.conversations.getByUser, {
        userId: dbUser._id,
      });

      if (conversation) {
        await convex.mutation(api.conversations.updateStatus, {
          conversationId: conversation._id,
          status: "completed",
        });
      }
    }

    await ctx.reply("🔄 Starting fresh! Tell me about the place you're looking for.");
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
        `✅ Great choice! You selected:\n\n` +
        `*${escapeMarkdown(selectedListing.title)}*\n` +
        `💰 ${selectedListing.currency} ${selectedListing.price}/month\n` +
        `📍 ${escapeMarkdown(selectedListing.location)}\n\n` +
        `I'll now contact the lister on your behalf. Stand by for updates! 📞`,
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

      // Trigger outbound call if service is available and we have a phone number
      if (callService && selectedListing.contactPhone) {
        try {
          const userName = dbUser.firstName || "a client";
          const script = callService.generatePropertyInquiryScript(
            "InstaRent",
            userName,
            selectedListing.title,
            selectedListing.location
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
            `📞 Call initiated to the property lister!\n` +
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
      } else if (callService && !selectedListing.contactPhone) {
        await ctx.reply(
          "📱 No phone number available for this listing. " +
          "I'll look for alternative contact methods."
        );
      }
    } catch (error) {
      console.error("Error selecting listing:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  bot.on("message:text", async (ctx) => {
    const user = ctx.from;
    if (!user) return;

    const userMessage = ctx.message.text;

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

      const response = await chat(
        openai,
        messages.map((m) => ({ role: m.role, content: m.content })),
        currentRequirements
      );

      if (response.extractedRequirements) {
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
        await convex.mutation(api.conversations.updateStatus, {
          conversationId,
          status: "searching",
        });

        await ctx.reply(response.message);
        await ctx.reply("🔍 Great! I have enough info. Let me search for places...");

        if (exa) {
          await ctx.replyWithChatAction("typing");

          const updatedConversation = await convex.query(api.conversations.get, {
            conversationId,
          });

          const requirements = updatedConversation?.requirements || currentRequirements;

          try {
            const listings = await searchListings(exa, requirements);

            if (listings.length === 0) {
              await ctx.reply(
                "😕 I couldn't find any listings matching your criteria. " +
                "Try adjusting your budget or location with /reset"
              );
              return;
            }

            await convex.mutation(api.listings.addMany, {
              conversationId,
              listings: listings.map((l) => ({
                externalId: l.externalId,
                title: l.title,
                price: l.price,
                currency: l.currency,
                location: l.location,
                bedrooms: l.bedrooms,
                url: l.url,
                imageUrl: l.imageUrl,
                description: l.description,
                contactPhone: l.contactPhone,
                contactEmail: l.contactEmail,
              })),
            });

            await convex.mutation(api.conversations.updateStatus, {
              conversationId,
              status: "selecting",
            });

            const listingMessages = listings.map((l, i) => formatListingMessage(l, i));
            const keyboard = new InlineKeyboard();

            listings.forEach((_, i) => {
              keyboard.text(`${i + 1}`, `select_${i}`);
            });

            await ctx.reply(
              `🏠 Found ${listings.length} listings for you:\n\n` +
              listingMessages.join("\n\n") +
              `\n\n👇 *Select a listing by clicking a number:*`,
              {
                parse_mode: "MarkdownV2",
                reply_markup: keyboard,
              }
            );

            if (voiceService) {
              try {
                await ctx.replyWithChatAction("record_voice");
                const voiceBuffer = await voiceService.generateListingSummary(listings);
                await ctx.replyWithVoice(new InputFile(voiceBuffer, "summary.mp3"));
              } catch (voiceError) {
                console.error("Voice generation error:", voiceError);
              }
            }
          } catch (searchError) {
            console.error("Search error:", searchError);
            await ctx.reply(
              "😕 Had trouble searching. Please try again or use /reset to start over."
            );
          }
        } else {
          await ctx.reply(
            "⚠️ Search is not configured yet. Please set up EXA_API_KEY."
          );
        }
      } else {
        await ctx.reply(response.message);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await ctx.reply(
        "Sorry, I ran into an issue. Please try again or use /reset to start over."
      );
    }
  });

  return bot;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
