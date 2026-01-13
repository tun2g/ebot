import { Context } from 'telegraf';
import { Update } from 'telegraf/types';

/**
 * Bot context interface extending Telegraf's Context
 * Note: Session is managed via Redis, not stored on context
 * Use sessionService.getSession(ctx) to retrieve session data
 */
export type BotContext<U extends Update = Update> = Context<U>;
