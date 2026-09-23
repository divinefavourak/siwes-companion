import { Bot } from "grammy";
import { BOT_COMMANDS } from "../src/adapters/telegram/bot";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ Error: TELEGRAM_BOT_TOKEN is not set in environment or .env file.");
  process.exit(1);
}

const webhookUrl = process.argv[2] || process.env.TELEGRAM_WEBHOOK_URL;

async function setup() {
  const bot = new Bot(token!);

  console.log("🤖 Connecting to Telegram Bot API...");
  const me = await bot.api.getMe();
  console.log(`✓ Connected as @${me.username} (${me.first_name})`);

  console.log("\n📋 Step 1: Registering slash commands menu...");
  await bot.api.setMyCommands(BOT_COMMANDS);
  console.log("✓ Slash commands menu registered successfully!");

  if (webhookUrl) {
    let cleanUrl = webhookUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const endpoint = cleanUrl.endsWith("/api/telegram/webhook")
      ? cleanUrl
      : `${cleanUrl.replace(/\/$/, "")}/api/telegram/webhook`;

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || token!;

    console.log(`\n🌐 Step 2: Registering webhook endpoint: ${endpoint}...`);
    await bot.api.setWebhook(endpoint, {
      secret_token: secret,
      drop_pending_updates: true
    });
    console.log("✓ Webhook registered with Telegram successfully!");
    console.log(`  Security: Protected with secret token.`);
  } else {
    console.log("\nℹ️ Step 2: Webhook setup skipped (no domain/URL provided).");
    console.log("To register a webhook, run:");
    console.log("  npx tsx scripts/setup-telegram.ts https://your-domain.com");
  }

  console.log("\n🎉 Telegram setup completed!");
}

setup().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
