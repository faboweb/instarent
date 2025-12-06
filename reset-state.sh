#!/bin/bash

# Script to reset conversation state for testing payment flow

CONVERSATION_ID="jh7cqb24hd357550xrygcgks017wsz1s"

echo "🔄 Resetting conversation state..."

# Move to contracting state (so you can trigger contract confirmation → payment)
echo "📝 Moving conversation to 'contracting' state..."
npx convex run conversations:updateStatus "{\"conversationId\":\"$CONVERSATION_ID\",\"status\":\"contracting\"}"

echo ""
echo "✅ Done! Your conversation is now in 'contracting' state."
echo ""
echo "Next steps to test payment:"
echo "1. Send your passport photo or details to the bot"
echo "2. Bot will create a DocuSign contract"
echo "3. Click 'I've signed the contract' button"
echo "4. Bot will immediately create a Stripe invoice with payment link!"
echo ""
echo "To move directly to payment state instead, run:"
echo "npx convex run conversations:updateStatus '{\"conversationId\":\"$CONVERSATION_ID\",\"status\":\"payment\"}'"
