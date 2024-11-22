variable "prefix" {
  description = "High-level name of this configuration, used as a resource name prefix"
  type        = "string"
}

variable "telegram_bot_name" {
  description = "The name of the Telegram bot"
  default     = "tg-bot"
}

variable "heroku_location" {
  description = "The location of the Heroku"
  default     = "eu"
}