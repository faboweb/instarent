import OpenAI from "openai";

const SYSTEM_PROMPT = `You are InstaRent, a friendly and efficient AI rental agent. Your job is to help users find their perfect rental property.

You are currently gathering requirements from the user. You need to collect:
1. Customer name (first name is fine)
2. Location (city, neighborhood, or area where they want to rent)
3. Number of bedrooms
4. Maximum budget (monthly rent)
5. Move-in date (approximate is fine)
6. Where they are from (city, country, or region) - optional
7. Any special requirements or preferences (pets, parking, balcony, etc.)

Guidelines:
- Be conversational and friendly, not robotic
- Ask one question at a time, don't overwhelm
- FIRST: Ask for the customer's name only
- SECOND: Ask what they're looking for (location, bedrooms, budget)
- If the user provides multiple pieces of info at once, acknowledge them all
- Use the extract_requirements function to capture any requirements mentioned
- When you have location, bedrooms, AND budget at minimum, set ready_to_search to true
- Always respond in the same language the user writes in

Current conversation status: gathering requirements`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "extract_requirements",
      description:
        "Extract rental requirements from the user's message. Call this whenever the user mentions any requirement.",
      parameters: {
        type: "object",
        properties: {
          customerName: {
            type: "string",
            description: "The customer's name (first name is fine)",
          },
          customerOrigin: {
            type: "string",
            description: "Where the customer is from (city, country, or region)",
          },
          location: {
            type: "string",
            description: "City, neighborhood, or area the user wants to rent in",
          },
          bedrooms: {
            type: "number",
            description: "Number of bedrooms (0 for studio)",
          },
          maxBudget: {
            type: "number",
            description: "Maximum monthly rent budget in local currency",
          },
          moveInDate: {
            type: "string",
            description: "When the user wants to move in (e.g., 'January 2024', 'ASAP', 'in 2 months')",
          },
          extras: {
            type: "string",
            description: "Any additional requirements like pets allowed, parking, furnished, etc.",
          },
          ready_to_search: {
            type: "boolean",
            description: "Set to true only when we have at least: location, bedrooms, AND budget",
          },
        },
        required: [],
      },
    },
  },
];

export interface Requirements {
  customerName?: string;
  customerOrigin?: string;
  location?: string;
  bedrooms?: number;
  maxBudget?: number;
  moveInDate?: string;
  extras?: string;
}

export interface ConversationResponse {
  message: string;
  extractedRequirements?: Requirements;
  readyToSearch: boolean;
}

export async function chat(
  openai: OpenAI,
  messages: Array<{ role: string; content: string }>,
  currentRequirements: Requirements
): Promise<ConversationResponse> {
  // Build context about what we already know
  const knownInfo = [];
  if (currentRequirements.customerName) knownInfo.push(`Customer name: ${currentRequirements.customerName}`);
  if (currentRequirements.customerOrigin) knownInfo.push(`Customer origin: ${currentRequirements.customerOrigin}`);
  if (currentRequirements.location) knownInfo.push(`Location: ${currentRequirements.location}`);
  if (currentRequirements.bedrooms !== undefined) knownInfo.push(`Bedrooms: ${currentRequirements.bedrooms}`);
  if (currentRequirements.maxBudget) knownInfo.push(`Budget: ${currentRequirements.maxBudget}`);
  if (currentRequirements.moveInDate) knownInfo.push(`Move-in: ${currentRequirements.moveInDate}`);
  if (currentRequirements.extras) knownInfo.push(`Extras: ${currentRequirements.extras}`);

  const contextPrompt =
    knownInfo.length > 0
      ? `\n\nWhat we know so far:\n${knownInfo.join("\n")}\n\nAsk about what's still missing.`
      : "\n\nWe don't have any information yet. Start by asking ONLY for the customer's name.";

  const systemMessage = SYSTEM_PROMPT + contextPrompt;

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: chatMessages,
    tools,
    tool_choice: "auto",
  });

  const choice = response.choices[0];
  let extractedRequirements: Requirements | undefined;
  let readyToSearch = false;
  let assistantMessage = "";

  // Handle tool calls
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCalls = choice.message.tool_calls;
    console.log(`🔧 AI made ${toolCalls.length} tool call(s)`);

    for (const toolCall of toolCalls) {
      if ("function" in toolCall && toolCall.function.name === "extract_requirements") {
        const args = JSON.parse(toolCall.function.arguments);
        extractedRequirements = {
          customerName: args.customerName,
          customerOrigin: args.customerOrigin,
          location: args.location,
          bedrooms: args.bedrooms,
          maxBudget: args.maxBudget,
          moveInDate: args.moveInDate,
          extras: args.extras,
        };
        readyToSearch = args.ready_to_search === true;

        console.log("📋 Extracted requirements:", {
          customerName: extractedRequirements.customerName,
          customerOrigin: extractedRequirements.customerOrigin,
          location: extractedRequirements.location,
          bedrooms: extractedRequirements.bedrooms,
          maxBudget: extractedRequirements.maxBudget,
          moveInDate: extractedRequirements.moveInDate,
          extras: extractedRequirements.extras,
          aiSetReadyToSearch: readyToSearch,
        });
      }
    }

    // Fallback: Check if we have enough requirements even if AI didn't set ready_to_search
    // Merge current and extracted requirements to check completeness
    const merged = extractedRequirements
      ? { ...currentRequirements, ...extractedRequirements }
      : currentRequirements;

    const hasLocation = !!merged.location;
    const hasBedrooms = merged.bedrooms !== undefined;
    const hasBudget = !!merged.maxBudget;

    if (hasLocation && hasBedrooms && hasBudget) {
      if (!readyToSearch) {
        console.log("✅ Fallback: All required fields present (location, bedrooms, budget). Setting readyToSearch=true");
      }
      readyToSearch = true;
    } else {
      console.log("⏳ Missing requirements:", {
        hasLocation,
        hasBedrooms,
        hasBudget,
      });
    }

    // Get the actual response message after tool calls
    const firstToolCall = toolCalls[0];
    if ("id" in firstToolCall) {
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...chatMessages,
          choice.message,
          {
            role: "tool",
            tool_call_id: firstToolCall.id,
            content: JSON.stringify({ success: true, extracted: extractedRequirements }),
          },
        ],
      });
      assistantMessage = followUp.choices[0].message.content || "";
    }
  } else {
    console.log("💬 AI responded without tool calls");
    assistantMessage = choice.message.content || "";

    // Fallback: Check if current requirements already have everything we need
    const hasLocation = !!currentRequirements.location;
    const hasBedrooms = currentRequirements.bedrooms !== undefined;
    const hasBudget = !!currentRequirements.maxBudget;

    if (hasLocation && hasBedrooms && hasBudget && !readyToSearch) {
      console.log("✅ Fallback: Current requirements already complete. Setting readyToSearch=true");
      readyToSearch = true;
    }
  }

  console.log("🎯 Conversation response:", {
    readyToSearch,
    hasExtractedRequirements: !!extractedRequirements,
  });

  return {
    message: assistantMessage,
    extractedRequirements,
    readyToSearch,
  };
}
