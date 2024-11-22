terraform {
  required_providers {
    heroku = {
      source  = "heroku/heroku"
      version = "~> 5.0"
    }
  }
}

resource "heroku_app" "telegram_bot" {
  name   = "${var.prefix}_${var.telegram_bot_name}"
  region = var.heroku_location
}

resource "heroku_app_config" "bot_config" {
  app = heroku_app.telegram_bot.name

  config_vars = {
    TELEGRAM_BOT_TOKEN = "your-bot-token"   # Токен бота
    ADMIN_CHAT_ID      = "your-admin-id"   # ID админа для уведомлений
  }
}
