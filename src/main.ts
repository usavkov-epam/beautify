import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { createWorker } from "tesseract.js";

import { processImage } from "./utils";

dotenv.config();

const REGEX = /\bL\.?3\.?AA\.?10\b/gim

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const TARGET_USERNAME = process.env.TARGET_USERNAME;
const HINT_IMG = process.env.HINT_IMG!;
const PREVENT_FOREIGNERS = process.env.PREVENT_FOREIGNERS || '1';

const isProduction = process.env.NODE_ENV === "production";

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
  throw new Error("Missed TELEGRAM_BOT_TOKEN и ADMIN_CHAT_ID env vars");
}

const telegraf = new Telegraf(BOT_TOKEN);

telegraf.start((ctx) => {
  if (
    Number.parseInt(PREVENT_FOREIGNERS) > 0
    && ctx.from.username !== TARGET_USERNAME
    && ctx.chat.id !== Number.parseInt(ADMIN_CHAT_ID)
  ) {
    return ctx.reply("Не знаю как вы тут оказались, но этот бот не для вас 😏");
  };

  ctx.sendPhoto(HINT_IMG);
  ctx.reply("Привет, котик! Тебе нужно кое-что найти и сфотографировать, чтобы пройти этот квест 😏");

  telegraf.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `❗Начинаем ❗ (@${ctx.from?.username ?? "неизвестно"})`
  );
});

telegraf.on(message("text"), (ctx) => {
  telegraf.telegram.sendMessage(
    ADMIN_CHAT_ID,
    ` ❗Сообщение от (@${ctx.from?.username ?? "неизвестно"}):\n${ctx.message.text}`
  );
  ctx.reply(
    "Я могу обрабатывать только команды или картинки. Попробуй команду /start!"
  );
});

telegraf.on(message("photo"), async (ctx) => {
  const worker = await createWorker("eng");

  try {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    ctx.reply("Фото получено, начинается обработка...");

    const fileBuffer = Buffer.from(await fetch(fileUrl.toString()).then((res) => res.arrayBuffer()));
    const preparedImage = await processImage(fileBuffer);

    const { data } = await worker.recognize(preparedImage);

    const sendAlert = alertAdmin.bind(
      null,
      fileUrl,
      data.text,
      ctx.from.username ?? "неизвестно"
    );

    telegraf.telegram.sendPhoto(ADMIN_CHAT_ID, { source: preparedImage });

    if (REGEX.test(data.text)) {
      ctx.reply(
        "🎉 Поздравляю! Ты нашла что-то интересное! 🎉\nПодожди 20 секунд и посмотри что там 😘"
      );
      sendAlert(true);
    } else {
      ctx.reply("Хмм... кажется это что-то другое. Попробуй отойти чуть дальше и сфотографировать еще раз.\nУбедись, что хватает света :)");
      sendAlert(false);
    }
  } catch (error) {
    console.log("error", error);
    ctx.reply("Упс :(\nЧто-то пошло не так...");
  } finally {
    await worker.terminate();
  }
});

function alertAdmin(
  photo: any,
  text: string,
  from: string,
  isRecognized: boolean
) {
  telegraf.telegram.sendMessage(ADMIN_CHAT_ID!, photo);
  telegraf.telegram.sendMessage(
    ADMIN_CHAT_ID!,
    `${
      isRecognized ? "✔️" : "❌"
    } Обнаружен текст: "${text}"\nТаргет: ${REGEX}\nФото от пользователя: @${from}`
  );
}

telegraf.launch(
  isProduction
    ? {
        webhook: {
          domain: TELEGRAM_WEBHOOK_URL!,
          port: parseInt(process.env.PORT || "3000"),
        },
      }
    : {}
)
.then(() => {
  console.log("Bot started...");
});

process.once("SIGINT", () => telegraf.stop("SIGINT"));
process.once("SIGTERM", () => telegraf.stop("SIGTERM"));
