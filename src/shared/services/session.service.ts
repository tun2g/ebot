import { BotContext } from 'src/bot/interface/context';
import { BotSession, defaultSession } from 'src/bot/interface/session';
import { redisService } from 'src/shared/services/redis.service';
import { getIdsInTelegramContext } from 'src/shared/utils';

export class SessionService {
  async getSession(ctx: BotContext) {
    const { userId, chatId } = getIdsInTelegramContext(ctx);
    const sessionKey = `session:${userId}:${chatId}`;
    const sessionData = await redisService.get(sessionKey);
    const session = sessionData ? JSON.parse(sessionData) : defaultSession;
    return session as BotSession;
  }

  async setSession(ctx: BotContext, newSession: BotSession) {
    const { userId, chatId } = getIdsInTelegramContext(ctx);
    const sessionKey = `session:${userId}:${chatId}`;
    await redisService.set(sessionKey, JSON.stringify(newSession));
  }

  async delSession(ctx: BotContext) {
    const { userId, chatId } = getIdsInTelegramContext(ctx);
    const sessionKey = `session:${userId}:${chatId}`;
    await redisService.del(sessionKey);
  }
}

export const sessionService = new SessionService();
