import * as dotenv from 'dotenv';

dotenv.config();

class ConfigService {
  botToken = process.env.BOT_TOKEN!;
  nodeEnv = process.env.NODE_ENV!;
  telegramApiUrl = process.env.TELEGRAM_API_URL!;
  database = {
    redis: {
      host: process.env.REDIS_HOST!,
      port: +process.env.REDIS_PORT!,
      database: process.env.REDIS_DATABASE!,
    },
    mongodb: {
      uri: process.env.MONGODB_URI!,
    },
  };
  ai = {
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.AI_API_KEY || '',
  };
  timezone = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh'; // UTC+7
}

export const configService = new ConfigService();
