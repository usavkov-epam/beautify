// import TelegramBot, { Message } from 'node-telegram-bot-api';
import { createWorker } from "tesseract.js";
import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { processImage } from "./utils";

const REGEX = /\bL\.3\.AA\.10\b/gim;

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

const isProduction = process.env.NODE_ENV === "production";

const HINT_IMG = "https://i.imgur.com/5EtaZ9S.jpeg";

if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
  throw new Error("Missed TELEGRAM_BOT_TOKEN и ADMIN_CHAT_ID env vars");
}

const telegraf = new Telegraf(BOT_TOKEN);

telegraf.start((ctx) => {
  ctx.sendPhoto(HINT_IMG);

  telegraf.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `❗Начинаем ❗ (@${ctx.from?.username ?? "неизвестно"})`
  );
});

telegraf.on(message("text"), (ctx) => {
  ctx.reply(
    "Я могу обрабатывать только команды или картинки. Попробуй команду /start!"
  );
});

telegraf.on(message("photo"), async (ctx) => {
  const worker = await createWorker("eng+rus");

  try {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    ctx.reply("Фото получено, начинается обработка...");

    const preparedImage = await processImage(fileUrl.toString());

    const { data } = await worker.recognize(preparedImage);

    const sendAlert = alertAdmin.bind(
      null,
      fileUrl,
      data.text,
      ctx.from.username ?? "неизвестно"
    );

    // telegraf.telegram.sendPhoto(ADMIN_CHAT_ID, preparedImage);

    if (REGEX.test(data.text)) {
      ctx.reply(
        "🎉 Поздравляю! Ты нашла что-то интересное! 🎉\nПодожди 10 секунд и посмотри что там 😘"
      );
      sendAlert(true);
    } else {
      ctx.reply("Хмм... кажется это что-то другое. Попробуй еще раз :)");
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
    } Обнаружен текст: "${text}"\nТаргет: ${REGEX}\nФото от пользователя: ${from}`
  );
}

telegraf
  .launch(
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
//   const chatId = msg.chat.id;

//   if (!msg.photo) {
//     bot.sendMessage(chatId, 'Хмм... что-то не то, мне нужно фото! Попробуй еще раз :)');
//     return;
//   }

//   const fileId = msg.photo[msg.photo.length - 1].file_id; // Best quality photo

//   const worker = await createWorker('eng+rus');

//   try {
//     const file = await bot.getFile(fileId);
//     const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

//     const preparedImage = await processImage(fileUrl);

//     console.log('preparedImage', preparedImage);

//     const { data } = await worker.recognize(preparedImage);

//     const sendAlert = alertAdmin.bind(null, fileUrl, data.text, msg.from?.username ?? 'неизвестно');

//     bot.sendPhoto(ADMIN_CHAT_ID, preparedImage);

//     if (REGEX.test(data.text)) {
//       bot.sendMessage(
//         chatId,
//         '🎉 Поздравляю! Ты нашла что-то интересное! 🎉\nПодожди 10 секунд и посмотри что там 😘',
//       );
//       sendAlert(true);
//     } else {
//       bot.sendMessage(chatId, 'Хмм... кажется это что-то другое. Попробуй еще раз :)');
//       sendAlert(false);
//     }
//     bot.sendPhoto(ADMIN_CHAT_ID, preparedImage)
//   } catch (error) {
//     console.log('error', error);
//     bot.sendMessage(chatId, 'Упс :(\nЧто-то пошло не так...');
//   } finally {
//     await worker.terminate();
//   }
// });

process.once("SIGINT", () => telegraf.stop("SIGINT"));
process.once("SIGTERM", () => telegraf.stop("SIGTERM"));
