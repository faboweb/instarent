# InstaRent - AI Property Rental Agent

AI-powered rental property agent that works through Telegram.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
```

Fill in your API keys in `.env`:
- `TELEGRAM_BOT_TOKEN` - Get from [@BotFather](https://t.me/BotFather) on Telegram
- `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `CONVEX_URL` - Auto-generated in step 3

**For Facebook Scraping (optional):**
- `SMITHERY_BROWSERBASE_URL` - Get from [Smithery Dashboard](https://smithery.ai/server/@browserbasehq/mcp-browserbase) (configure your Browserbase credentials there)
- `FB_EMAIL` - Facebook login email
- `FB_PASSWORD` - Facebook login password

**For Calendly Scheduling (optional):**
- `SMITHERY_CALENDLY_URL` - Get from [Smithery Dashboard](https://smithery.ai/server/@zapier/mcp-calendly) (configure your Calendly access token there)

### 3. Set Up Convex
```bash
npx convex dev
```
This will:
- Prompt you to log in to Convex (create free account if needed)
- Create a new project
- Generate the `CONVEX_URL` - add this to your `.env` file
- Deploy the schema and functions

Keep this terminal running to sync changes.

### 4. Run the Bot
In a new terminal:
```bash
npm run dev
```

### 5. Test It
1. Open Telegram
2. Search for your bot (the name you gave it in BotFather)
3. Send `/start`
4. Tell it what kind of place you're looking for!

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start a new conversation |
| `/reset` | Clear current search and start over |

## Project Structure

```
instarent/
├── convex/              # Convex backend
│   ├── schema.ts        # Database schema
│   ├── users.ts         # User functions
│   ├── conversations.ts # Conversation functions
│   └── messages.ts      # Message functions
├── src/
│   ├── bot/
│   │   └── telegram.ts  # Telegram bot handler
│   ├── ai/
│   │   └── conversation.ts # OpenAI conversation logic
│   ├── scraping/
│   │   ├── browserbase.ts  # Browserbase MCP client wrapper
│   │   └── facebook.ts     # Facebook Marketplace & group scraper
│   └── index.ts         # Entry point
├── .env.example         # Environment template
└── package.json
```

## Milestones

- [x] **M1**: Foundation - Telegram bot + Convex + OpenAI conversation
- [x] **M2**: Property Search - Exa API integration
- [x] **M3**: Voice Responses - ElevenLabs TTS on Telegram
- [x] **M4**: Outbound Calls - Twilio phone calls to listers
- [x] **M5**: Appointments - Calendly integration
- [x] **M6**: Contracts - DocuSign integration
- [x] **M7**: Payments - Stripe invoicing
- [x] **M8**: Facebook Scraping - Browserbase-powered Marketplace & group scraping
