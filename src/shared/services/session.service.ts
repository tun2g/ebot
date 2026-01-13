import { BotContext } from '../../bot/interface/context';
import { BotSession, defaultSession } from '../../bot/interface/session';
import { getIdsInTelegramContext } from '../utils';
import { redisService } from './redis.service';

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
