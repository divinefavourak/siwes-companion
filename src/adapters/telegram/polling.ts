import { createTelegramBot, registerBotCommands } from "@/src/adapters/telegram/bot";
import { PrismaTelegramRepository } from "@/src/adapters/telegram/prisma-telegram-repository";
import { PrismaEntryRepository, PrismaProgrammeRepository } from "@/src/adapters/web/prisma-repositories";
import { getDailyGenerator } from "@/src/lib/daily-generator";
import { env } from "@/src/lib/env";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

async function main() {
  if (!env.telegramBotToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set in .env");
    process.exit(1);
  }

  const telegram = new PrismaTelegramRepository();
  const entries = new PrismaEntryRepository();
  const programmes = new PrismaProgrammeRepository();
  const generator = getDailyGenerator();

  const bot = createTelegramBot({
    token: env.telegramBotToken,
    telegram,
    entries,
    programmes,
    generator
  });

  console.log("Registering Telegram slash commands menu...");
  await registerBotCommands(bot);

  console.log("Ensuring webhook is removed before polling...");
  await bot.api.deleteWebhook({ drop_pending_updates: false }).catch((err) => {
    console.warn("Could not delete webhook (continuing anyway):", err.message);
  });

  console.log("Starting SIWES Companion Telegram Bot in polling mode...");
  await bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} (${botInfo.first_name}) is online and listening!`);
    }
  });
}

main().catch(console.error);
